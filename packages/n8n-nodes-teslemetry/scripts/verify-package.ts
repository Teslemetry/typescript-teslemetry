// The unit tests import the node classes from src/, which proves nothing about
// what a user can install: n8n reads only the files package.json's `n8n` block
// lists, and takes each class name from its file name. So pack the tarball that
// would be published, unpack it outside the workspace, and load it with n8n's
// own loader.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

const EXPECTED = { nodes: 3, credentials: 1 };

const packageRoot = join(__dirname, "..");
const n8nRoot = dirname(require.resolve("n8n/package.json"));

async function main() {
  const workDir = mkdtempSync(join(tmpdir(), "n8n-nodes-teslemetry-"));
  try {
    execFileSync("pnpm", ["pack", "--pack-destination", workDir], { cwd: packageRoot, stdio: "inherit" });
    const tarball = readdirSync(workDir).find((file) => file.endsWith(".tgz"));
    if (!tarball) throw new Error("pnpm pack produced no tarball");
    execFileSync("tar", ["-xzf", join(workDir, tarball), "-C", workDir]);
    const installed = join(workDir, "package");

    // n8n resolves a community package's `require("n8n-workflow")` to its own
    // copy by putting its module paths on NODE_PATH (load-nodes-and-credentials).
    const nodeModule = Module as unknown as {
      _nodeModulePaths(from: string): string[];
      _initPaths(): void;
    };
    process.env.NODE_PATH = nodeModule._nodeModulePaths(join(n8nRoot, "dist")).join(delimiter);
    nodeModule._initPaths();

    const { PackageDirectoryLoader } = createRequire(join(n8nRoot, "package.json"))("n8n-core");
    const loader = new PackageDirectoryLoader(installed);
    await loader.loadAll();

    const nodes = Object.keys(loader.nodeTypes);
    const credentials = Object.keys(loader.credentialTypes);
    if (nodes.length !== EXPECTED.nodes || credentials.length !== EXPECTED.credentials) {
      throw new Error(
        `expected ${EXPECTED.nodes} nodes and ${EXPECTED.credentials} credential, n8n loaded ` +
          `${nodes.length} nodes [${nodes.join(", ")}] and ${credentials.length} credentials [${credentials.join(", ")}]`,
      );
    }

    // The loader rewrites a `file:` icon to a URL without checking the file is in the tarball.
    for (const name of nodes) {
      const { iconUrl } = loader.nodeTypes[name].type.description;
      if (typeof iconUrl !== "string") continue;
      const iconPath = iconUrl.replace(`icons/${loader.packageName}/`, "");
      if (!existsSync(join(installed, iconPath))) {
        throw new Error(`${name}: icon ${iconPath} is not in the packed tarball`);
      }
    }

    console.log(`n8n loaded ${nodes.length} nodes [${nodes.join(", ")}] and ${credentials.length} credential [${credentials.join(", ")}] from ${tarball}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Packed package does not load in n8n: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
