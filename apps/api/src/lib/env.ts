import { parseEnv } from "./env-schema.js";

export type { Env } from "./env-schema.js";
export const env = parseEnv(process.env);
