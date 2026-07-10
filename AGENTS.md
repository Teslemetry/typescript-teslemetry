# Teslemetry TypeScript Monorepo

## Overview

This is the **Teslemetry TypeScript monorepo** containing the official TypeScript/JavaScript SDK and multiple platform integrations for the Teslemetry API. The monorepo uses **pnpm workspaces** for package management and **changesets** for versioning and publishing.

**Primary Purpose**: Provide a comprehensive ecosystem for Tesla vehicle and energy site control across multiple automation and smart home platforms.

## Monorepo Structure

```
typescript-teslemetry/
├── packages/
│   ├── api/                           # Core TypeScript/JavaScript SDK (v0.6.7)
│   ├── node-red-contrib-teslemetry/   # Node-RED integration (v0.1.2)
│   ├── n8n-nodes-teslemetry/          # n8n workflow integration (v0.1.0)
│   └── homey/                         # Homey smart home app (v0.0.3)
├── pnpm-workspace.yaml                # Workspace configuration
├── tsconfig.json                      # Root TypeScript config
├── package.json                       # Monorepo root package
├── RELEASE.md                         # Release process documentation
└── .github/workflows/publish.yml      # Automated CI/CD
```

## Packages

### 1. `@teslemetry/api` - Core SDK

**Location**: `packages/api/`
**Version**: 0.6.7
**Status**: Stable, actively maintained

**Purpose**: Official TypeScript/JavaScript client library for the Teslemetry API.

**Key Features**:
- 🚗 Vehicle control (climate, charging, security, navigation)
- ⚡ Energy site management (Powerwall, Solar)
- 📡 Real-time streaming via Server-Sent Events (SSE)
- 🌍 Automatic region detection (NA/EU)
- 📦 Dual ESM/CommonJS support
- 🔧 Full TypeScript type definitions

**Main Source Files**:
- `src/Teslemetry.ts` - Main entry point
- `src/TeslemetryApi.ts` - REST API wrapper
- `src/TeslemetryVehicleApi.ts` - Vehicle operations
- `src/TeslemetryEnergyApi.ts` - Energy site operations
- `src/TeslemetryStream.ts` - SSE streaming base
- `src/TeslemetryVehicleStream.ts` - Vehicle-specific streaming
- `src/TeslemetryUserApi.ts` - User account operations
- `src/TeslemetryChargingApi.ts` - Charging-specific operations
- `src/client/` - Auto-generated OpenAPI client

**Build Output**:
- `dist/index.cjs` - CommonJS bundle
- `dist/index.mjs` - ESM bundle
- `dist/*.d.ts` - TypeScript declarations

**Code Generation**:
- Uses `@hey-api/openapi-ts` to generate client from OpenAPI spec
- Run: `pnpm --filter @teslemetry/api generate`

### 2. `node-red-contrib-teslemetry` - Node-RED Integration

**Location**: `packages/node-red-contrib-teslemetry/`
**Version**: 0.1.2
**Status**: Active

**Purpose**: Provides Node-RED nodes for Tesla vehicle and energy site automation.

**Nodes**:
1. **teslemetry-config** - Configuration node (stores API credentials)
2. **teslemetry-vehicle-command** - Vehicle commands and data retrieval
3. **teslemetry-energy-command** - Energy site control
4. **teslemetry-event** - Real-time event listener (SSE)
5. **teslemetry-signal** - Monitor specific signal changes

**Structure**:
- Each node has a TypeScript file (`.ts`) and HTML UI file (`.html`)
- `src/shared.ts` - Shared utilities
- `src/validation.ts` - Input validation

**Build Process**:
```bash
pnpm --filter node-red-contrib-teslemetry build
# Runs: tsdown && cp src/nodes/*.html dist/nodes/
```

### 3. `n8n-nodes-teslemetry` - n8n Integration

**Location**: `packages/n8n-nodes-teslemetry/`
**Version**: 0.1.0
**Status**: Active (early stage but functional)

**Purpose**: Provides n8n workflow nodes for Tesla automation.

**Components**:
- `src/credentials/TeslemetryApi.credentials.ts` - API credential definition
- `src/nodes/TeslemetryVehicle.node.ts` - Vehicle operations
- `src/nodes/TeslemetryEnergy.node.ts` - Energy operations
- `src/nodes/TeslemetryTrigger.node.ts` - Event triggers

**Node Capabilities**:
- **Vehicle Node**: Data retrieval, wake, lights, horn, lock/unlock, climate, charging, sentry, homelink, navigation
- **Energy Node**: Status, backup reserve, operation modes, storm mode, grid control, off-grid reserve
- **Trigger Node**: Workflow triggers for events, data updates, state changes, alerts, connectivity, signal changes

**Build Output**: `dist/index.cjs` (single entry point)

### 4. `homey` - Homey Smart Home App

**Location**: `packages/homey/`
**Version**: 0.0.3
**App ID**: com.teslemetry
**Status**: Development (has separate dedicated repo)

