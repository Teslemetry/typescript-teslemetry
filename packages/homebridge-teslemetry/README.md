# homebridge-teslemetry

[![npm version](https://badge.fury.io/js/homebridge-teslemetry.svg)](https://badge.fury.io/js/homebridge-teslemetry)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Teslemetry platform plugin for Homebridge with real-time streaming for Tesla vehicles and energy site monitoring.

## Features

🚗 **Tesla Vehicle Control**
- Real-time status updates via Server-Sent Events (SSE)
- Lock/unlock doors
- Climate control (heat/cool)
- Charge management
- Sentry mode control
- Window control
- And more...

⚡ **Energy Site Support**
- Powerwall monitoring
- Solar production tracking
- Backup reserve, storm watch, and grid control

🔄 **Live Updates**
- Vehicles: instant updates via real-time streaming (SSE), no polling
- Energy sites: periodic polling for status and power flow
- Built on Teslemetry's Fleet Telemetry API

## Requirements

- **Active Teslemetry Subscription**: Create an account and get an access token at [teslemetry.com](https://teslemetry.com)
- **Node.js**: Version 18 or higher
- **Homebridge**: Version 1.8.0 or higher
- **Fleet Telemetry Support**: Your vehicle must support Fleet Telemetry (most recent Tesla vehicles)

## Installation

### Via Homebridge Config UI X (Recommended)

1. Search for "Teslemetry" in the Homebridge Config UI X plugin search
2. Click **Install**
3. Configure the plugin with your Teslemetry access token

### Via Command Line

```bash
npm install -g homebridge-teslemetry
```

Or if using pnpm:

```bash
pnpm add -g homebridge-teslemetry
```

## Configuration

### Via Homebridge Config UI X

The easiest way to configure this plugin is through the Homebridge Config UI X interface. All options are available through the visual interface.

### Manual Configuration

Add the following to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "Teslemetry",
      "name": "Teslemetry",
      "accessToken": "your_teslemetry_access_token_here",
      "prefixName": true,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "ignoreVehicles": [],
      "ignoreEnergySites": []
    }
  ]
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `platform` | string | **Yes** | - | Must be `"Teslemetry"` |
| `accessToken` | string | **Yes** | - | Your Teslemetry API access token from [teslemetry.com](https://teslemetry.com) |
| `name` | string | No | `"Teslemetry"` | Display name for the platform |
| `prefixName` | boolean | No | `true` | Whether to prefix accessory names with the vehicle name |
| `latitude` | number | No | - | Latitude for Homelink activation (required if using Homelink) |
| `longitude` | number | No | - | Longitude for Homelink activation (required if using Homelink) |
| `ignoreVehicles` | string[] | No | `[]` | Array of vehicle VINs to ignore |
| `ignoreEnergySites` | number[] | No | `[]` | Array of energy site IDs to ignore |

## Getting a Teslemetry Access Token

1. Go to [teslemetry.com](https://teslemetry.com)
2. Create an account or log in
3. Navigate to your account settings
4. Generate a new API access token
5. Copy the token and paste it into your Homebridge configuration

## Supported Vehicles

This plugin supports all Tesla vehicles that have Fleet Telemetry capability:

- Model 3 (2017+)
- Model Y (2020+)
- Model S (2021+ refresh)
- Model X (2021+ refresh)
- Cybertruck (2023+)

Older Model S and Model X vehicles may have limited support.

## HomeKit Accessories

Each Tesla vehicle will appear as multiple accessories in HomeKit:

### Current Implementation (Phase 1)
- **Vehicle Discovery** - Automatic discovery and registration of vehicles
- **Real-time Streaming** - Connection to Teslemetry's streaming API

### Coming Soon (Phase 2)
- **Battery Service** - Battery level and charging status
- **Lock Service** - Lock/unlock doors
- **Climate Service** - Temperature control and HVAC
- **Charge Port** - Open/close charge port
- **Charge Switch** - Start/stop charging
- **Charge Limit** - Set charge limit percentage
- **Defrost Service** - Activate max defrost
- **Door Sensors** - Individual door status
- **Window Control** - Vent/close windows
- **Sentry Mode** - Enable/disable sentry mode
- **Homelink** - Trigger Homelink (requires location config)

## Troubleshooting

### Plugin Not Discovering Vehicles

1. Verify your access token is correct
2. Check that you have an active Teslemetry subscription
3. Ensure your vehicle supports Fleet Telemetry
4. Check Homebridge logs for error messages

### Streaming Connection Issues

1. Verify network connectivity
2. Check that Teslemetry streaming is enabled for your account
3. Restart Homebridge
4. Check firewall settings (SSE requires persistent connections)

### Accessories Not Responding

1. Check if vehicle is asleep (may take a moment to wake)
2. Verify streaming connection status in logs
3. Try restarting the Homebridge service

## Development

This package is part of the [Teslemetry TypeScript monorepo](https://github.com/Teslemetry/typescript-teslemetry).

### Local Development

```bash
# Clone the repository
git clone https://github.com/Teslemetry/typescript-teslemetry.git
cd typescript-teslemetry

# Install dependencies
pnpm install

# Build the package
pnpm --filter homebridge-teslemetry build

# Watch mode for development
pnpm --filter homebridge-teslemetry watch
```

### Testing Locally

```bash
# Link globally for testing
cd packages/homebridge-teslemetry
pnpm link --global

# In your Homebridge directory
cd ~/.homebridge
pnpm link --global homebridge-teslemetry

# Run Homebridge in debug mode
homebridge -D
```

## Contributing

Contributions are welcome! Please read the [contributing guidelines](../../CONTRIBUTING.md) before submitting pull requests.

## Support

- **Issues**: [GitHub Issues](https://github.com/Teslemetry/typescript-teslemetry/issues)
- **Documentation**: [Teslemetry Docs](https://teslemetry.com/docs)
- **Community**: [Teslemetry Discord](https://discord.gg/teslemetry)

## License

Apache-2.0 - see [LICENSE](../../LICENSE) for details.

## Credits

- Built with [@teslemetry/api](https://www.npmjs.com/package/@teslemetry/api)
- Powered by [Teslemetry](https://teslemetry.com)
- Part of the [Homebridge](https://homebridge.io) ecosystem

## Related Projects

- [@teslemetry/api](../api) - Core TypeScript SDK
- [node-red-contrib-teslemetry](../node-red-contrib-teslemetry) - Node-RED integration
- [n8n-nodes-teslemetry](../n8n-nodes-teslemetry) - n8n workflow integration
- [homey](../homey) - Homey smart home app

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.
