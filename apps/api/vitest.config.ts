import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts/env.ts solo arrancan el servidor; auth.ts se reescribe y prueba en la tarea 13 (login admin).
      // generated/ es el cliente que escribe `prisma generate`.
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/lib/env.ts",
        "src/middleware/auth.ts",
        "src/generated/**",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
