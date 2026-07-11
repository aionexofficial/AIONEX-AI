import { realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Next/Turbopack can create duplicate module identities on case-insensitive file
// systems when the working directory's casing differs from its canonical path.
const projectRoot = realpathSync.native(process.cwd());

// A cache produced through another casing can retain both module identities.
rmSync(join(projectRoot, ".next"), { recursive: true, force: true });

const require = createRequire(import.meta.url);
const nextBin = realpathSync.native(require.resolve("next/dist/bin/next"));

const result = spawnSync(
  process.execPath,
  [nextBin, "build", ...process.argv.slice(2)],
  { cwd: projectRoot, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
