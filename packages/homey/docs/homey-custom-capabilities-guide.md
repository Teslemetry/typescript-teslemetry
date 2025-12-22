# Homey Custom Capabilities Guide

This comprehensive guide explains how to create and use custom capabilities in Homey apps, designed for LLM consumption and developer reference.

## Overview

Capabilities in Homey define what a device can do or measure. While Homey includes many system capabilities (like `onoff`, `dim`, `measure_temperature`), you can create custom capabilities when the built-in ones don't meet your device's specific needs.

## Basic Capability Usage

### Using System Capabilities

In your App Manifest, every driver requires a `capabilities` array containing the keys of all capabilities:

```json
{
  "capabilities": ["onoff", "dim", "measure_temperature"]
}
```

### Device Implementation

Your Device class must synchronize capability values bidirectionally:

1. **From device to Homey**: Use `Device#setCapabilityValue()` when device state changes
2. **From Homey to device**: Register listeners with `Device#registerCapabilityListener()`

```javascript
// drivers/<driver_id>/device.js
const Homey = require('homey');
const DeviceApi = require('device-api');

class Device extends Homey.Device {
  async onInit() {
    // Listen for capability changes from Homey (e.g., Flow actions)
    this.registerCapabilityListener("onoff", async (value) => {
      await DeviceApi.setMyDeviceState({ on: value });
    });

    // Update Homey when device state changes
    DeviceApi.on('state-changed', (isOn) => {
      this.setCapabilityValue('onoff', isOn).catch(this.error);
    });
  }
}

module.exports = Device;
```

## Capability Options

Capability options modify the default behavior of capabilities through the `capabilitiesOptions` object in your driver manifest.

### Universal Options

Available for all capabilities:

| Option | Type | Description |
|--------|------|-------------|
| `title` | Translation Object | Override capability title (max 2-3 words) |
| `preventInsights` | Boolean | Prevent automatic Insights generation |
| `preventTag` | Boolean | Prevent automatic Flow Tag generation |

```json
{
  "capabilitiesOptions": {
    "dim": { 
      "preventInsights": true,
      "title": { "en": "Brightness" }
    }
  }
}
```

### Duration Option

Allows users to specify duration for Flow Action cards:

```json
{
  "capabilitiesOptions": {
    "dim": { "duration": true }
  }
}
```

```javascript
// In device.js
this.registerCapabilityListener("dim", async (value, options) => {
  const duration = typeof options.duration === "number" 
    ? options.duration 
    : DEFAULT_DIM_DURATION;
  
  await DeviceApi.setMyDeviceState({ dimLevel: value, duration });
});
```

### Boolean Capability Options

For capabilities like `onoff`, `alarm_generic`, `button`:

| Option | Type | Description |
|--------|------|-------------|
| `insightsTitleTrue` | Translation Object | Timeline title when value is true |
| `insightsTitleFalse` | Translation Object | Timeline title when value is false |
| `titleTrue` | Translation Object | UI title when value is true |
| `titleFalse` | Translation Object | UI title when value is false |

### Number Capability Options

For capabilities like `measure_temperature`, `dim`:

| Option | Type | Description |
|--------|------|-------------|
| `units` | Translation Object | Unit display (e.g., "°C", "%") |
| `decimals` | Number | Decimal places in UI |
| `min` | Number | Minimum value |
| `max` | Number | Maximum value |
| `step` | Number | Step size for adjustments |

### Enum Capability Options

For capabilities like `thermostat_mode`:

```json
{
  "capabilitiesOptions": {
    "thermostat_mode": {
      "values": [
        {
          "id": "heat",
          "title": { "en": "Heat", "nl": "Verhitten" }
        },
        {
          "id": "cool",
          "title": { "en": "Cool", "nl": "Koelen" }
        }
      ]
    }
  }
}
```

### Specialized Options

#### Zone Activity Control
For motion/presence alarms:
```json
{
  "capabilitiesOptions": {
    "alarm_motion": { "zoneActivity": false }
  }
}
```

#### Homey Energy Integration
For power measurement:
```json
{
  "capabilitiesOptions": {
    "measure_power": { "approximated": true }
  }
}
```

#### Light Device Behavior
Prevent auto-on when dimming:
```json
{
  "capabilitiesOptions": {
    "onoff": { "setOnDim": false }
  }
}
```

#### Stateless Capabilities
Make capabilities stateless:
```json
{
  "capabilitiesOptions": {
    "onoff": { "getable": false }
  }
}
```

## Creating Custom Capabilities

### File Structure

Custom capabilities are defined in separate JSON files:

```
/.homeycompose/capabilities/
  ├── my_boolean_capability.json
  ├── my_numeric_capability.json
  └── my_enum_capability.json
```

