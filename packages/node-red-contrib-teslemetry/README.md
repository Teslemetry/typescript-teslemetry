# Node-RED Teslemetry Integration

Node-RED nodes for interacting with Tesla vehicles and energy sites via [Teslemetry](https://teslemetry.com).

## Installation

Local installation (for development):

```bash
cd ~/.node-red
npm install /path/to/packages/node-red-contrib-teslemetry
```

## Nodes

### teslemetry-config
Configuration node to store your Teslemetry Access Token.

### teslemetry-vehicle
Retrieve vehicle data or send commands (WIP).
- **Input**: `msg.vin` (optional if configured).
- **Output**: `msg.payload` contains the vehicle data or command response.
