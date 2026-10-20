// Bucket PRIVADO de R2 para las fotos de referencia de los encargos: son datos de clientes,
// nunca se publican ni se sirven desde un dominio público (las fotos del catálogo van en otro bucket).
import { DeleteObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { R2_MAX_ATTEMPTS, R2_REQUEST_TIMEOUT_MS } from "../config.js";

export interface ReferenceStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Lo único que se usa del cliente de S3; permite probar sin red. */
type CommandSender = Pick<S3Client, "send">;

export function r2ClientConfig({ accountId, accessKeyId, secretAccessKey }: R2Config): S3ClientConfig {
  return {
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Capa 6: timeout y reintentos limitados para no colgar la respuesta del formulario.
    maxAttempts: R2_MAX_ATTEMPTS,
    requestHandler: { requestTimeout: R2_REQUEST_TIMEOUT_MS },
  };
}

export function createR2Storage(
  config: R2Config,
  client: CommandSender = new S3Client(r2ClientConfig(config)),
): ReferenceStorage {
  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
          CacheControl: "private, no-store",
        }),
      );
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