### Boolean Custom Capability

```json
// /.homeycompose/capabilities/my_boolean_capability.json
{
  "type": "boolean",
  "title": { "en": "My Boolean Capability" },
  "getable": true,
  "setable": true,
  "uiComponent": "toggle",
  "uiQuickAction": true,
  "icon": "/assets/my_boolean_capability.svg",
  "insights": true,
  "insightsTitleTrue": { "en": "Activated" },
  "insightsTitleFalse": { "en": "Deactivated" }
}
```

### Number Custom Capability

```json
// /.homeycompose/capabilities/my_numeric_capability.json
{
  "type": "number",
  "title": { "en": "Custom Measurement" },
  "uiComponent": "slider",
  "getable": true,
  "setable": true,
  "units": { "en": "units" },
  "min": 0,
  "max": 100,
  "step": 1,
  "decimals": 1,
  "insights": true,
  "icon": "/assets/my_numeric_capability.svg"
}
```

### String Custom Capability

```json
// /.homeycompose/capabilities/my_string_capability.json
{
  "type": "string",
  "title": { "en": "Status Message" },
  "getable": true,
  "setable": false,
  "uiComponent": "sensor",
  "icon": "/assets/my_string_capability.svg"
}
```

### Enum Custom Capability

```json
// /.homeycompose/capabilities/my_enum_capability.json
{
  "type": "enum",
  "title": { "en": "Operation Mode" },
  "getable": true,
  "setable": true,
  "uiComponent": "picker",
  "values": [
    {
      "id": "auto",
      "title": { "en": "Automatic" }
    },
    {
      "id": "manual",
      "title": { "en": "Manual" }
    },
    {
      "id": "eco",
      "title": { "en": "Eco Mode" }
    }
  ],
  "icon": "/assets/my_enum_capability.svg"
}
```

### Using Custom Capabilities

Reference your custom capabilities in the driver manifest:

```json
// /drivers/<driver_id>/driver.compose.json
{
  "name": { "en": "My Advanced Device" },
  "class": "other",
  "capabilities": [
    "onoff",
    "my_boolean_capability",
    "my_numeric_capability",
    "my_string_capability",
    "my_enum_capability"
  ]
}
```

## Custom Capability Properties Reference

### Universal Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | String | Yes | `boolean`, `number`, `string`, or `enum` |
| `title` | Translation Object | Yes | Display name (max 3 words) |
| `getable` | Boolean | No (default: true) | Can value be read from device? |
| `setable` | Boolean | No (default: true) | Can value be set on device? |
| `uiComponent` | String/null | No | UI component type or null to hide |
| `icon` | String | No | Path to SVG icon |
| `insights` | Boolean | No (default: false) | Enable Insights logging |

### Boolean-Specific Properties

| Property | Type | Description |
|----------|------|-------------|
| `uiQuickAction` | Boolean | Enable quick-toggle in UI |
| `insightsTitleTrue` | Translation Object | Timeline title for true value |
| `insightsTitleFalse` | Translation Object | Timeline title for false value |

### Number-Specific Properties

| Property | Type | Description |
|----------|------|-------------|
| `units` | Translation Object | Unit of measurement |
| `min` | Number | Minimum allowed value |
| `max` | Number | Maximum allowed value |
| `step` | Number | Step size for adjustments |
| `decimals` | Number | Decimal places in display |

### Enum-Specific Properties

| Property | Type | Description |
|----------|------|-------------|
| `values` | Array | Array of `{id, title}` objects defining possible values |

## UI Components for Custom Capabilities

### Available UI Components

| Component | Suitable For | Description |
|-----------|--------------|-------------|
| `toggle` | Boolean | On/off switch |
| `slider` | Number | Value adjustment slider |
| `sensor` | Any | Read-only display (multiple capabilities) |
| `button` | Boolean | Action trigger button |
| `picker` | Enum | Dropdown selection |
| `ternary` | Enum (3 values) | Three-state control (up/idle/down) |
| `thermostat` | Number | Temperature control |
| `media` | Boolean/String | Media player controls |
| `color` | Number | Color controls |
| `battery` | Number/Boolean | Battery status display |
| `null` | Any | Hide from UI |

### UI Component Examples

#### Toggle Component
```json
{
  "type": "boolean",
  "uiComponent": "toggle",
  "uiQuickAction": true
}
```

#### Slider Component
```json
{
  "type": "number",
  "uiComponent": "slider",
  "min": 0,
  "max": 100,
  "step": 5
}
```

#### Sensor Component
```json
{
  "type": "number",
  "uiComponent": "sensor",
  "getable": true,
  "setable": false
}
```

