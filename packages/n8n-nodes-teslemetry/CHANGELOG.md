# @teslemetry/n8n-nodes-teslemetry

## 0.2.0

### Minor Changes

- e0978a1: Uplift n8n integration to feature-complete status, ready for publishing

  **New Features:**
  - Added "errors" event type to Teslemetry Trigger node for monitoring vehicle error events

  **Improvements:**
  - Enhanced package.json with better metadata, author info, and keywords (including n8n-community-node-package)
  - Added node engine requirement (>=18.0.0)
  - Comprehensive README update with:
    - Installation instructions from npm
    - Usage examples and workflow scenarios
    - Better documentation of all node types and operations
    - Links to resources and support

  **Status:**
  - Feature parity with Node-RED integration achieved
  - All vehicle operations (22/22) implemented
  - All energy operations (7/7) implemented
  - All event types (9/9) including the newly added "errors" type
  - Ready for publishing to npm registry
