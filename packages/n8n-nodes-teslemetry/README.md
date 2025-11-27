# n8n Teslemetry Integration

n8n nodes for interacting with Tesla vehicles and energy sites via [Teslemetry](https://teslemetry.com).

## Installation

To use these nodes in your n8n instance, you would typically place them in the `.n8n/nodes` directory or install them as a local package.

### Local Development Installation

1.  Clone this repository.
2.  Build the n8n nodes package:
    ```bash
    cd packages/n8n-nodes-teslemetry
    npm install
    npm run build
    ```
3.  Link the package to your n8n instance. Depending on your n8n setup, this might involve:
    ```bash
    cd /path/to/your/n8n/installation
    npm install /path/to/this/repository/packages/n8n-nodes-teslemetry
    # or if using pnpm workspace
    pnpm link /path/to/this/repository/packages/n8n-nodes-teslemetry
    ```
    Then restart your n8n instance.

## Nodes

### Teslemetry Vehicle
This node allows you to perform operations on your Tesla vehicles through the Teslemetry API.

#### Operations:
- **Get Vehicle Data**: Retrieves comprehensive data for a specified VIN.

## Credentials

### Teslemetry API
This credential stores your Teslemetry Access Token for authenticating API requests.