**Purpose**: Smart home integration for the Homey platform.

**Supported Devices**:
- Tesla Vehicles (via Fleet Telemetry)
- Energy Sites (Powerwall, Solar)
- Wall Connectors

**Features**:
- Real-time status monitoring
- Climate control
- Charging management
- Security features
- Power flow monitoring
- Operation mode control

**Structure**:
- `app.ts` - App entry point
- `drivers/` - Device drivers (vehicle, energy-site, wall-connector)
- `lib/` - Shared logic (TeslemetryDevice, TeslemetryOAuth2Client)
- `.homeycompose/` - App composition files
- `assets/` - Images and icons
- `locales/` - Translations

**Build Process**:
```bash
pnpm --filter homey build
# Runs: node compose.cjs && tsdown
```

## Technology Stack

### Package Management
- **pnpm** 10.18.1 - Fast, disk-space efficient package manager
- **Workspaces** - Monorepo package linking

### Build Tools
- **tsdown** (>=0.22) - Primary build tool (bundles via rolldown); its `rolldown-plugin-dts` dependency must support the installed `typescript` major version for declaration emit to work, since that's the actual compiler-API consumer, not tsdown itself
- **TypeScript** 7.x - Type checking and compilation. TS7's config surface dropped `baseUrl` and the `node`/`node10` `moduleResolution` value, and defaults `types` to `[]` instead of auto-including all `@types/*` packages - any tsconfig relying on the old implicit behavior needs `"types": ["node"]` added explicitly
- **ESLint** - Code linting
- **tsx** - TypeScript execution (for scripts)

### Version Management
- **Changesets** (`@changesets/cli`) - Version bumping and changelog generation
- **Git-based releases** - Automated via GitHub Actions

### Code Generation
- **@hey-api/openapi-ts** - Generate TypeScript client from OpenAPI specs

### Platform-Specific
- **Node-RED** 4.1.1 - For node-red integration
- **n8n** 1.122.5 - For n8n integration
- **Homey SDK** 3.10.0 - For Homey app development

## Development Workflow

### Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd typescript-teslemetry

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Working on a Specific Package

```bash
# Build a specific package
pnpm --filter @teslemetry/api build
pnpm --filter node-red-contrib-teslemetry build
pnpm --filter n8n-nodes-teslemetry build
pnpm --filter homey build

# Run tests (if available)
pnpm --filter @teslemetry/api test

# Generate OpenAPI client
pnpm --filter @teslemetry/api generate
```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** to the relevant package(s)

3. **Build and test**
   ```bash
   pnpm build
   ```

