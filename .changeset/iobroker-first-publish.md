---
"iobroker.teslemetry": patch
---

Publish to npm. The adapter has been private while the ioBroker-specific packaging (io-package.json metadata, admin icon) caught up to the rest of the monorepo; that work is done, so this drops `private: true` and lets the changesets pipeline publish it like the other packages.
