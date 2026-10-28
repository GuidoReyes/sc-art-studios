// GET /api/admin/dashboard (tarea 33): conteos por estado y últimas ventas. Sin datos personales.
import type { AdminDashboardDto, CustomRequestStatus, MaskStatus } from "@sc-art-studio/shared";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { toMoney } from "../../lib/pricing.js";

export const LATEST_ORDERS = 5;

const MASK_STATUSES: readonly MaskStatus[] = ["AVAILABLE", "RESERVED", "SOLD", "COMMISSION_EXAMPLE", "DRAFT"];
const REQUEST_STATUSES: readonly CustomRequestStatus[] = [
  "NEW",
  "QUOTED",
  "DEPOSIT_PAID",
  "IN_PROGRESS",
  "BALANCE_PAID",
  "SHIPPED",
  "CLOSED",
  "REJECTED",
];

export interface DashboardRepository {
  summary(): Promise<AdminDashboardDto>;
}

/** Todos los estados con su conteo: los que no tienen filas salen en 0 en vez de faltar. */
export function countByStatus<S extends string>(
  statuses: readonly S[],
  groups: readonly { status: S; _count: { _all: number } }[],
): Record<S, number> {
  const counts = new Map(groups.map((group) => [group.status, group._count._all]));
  return Object.fromEntries(statuses.map((status) => [status, counts.get(status) ?? 0])) as Record<S, number>;
}

export function createPrismaDashboardRepository(prisma: PrismaClient): DashboardRepository {
  return {
    async summary() {
      const [masks, requests, totals, latest] = await Promise.all([
        prisma.mask.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.customRequest.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.order.aggregate({ _count: { _all: true }, _sum: { totalUsd: true } }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: LATEST_ORDERS,
          select: {
            id: true,
            totalUsd: true,
            shippingCountry: true,
            status: true,
            createdAt: true,
            mask: { select: { nameEs: true, nameEn: true } },
          },
        }),
      ]);
      return {
        masksByStatus: countByStatus(MASK_STATUSES, masks),
        customRequestsByStatus: countByStatus(REQUEST_STATUSES, requests),
        orders: {
          count: totals._count._all,
          totalUsd: totals._sum.totalUsd ? toMoney(totals._sum.totalUsd) : 0,
          latest: latest.map((order) => ({
            id: order.id,
            maskName: order.mask ? { es: order.mask.nameEs, en: order.mask.nameEn } : null,
            totalUsd: toMoney(order.totalUsd),
            shippingCountry: order.shippingCountry,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
          })),
        },
      };
    },
  };
}
