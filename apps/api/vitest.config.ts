import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts/env.ts solo arrancan el servidor y seed/index.ts el seed.
      // generated/ es el cliente que escribe `prisma generate`.
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/seed/index.ts",
        "src/lib/env.ts",
        "src/generated/**",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
