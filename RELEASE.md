## Release process

1. When you are ready to declare a change (feature, bugfix, etc.), run: `pnpm changeset`
  * It will ask you which packages to bump.
  * It will ask for a summary (this goes into the CHANGELOG).
  * This creates a markdown file in `.changeset/`. Commit this file with your code and open a PR as usual.

2. Once the changeset-carrying PR merges to `main`, `.github/workflows/publish.yml` runs automatically:
  * The `validate` job runs the full CI suite (`.github/workflows/reusable-ci.yml`: lint, build, typecheck, test, codegen-verify) against the exact merge commit SHA.
  * The `release` job (`needs: validate`, so it only starts once `validate` has passed for that SHA) targets the `production` environment. GitHub environment protection requires a reviewer to approve the run before any step in this job executes - approval is gated behind the CI pass, not the other way around.
  * Once approved, the job checks out that same SHA, builds, and runs `changeset publish` (`pnpm run ci:publish`). If any `.changeset/*.md` files are pending, this opens/updates a "chore: version packages" PR instead of publishing (changesets' version-then-publish two-step). If package versions have already been bumped and there are no pending changesets, it publishes to npm with provenance (`NPM_CONFIG_PROVENANCE: true`) via OIDC trusted publishing.

3. Merging the "chore: version packages" PR pushes a new commit to `main`, which re-triggers the same workflow (validate -> approval -> publish) and performs the actual npm publish.

### Required reviewers on `production`

The `production` GitHub environment requires reviewer approval before the `release` job runs (configured via repo Settings -> Environments -> production -> Required reviewers, or the equivalent `PUT /repos/{owner}/{repo}/environments/production` API call). This repo currently has a single collaborator, so they are the sole configured reviewer. GitHub's `can_admins_bypass` setting on environments lets repo admins skip environment protection entirely, and there is no API-configurable way to disable that per environment - it depends on organization rulesets, which aren't available on this plan/repo. In practice this means the gate gives a deliberate approval step and an audit trail, but does not create a hard block against the sole admin choosing to bypass it. Add a second reviewer (a teammate or bot account) as soon as one exists, so approval isn't self-approval by construction.

### Recovery from an interrupted publish

`changeset publish` (`ci:publish`) is safe to re-run: it walks each workspace package, compares its `package.json` version against what's already on npm, and only publishes versions that aren't there yet. If the `release` job fails or is cancelled partway through a multi-package publish (e.g. network blip after package A publishes but before package B does), simply re-running the workflow (re-push, or `gh workflow run publish.yml` / re-approve the environment) picks up where it left off - already-published versions are skipped, not re-published or errored on.

If the failure happened before `changeset publish` ran (build/install/typecheck failure), nothing was published; fix the underlying issue and re-run - `validate` and reviewer approval both re-run from scratch since there is no partial-success state to preserve.

If the failure happened *during* `changesets/action`'s version-PR step (rare - it only opens/updates a PR, no publish), the version-PR branch changesets maintains is idempotent to regenerate; delete the stray branch/PR if it's in a bad state and let the next `main` push recreate it.

There is no manual-tag release path anymore (the old `git tag`-based flow this doc previously described does not match `publish.yml`); do not hand-push tags to trigger a release.
