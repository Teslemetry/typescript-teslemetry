# ioBroker.teslemetry

[![NPM version](https://img.shields.io/npm/v/iobroker.teslemetry.svg)](https://www.npmjs.com/package/iobroker.teslemetry)
[![Downloads](https://img.shields.io/npm/dm/iobroker.teslemetry.svg)](https://www.npmjs.com/package/iobroker.teslemetry)
[![License](https://img.shields.io/npm/l/iobroker.teslemetry.svg)](https://github.com/Teslemetry/typescript-teslemetry/blob/main/LICENSE)

ioBroker adapter for controlling Tesla vehicles and energy sites via the Teslemetry API.

## Features

### Vehicle Control
- 🚗 **Climate Control** - Start/stop climate, set temperature
- 🔋 **Charging** - Start/stop charging, set charge limit
- 🔒 **Security** - Lock/unlock, sentry mode, valet mode
- 📍 **Location** - Real-time GPS tracking
- 🚦 **Commands** - Flash lights, honk horn, open frunk/trunk
- 📊 **Data Monitoring** - Battery level, range, odometer, and more

### Energy Site Management
- ⚡ **Power Flow** - Monitor solar, battery, grid, and load power
- 🔋 **Battery Status** - State of charge and capacity
- ⚙️ **Operation Modes** - Self-consumption, backup, autonomous
- 🌩️ **Storm Mode** - Prepare for power outages
- 🏠 **Off-Grid** - Configure backup reserves

### Real-Time Updates
- 📡 **SSE Streaming** - Live vehicle and energy site updates via Server-Sent Events
- 🔄 **Automatic Reconnection** - Robust connection handling
- 💤 **Sleep Mode Aware** - Won't wake sleeping vehicles unnecessarily
- 📊 **Polling** - Optional fallback for vehicles and energy sites when streaming is disabled

## Prerequisites

Before installing this adapter, you need:

1. **Tesla Vehicle or Energy Site** - At least one Tesla product registered to your account
2. **Teslemetry Account** - Sign up at [teslemetry.com](https://teslemetry.com)
3. **Access Token** - Generate an API access token from the Teslemetry console

### Getting Your Access Token

1. Go to [https://teslemetry.com/console](https://teslemetry.com/console)
2. Log in with your account
3. Navigate to **API Keys** or **Access Tokens**
4. Click **Generate New Token**
5. Copy the token (you'll need it for adapter configuration)

## Installation

### Via ioBroker Admin Interface

1. Open ioBroker admin interface
2. Go to **Adapters** tab
3. Search for **"teslemetry"**
4. Click **Install** button
5. Wait for installation to complete
6. Click on the adapter instance to configure it

### Manual Installation (for development)

```bash
cd /opt/iobroker
npm install iobroker.teslemetry
```

## Configuration

### Access Token

1. Open the adapter configuration in ioBroker admin
2. Paste your Teslemetry access token in the **Access Token** field
3. Click **Test Connection** to verify it works
4. The test will show how many vehicles and energy sites were found

### Region Selection

- **Auto-detect** (recommended) - Automatically determines the correct Tesla API region
- **North America** - Manually select NA region
- **Europe** - Manually select EU region

### Data Update Settings

**Real-time Streaming (recommended)**
- Enable **"Enable real-time streaming (SSE)"**
- Provides instant updates when vehicle or energy site data changes
- More efficient and responsive than polling

**Polling Mode**
- Disable streaming to use polling instead for both vehicles and energy sites
- Set **Poll Interval** (minimum 30 seconds)
- Less efficient but works if streaming has issues

### Device Selection

By default, all vehicles and energy sites in your Tesla account are included. You can optionally filter:

- **Selected Vehicles** - Enter specific VINs to monitor only certain vehicles
- **Selected Energy Sites** - Enter specific site IDs to monitor only certain sites

Leave these fields empty to include all devices.

## State Objects

The adapter creates a hierarchical state structure for each device:

### Vehicle States

```
teslemetry.0
└── vehicles
    └── {VIN}
        ├── _info
        │   ├── name              (string, read-only)
        │   ├── model             (string, read-only)
        │   └── state             (string, read-only) - online/asleep/offline
        ├── location
        │   ├── latitude          (number, read-only)
        │   ├── longitude         (number, read-only)
        │   ├── heading           (number, read-only)
        │   └── speed             (number, read-only)
        ├── climate
        │   ├── inside_temp               (number, read-only)
        │   ├── outside_temp              (number, read-only)
        │   ├── driver_temp_setting       (number, read-write)
        │   ├── passenger_temp_setting    (number, read-write)
        │   ├── is_climate_on             (boolean, read-only)
        │   └── is_preconditioning        (boolean, read-only)
        ├── charge
        │   ├── battery_level             (number, read-only)
        │   ├── usable_battery_level      (number, read-only)
        │   ├── charging_state            (string, read-only)
        │   ├── charge_limit_soc          (number, read-write)
        │   ├── charge_rate               (number, read-only)
        │   ├── charger_power             (number, read-only)
        │   └── time_to_full_charge       (number, read-only)
        ├── drive
        │   ├── odometer                  (number, read-only)
        │   └── shift_state               (string, read-only)
        ├── state
        │   ├── locked                    (boolean, read-only)
        │   ├── sentry_mode               (boolean, read-write)
        │   ├── valet_mode                (boolean, read-only)
        │   └── is_user_present           (boolean, read-only)
        └── commands
            ├── wake                      (boolean, write-only)
            ├── lock                      (boolean, write-only)
            ├── unlock                    (boolean, write-only)
            ├── start_climate             (boolean, write-only)
            ├── stop_climate              (boolean, write-only)
            ├── start_charging            (boolean, write-only)
            ├── stop_charging             (boolean, write-only)
            ├── flash_lights              (boolean, write-only)
            ├── honk_horn                 (boolean, write-only)
            ├── open_frunk                (boolean, write-only)
            └── open_trunk                (boolean, write-only)
```

### Energy Site States

```
teslemetry.0
└── energy
    └── {SITE_ID}
        ├── _info
        │   ├── name                      (string, read-only)
        │   └── resource_type             (string, read-only)
        ├── live
        │   ├── solar_power               (number, read-only) - Watts
        │   ├── battery_power             (number, read-only) - Watts
        │   ├── grid_power                (number, read-only) - Watts
        │   ├── load_power                (number, read-only) - Watts
        │   └── timestamp                 (number, read-only)
        ├── battery
        │   ├── percentage                (number, read-only)
        │   └── total_pack_energy         (number, read-only)
        ├── operation
        │   ├── mode                      (string, read-write)
        │   ├── backup_reserve_percent    (number, read-write)
        │   └── off_grid_reserve_percent  (number, read-write)
        ├── tariff
        │   ├── tariff_id                 (string, read-only)
        │   ├── tariff_content            (string/JSON, read-only)
        │   └── tariff_content_v2         (string/JSON, read-only)
        └── commands
            └── storm_mode                (boolean, write-only)
```

## Usage Examples

### Automation Scripts

#### Start Climate Before Departure

```javascript
// Start climate at 7 AM on weekdays
schedule('0 7 * * 1-5', function() {
    setState('teslemetry.0.vehicles.YOUR_VIN.commands.start_climate', true);
});
```

#### Charge During Off-Peak Hours

```javascript
// Start charging at 11 PM
schedule('0 23 * * *', function() {
    setState('teslemetry.0.vehicles.YOUR_VIN.commands.start_charging', true);
});

// Stop charging at 6 AM
schedule('0 6 * * *', function() {
    setState('teslemetry.0.vehicles.YOUR_VIN.commands.stop_charging', true);
});
```

#### Enable Sentry Mode When Away

```javascript
// Enable sentry mode when leaving home
on({id: 'presence.0.away', change: 'any'}, function(obj) {
    if (obj.state.val === true) {
        setState('teslemetry.0.vehicles.YOUR_VIN.state.sentry_mode', true);
    } else {
        setState('teslemetry.0.vehicles.YOUR_VIN.state.sentry_mode', false);
    }
});
```

#### Monitor Battery Level

```javascript
// Alert when battery is low
on({id: 'teslemetry.0.vehicles.YOUR_VIN.charge.battery_level', change: 'any'}, function(obj) {
    if (obj.state.val < 20) {
        // Send notification (using your notification adapter)
        sendTo('telegram.0', 'send', {
            text: `⚠️ Vehicle battery low: ${obj.state.val}%`
        });
    }
});
```

#### Storm Mode Preparation

```javascript
// Enable storm mode when weather alert is issued
on({id: 'weather.0.warnings.storm', val: true}, function() {
    setState('teslemetry.0.energy.YOUR_SITE_ID.commands.storm_mode', true);
});
```

## Vehicle Sleep Mode

Tesla vehicles enter sleep mode after a period of inactivity to conserve battery. This adapter is designed to respect sleep mode:

- **Streaming mode** - Receives updates when vehicle is awake, doesn't wake it
- **Polling mode** - Checks state without waking, skips data fetch if asleep
- **Commands** - Will wake vehicle when needed to execute commands
- **Wake command** - Explicitly wake the vehicle when needed

To manually wake a vehicle:
```javascript
setState('teslemetry.0.vehicles.YOUR_VIN.commands.wake', true);
```

## Troubleshooting

### Connection Issues

**Problem**: "Connection failed" error during setup

**Solutions**:
1. Verify your access token is correct
2. Check that your token hasn't expired
3. Try changing the region setting
4. Ensure your ioBroker server has internet access

### No Data Updates

**Problem**: States aren't updating

**Solutions**:
1. Check that streaming is enabled (or polling interval is set)
2. Verify vehicle is online (check `_info.state`)
3. Look for errors in the adapter log
4. Try restarting the adapter instance

### Commands Not Working

**Problem**: Commands don't execute

**Solutions**:
1. Verify vehicle is online (not asleep or offline)
2. Check adapter log for error messages
3. Try waking the vehicle first
4. Ensure your Teslemetry account has command permissions

### Rate Limiting

**Problem**: API errors about rate limits

**Solutions**:
1. Increase polling interval (minimum 60 seconds recommended)
2. Enable streaming instead of polling
3. Reduce frequency of manual commands
4. Check if other applications are using the same API token

## FAQ

**Q: Is this free to use?**
A: The adapter is free and open-source. Teslemetry API access may have different pricing tiers.

**Q: Will this drain my vehicle battery?**
A: No. The adapter respects sleep mode and won't wake the vehicle for data updates. Only commands will wake the vehicle.

**Q: Can I control multiple vehicles?**
A: Yes! The adapter automatically discovers all vehicles and energy sites in your Tesla account.

**Q: Does this work with Tesla Fleet API?**
A: Yes, Teslemetry provides access to the Tesla Fleet API, which is what this adapter uses.

**Q: What's the difference between streaming and polling?**
A: Streaming provides real-time updates as they happen. Polling checks for updates at fixed intervals. Streaming is more efficient and responsive.

## Support

- **Issues**: [GitHub Issues](https://github.com/Teslemetry/typescript-teslemetry/issues)
- **Documentation**: [Teslemetry API Docs](https://teslemetry.com/docs)
- **Forum**: [ioBroker Forum](https://forum.iobroker.net)

## Development

This adapter is part of the [Teslemetry TypeScript monorepo](https://github.com/Teslemetry/typescript-teslemetry).

### Building

```bash
cd packages/iobroker.teslemetry
pnpm install
pnpm build
```

### Testing

```bash
pnpm test
```

## Changelog

### 0.1.0 (2026-01-08)
- Initial release
- Vehicle control (climate, charging, locks, etc.)
- Energy site management (power flow, operation modes)
- Real-time SSE streaming support
- Polling fallback mode
- Multi-language support (English, German)

## License

Apache-2.0 © 2026 Teslemetry

## Credits

- Developed by [Teslemetry](https://teslemetry.com)
- Built on [@teslemetry/api](https://www.npmjs.com/package/@teslemetry/api)
- Part of the ioBroker ecosystem