4. **Create a changeset** (for version bumping)
   ```bash
   pnpm changeset
   # Follow the prompts to describe your changes
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

## Release Process

The monorepo uses **Changesets** for version management and automated publishing.

### Creating a Release

1. **Add a changeset** when making changes:
   ```bash
   pnpm changeset
   ```
   - Select which packages changed
   - Choose semver bump type (major/minor/patch)
   - Write a description

2. **Commit the changeset**:
   ```bash
   git add .changeset/
   git commit -m "Add changeset for X"
   ```

3. **Automated Publishing** (via GitHub Actions):
   - When PR is merged to `main`
   - Changesets creates a "Version Packages" PR
   - Merging that PR triggers:
     - Version bumping
     - Changelog generation
     - npm publishing (with --access public)
     - Homey app validation
     - Discord notifications

See `RELEASE.md` for detailed release documentation.

## Key Architecture Decisions

### 1. Shared Dependency Model
All integration packages (`node-red`, `n8n`, `homey`) depend on `@teslemetry/api` via workspace references:
```json
"dependencies": {
  "@teslemetry/api": "workspace:*"
}
```

This ensures:
- Code reuse and consistency
- Single source of truth for API logic
- Easier maintenance

### 2. Dual Module Format (ESM + CommonJS)
The core API package outputs both formats:
- **ESM** (`dist/index.mjs`) - Modern bundlers and Node.js
- **CommonJS** (`dist/index.cjs`) - Legacy compatibility

### 3. TypeScript Configuration
- **Root config** (`tsconfig.json`): Base configuration with strict mode
- **Package configs**: Extend root with package-specific settings
- **Target**: ES2022 with NodeNext module resolution

### 4. Build Strategy
- **tsdown**: Lightweight TypeScript compiler using esbuild
  - Fast compilation
  - Automatic type declaration generation
  - Minimal configuration

### 5. Code Generation
- OpenAPI specs are used to auto-generate client code
- Keeps SDK in sync with API specifications
- Located in `packages/api/src/client/`

## Common Tasks

### Add a New Package

1. Create directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Add `tsconfig.json` extending root config
4. Update `pnpm-workspace.yaml` if needed (auto-detects `packages/*`)
5. Run `pnpm install` to link workspace

### Update Dependencies

```bash
# Update all dependencies
pnpm update -r

# Update specific package
pnpm --filter @teslemetry/api update

# Update dependency across workspace
pnpm update -r <package-name>
```

### Lint Code

```bash
# Run linter (if configured)
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Test n8n Nodes Locally

```bash
cd packages/n8n-nodes-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.n8n/nodes
pnpm link --global n8n-nodes-teslemetry
```

### Test Node-RED Nodes Locally

```bash
cd packages/node-red-contrib-teslemetry
pnpm build
pnpm link --global

# In another terminal
cd ~/.node-red
pnpm link --global node-red-contrib-teslemetry
node-red
```

### Validate Homey App

```bash
cd packages/homey
pnpm build
homey app validate
```

## Important Files and Directories

### Root Level
- `pnpm-workspace.yaml` - Workspace package definitions
- `tsconfig.json` - Base TypeScript configuration
- `package.json` - Monorepo scripts and metadata
- `RELEASE.md` - Release process documentation
- `.changeset/` - Changeset entries for version management

### API Package
- `openapi-ts.config.ts` - OpenAPI code generation config
- `src/client/` - Auto-generated client code (don't edit manually)
- `src/Teslemetry.ts` - Main SDK entry point

### Node-RED Package
- `src/nodes/*.html` - Node UI definitions (copied to dist/)
- `src/shared.ts` - Shared utilities for all nodes

### n8n Package
- `src/credentials/` - Credential type definitions
- `src/nodes/` - Node implementations
- `src/shared.ts` - Shared state management

### Homey Package
- `.homeycompose/` - Source composition files
- `app.json` - Generated app manifest (don't edit manually)
- `compose.cjs` - Build script to generate app.json

### CI/CD
- `.github/workflows/publish.yml` - Automated build, test, and publish

## Integration-Specific Notes

### n8n Integration (Active Development Area)

**Current State**: Early but functional
- Has 3 node types (Vehicle, Energy, Trigger)
- Credential management implemented
- Basic operations available

**Development Focus**:
- This is the package being actively developed
- Located at `packages/n8n-nodes-teslemetry/`
- Uses n8n's node framework
- Builds to single `dist/index.cjs` entry point

**Testing**:
```bash
cd packages/n8n-nodes-teslemetry
pnpm build
pnpm link --global  # Makes available to local n8n instance
```

**Key Files**:
- `src/nodes/TeslemetryVehicle.node.ts` - Main vehicle operations node
- `src/nodes/TeslemetryEnergy.node.ts` - Energy site operations
- `src/nodes/TeslemetryTrigger.node.ts` - Event-based triggers
- `src/credentials/TeslemetryApi.credentials.ts` - Authentication

**n8n Conventions**:
- Node class names must end with `.node.ts`
- Credential class names must end with `.credentials.ts`
- Icons referenced from `src/` directory
- Version field must match package.json

### Node-RED Integration
- Most mature integration
- 5 node types with full HTML UI
- HTML files must be manually copied during build
- Node-RED specific conventions in `.html` files

### Homey Integration
- Has separate dedicated repository
- Copy in monorepo for convenience but doesn't work well in monorepo structure
- Uses Homey-specific build and publish process
- OAuth2 integration for authentication

## TypeScript Configuration

### Root `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Package-Specific Configs
Each package extends the root config and adds:
- Custom `outDir` paths
- Package-specific `include` patterns
- Platform-specific type definitions

## Dependencies Between Packages

```
@teslemetry/api (core SDK)
    ↑
    ├── node-red-contrib-teslemetry (depends on API)
    ├── n8n-nodes-teslemetry (depends on API)
    └── homey (depends on API)
```

All integrations use `"@teslemetry/api": "workspace:*"` to ensure they use the local version during development.

## Helpful Commands Reference

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter <package-name> build

# Create changeset
pnpm changeset

# Version packages (apply changesets)
pnpm changeset version

# Publish packages
pnpm changeset publish

# Run script in specific package
pnpm --filter <package-name> <script-name>

# Add dependency to specific package
pnpm --filter <package-name> add <dependency>

# Remove dependency from specific package
pnpm --filter <package-name> remove <dependency>

# Update all dependencies
pnpm update -r

# Clean node_modules
pnpm clean  # (if script exists)
rm -rf node_modules packages/*/node_modules

# Fresh install
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

## Resources

- **Teslemetry API Docs**: https://teslemetry.com/docs
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Changesets**: https://github.com/changesets/changesets
- **Node-RED**: https://nodered.org/docs/creating-nodes/
- **n8n**: https://docs.n8n.io/integrations/creating-nodes/
- **Homey SDK**: https://apps.developer.homey.app/

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add a changeset (`pnpm changeset`)
5. Submit a pull request

See individual package READMEs for package-specific contribution guidelines.

---

**Last Updated**: 2026-01-08
**Monorepo Version**: pnpm workspaces
**Primary Maintainer**: Teslemetry

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
