// CRUD del admin con auditoría (capa 8): cada cambio y su AuditLog van en la misma transacción,
// así que no puede quedar un cambio sin registrar.
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/httpErrors.js";

/** Quién hace el cambio: sale de la sesión, nunca del cuerpo del pedido. */
export interface Actor {
  userId: string;
  ip?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface AdminStore<Dto, Create, Update, Query> {
  list(query: Query): Promise<Page<Dto>>;
  get(id: string): Promise<Dto | null>;
  create(input: Create, actor: Actor): Promise<Dto>;
  /** null si no existe. */
  update(id: string, input: Update, actor: Actor): Promise<Dto | null>;
  /** false si no existe; HttpError 409 si las reglas de negocio no lo permiten. */
  remove(id: string, actor: Actor): Promise<boolean>;
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Lo que cada entidad sabe hacer con Prisma; la transacción y la auditoría las pone el store. */
export interface EntityOps<Dto extends { id: string }, Create, Update, Query> {
  entity: "Mask" | "Story" | "Video";
  /** Prefijo de la acción en AuditLog: "mask" → "mask.create", "mask.update", "mask.delete". */
  action: string;
  duplicateMessage: string;
  list(db: PrismaClient, query: Query): Promise<Page<Dto>>;
  find(db: Db, id: string): Promise<Dto | null>;
  insert(tx: Prisma.TransactionClient, input: Create): Promise<Dto>;
  patch(tx: Prisma.TransactionClient, id: string, input: Update): Promise<Dto>;
  /** Lanza HttpError si no se puede borrar. */
  assertDeletable?(current: Dto): void;
  /** Cuántas filas borró; 0 si otra petición la cambió entre la lectura y el borrado. */
  delete(tx: Prisma.TransactionClient, id: string): Promise<number>;
}

// Prisma: P2002 = valor único repetido, P2003 = llave foránea inexistente, P2025 = fila inexistente.
function prismaCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

type PlainValue<V> = V extends Date ? string : V extends Prisma.Decimal ? number : V;
/** Fila de Prisma lista para JSON: Decimal → number y Date → ISO 8601. */
export type PlainRow<T> = { [K in keyof T]: PlainValue<T[K]> };

function isDecimal(value: unknown): value is Prisma.Decimal {
  return typeof value === "object" && value !== null && typeof (value as Prisma.Decimal).toNumber === "function";
}

export function toPlain<T extends object>(row: T): PlainRow<T> {
  const entries = Object.entries(row).map(([key, value]) => {
    if (value instanceof Date) return [key, value.toISOString()];
    if (isDecimal(value)) return [key, value.toNumber()];
    return [key, value];
  });
  return Object.fromEntries(entries) as PlainRow<T>;
}

const IGNORED_IN_DIFF = new Set(["updatedAt"]);

/** Solo los campos que cambiaron, con su valor antes y después. */
export function changedFields(before: object, after: object): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const old = before as Record<string, unknown>;
  const keys = Object.keys(after).filter(
    (key) => !IGNORED_IN_DIFF.has(key) && JSON.stringify(old[key]) !== JSON.stringify((after as Record<string, unknown>)[key]),
  );
  const pick = (source: object) => Object.fromEntries(keys.map((key) => [key, (source as Record<string, unknown>)[key]]));
  return { before: pick(before), after: pick(after) };
}

export function createAdminStore<Dto extends { id: string }, Create, Update, Query>(
  prisma: PrismaClient,
  ops: EntityOps<Dto, Create, Update, Query>,
): AdminStore<Dto, Create, Update, Query> {
  const audit = (tx: Prisma.TransactionClient, actor: Actor, verb: string, entityId: string, diff: object) =>
    tx.auditLog.create({
      data: {
        userId: actor.userId,
        ip: actor.ip,
        action: `${ops.action}.${verb}`,
        entity: ops.entity,
        entityId,
        diff: diff as Prisma.InputJsonObject,
      },
    });

  const translate = (error: unknown): never => {
    const code = prismaCode(error);
    if (code === "P2002") throw new HttpError(409, ops.duplicateMessage, "DUPLICATE");
    if (code === "P2003") throw new HttpError(422, "La máscara, historia o empaque indicado no existe", "INVALID_REFERENCE");
    throw error;
  };

  return {
    list: (query) => ops.list(prisma, query),
    get: (id) => ops.find(prisma, id),

    create: (input, actor) =>
      prisma
        .$transaction(async (tx) => {
          const created = await ops.insert(tx, input);
          await audit(tx, actor, "create", created.id, { after: created });
          return created;
        })
        .catch(translate),

    update: (id, input, actor) =>
      prisma
        .$transaction(async (tx) => {
          const before = await ops.find(tx, id);
          if (!before) return null;
          const after = await ops.patch(tx, id, input);
          const diff = changedFields(before, after);
          if (Object.keys(diff.after).length > 0) await audit(tx, actor, "update", id, diff);
          return after;
        })
        .catch((error: unknown) => (prismaCode(error) === "P2025" ? null : translate(error))),

    remove: (id, actor) =>
      prisma.$transaction(async (tx) => {
        const before = await ops.find(tx, id);
        if (!before) return false;
        ops.assertDeletable?.(before);
        if ((await ops.delete(tx, id)) === 0) {
          throw new HttpError(409, "El registro cambió mientras se borraba. Recarga e inténtalo de nuevo.", "CHANGED");
        }
        await audit(tx, actor, "delete", id, { before });
        return true;
      }),
  };
}