#### Picker Component
```json
{
  "type": "enum",
  "uiComponent": "picker",
  "values": [
    { "id": "low", "title": { "en": "Low" } },
    { "id": "medium", "title": { "en": "Medium" } },
    { "id": "high", "title": { "en": "High" } }
  ]
}
```

## Device Indicators

Custom capabilities can appear as device indicators in the Homey interface:

### Boolean Indicators (Alarms)
- Capabilities starting with `alarm_` are grouped by default
- Show warning icon when any alarm is `true`
- Users can select individual alarm capabilities
- `alarm_battery` shows battery icon instead of warning

### Number Indicators
- Capabilities starting with `measure_` or `meter_` can be selected
- Display numeric value with units
- `measure_battery` shows battery icon with percentage

## Maintenance Actions

Convert button capabilities into maintenance actions that appear in device settings:

### Creating Maintenance Actions

```json
// Driver manifest
{
  "capabilities": [
    "onoff",
    "button.calibrate",
    "button.reset"
  ],
  "capabilitiesOptions": {
    "button.calibrate": {
      "maintenanceAction": true,
      "title": { "en": "Start Calibration" },
      "desc": { "en": "Begin sensor calibration process" }
    },
    "button.reset": {
      "maintenanceAction": true,
      "title": { "en": "Factory Reset" },
      "desc": { "en": "Reset device to factory settings" }
    }
  }
}
```

### Handling Maintenance Actions

```javascript
// In device.js
class Device extends Homey.Device {
  async onInit() {
    this.registerCapabilityListener('button.calibrate', async () => {
      try {
        await this.startCalibration();
        this.log('Calibration started successfully');
      } catch (error) {
        this.error('Calibration failed:', error.message);
        throw new Error('Calibration failed');
      }
    });

    this.registerCapabilityListener('button.reset', async () => {
      await this.performFactoryReset();
    });
  }
}
```

## Sub-Capabilities

Use the same capability multiple times with different purposes:

### Naming Convention
Append a dot and identifier: `capability.identifier`

### Examples
```json
{
  "capabilities": [
    "measure_temperature.inside",
    "measure_temperature.outside",
    "target_temperature.living_room",
    "target_temperature.bedroom"
  ]
}
```

### Implementation
```javascript
// Handle sub-capabilities like regular capabilities
this.registerCapabilityListener('target_temperature.living_room', async (value) => {
  await this.setRoomTemperature('living_room', value);
});

this.registerCapabilityListener('target_temperature.bedroom', async (value) => {
  await this.setRoomTemperature('bedroom', value);
});
```

### Important Notes
- Flow Cards are NOT automatically generated for sub-capabilities
- You must create custom Flow Cards for sub-capabilities
- Thermostat UI components group sub-capabilities with matching suffixes

## Best Practices

### Capability Design
1. **Keep titles short** - Maximum 2-3 words
2. **Use appropriate types** - Boolean for on/off, number for measurements
3. **Set proper ranges** - Define min/max values for numbers
4. **Choose suitable UI components** - Match component to capability purpose

### Implementation Guidelines
1. **Handle errors gracefully** - Use try/catch in capability listeners
2. **Synchronize state properly** - Update Homey when device changes
3. **Use appropriate units** - Include units for measurements
4. **Enable insights selectively** - Only for capabilities that benefit from logging

### Performance Considerations
1. **Batch updates** - Avoid frequent setCapabilityValue calls
2. **Use appropriate step sizes** - Don't overwhelm with too many possible values
3. **Consider device limitations** - Match capabilities to actual device features

### Flow Integration
1. **Custom Flow Cards** - Required for sub-capabilities
2. **Meaningful names** - Use descriptive titles for better Flow building
3. **Appropriate triggers** - Consider which capabilities should trigger flows

## Common Patterns

### Sensor Device
```json
{
  "type": "number",
  "title": { "en": "Air Quality" },
  "uiComponent": "sensor",
  "getable": true,
  "setable": false,
  "units": { "en": "AQI" },
  "insights": true
}
```

### Control Device
```json
{
  "type": "number",
  "title": { "en": "Fan Speed" },
  "uiComponent": "slider",
  "getable": true,
  "setable": true,
  "units": { "en": "%" },
  "min": 0,
  "max": 100,
  "step": 10
}
```

### Status Device
```json
{
  "type": "enum",
  "title": { "en": "Status" },
  "uiComponent": "sensor",
  "getable": true,
  "setable": false,
  "values": [
    { "id": "idle", "title": { "en": "Idle" } },
    { "id": "working", "title": { "en": "Working" } },
    { "id": "error", "title": { "en": "Error" } }
  ]
}
```

This guide provides comprehensive information for creating effective custom capabilities in Homey applications, covering all aspects from basic implementation to advanced features and best practices.