1. When you are ready to declare a change (feature, bugfix, etc.), run: `pnpm changeset`
  * It will ask you which packages to bump.
  * It will ask for a summary (this goes into the CHANGELOG).
  * This creates a markdown file in .changeset/. You commit this file with your code.

2. When you are ready to release: `pnpm version`
  * This consumes the changeset files.
  * It updates package.json versions for all affected packages (and their dependencies).
  * It updates CHANGELOG.md files.

3. Release (Publish):
  * Commit the version changes: `git add . && git commit -m "chore: release"`
  * Tag the release: `git tag v1.0.0`
  * Push: `git push --tags origin main`
  * The GitHub Action will trigger, build everything, and run pnpm publish -r, publishing any package version that isn't already on npm.
