// typescript-eslint (pulled in by @n8n/node-cli for the n8n package's
// `validate` lint) needs the TypeScript compiler API, which typescript@7 no
// longer ships. Give it the 6.x compatibility build instead of the workspace's
// typescript@7 peer; n8n's own scanner pins the same build.
const TS6 = "npm:@typescript/typescript6@6.0.2";

function readPackage(pkg) {
  if (pkg.name === "typescript-eslint" || pkg.name?.startsWith("@typescript-eslint/")) {
    if (pkg.peerDependencies?.typescript) {
      delete pkg.peerDependencies.typescript;
      pkg.dependencies = { ...pkg.dependencies, typescript: TS6 };
    }
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
