import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./", import.meta.url)) },
      // Next's server bundler resolves `server-only` through the
      // "react-server" export condition, which maps it to a no-op. Outside
      // Next it resolves to the default entry, which throws by design — so
      // any module guarded by `import "server-only"` is untestable without
      // this. resolve.conditions doesn't help: the package is CJS and gets
      // externalized, so Node resolves it and ignores Vite's conditions.
      // The replacement is a filesystem path, not "server-only/empty.js",
      // because the package's exports map declares no such subpath.
      {
        find: /^server-only$/,
        replacement: fileURLToPath(
          new URL("./node_modules/server-only/empty.js", import.meta.url),
        ),
      },
    ],
  },
});
