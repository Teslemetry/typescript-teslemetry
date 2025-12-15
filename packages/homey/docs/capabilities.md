# Capabilities

A simple example of capabilities is `onoff`. This is a boolean capability that tells Homey whether the device is turned `on` (when `true`) or `off` (when `false`). Homey ships with many capabilities (called system capabilities). These can be found in the [Device Capability Reference](https://apps-sdk-v3.developer.homey.app/tutorial-device-capabilities.html).

## Using capabilities

In your App Manifest, for every driver an array `capabilities` is required. This is an array with the keys of all capabilities. This array can be overwritten during [pairing](https://apps.developer.homey.app/the-basics/pairing#devices-list).

Your Device (`device.js`) instance needs to keep the device synchronised with Homey. Capabilities need to be synchronized both ways. This means that if a device's state changes, for example if the user turns on the lights, your app needs to tell Homey. It is also possible for Homey to request your app to change the state of the device, for example when a Flow is triggered to turn off the lights.

Your `Device` class should listen for changes to the device's and then update the capability value within Homey by calling [`Device#setCapabilityValue()`](https://apps-sdk-v3.developer.homey.app/Device.html#setCapabilityValue). You should also register a method with [`Device#registerCapabilityListener()`](https://apps-sdk-v3.developer.homey.app/Device.html#registerCapabilityListener) that to update the state of the physical device.

{% code title="/drivers/\<driver\_id>/device.js" %}

```javascript
const Homey = require('homey');
const DeviceApi = require('device-api');

class Device extends Homey.Device {
  async onInit() {
    this.registerCapabilityListener("onoff", async (value) => {
      await DeviceApi.setMyDeviceState({ on: value });
    });

    DeviceApi.on('state-changed', (isOn) => {
      this.setCapabilityValue('onoff', isOn).catch(this.error);
    });
  }
}

module.exports = Device;
```

{% endcode %}

## Capability options

Some capabilities make use of capability options, which can be set to change the default behaviour of capabilities. Capability options can be set using the `capabilitiesOptions` object in the driver's entry in the App Manifest.

{% code title="/drivers/\<driver\_id>/driver.compose.json" %}

```javascript
{
  "name": { "en": "My Driver" },
  "images": {
    "small": "/drivers/my_driver/assets/images/small.png",
    "large": "/drivers/my_driver/assets/images/large.png"
  },
  "class": "light",
  "capabilities": ["onoff", "dim"],
  "capabilitiesOptions": {
    "dim": { "preventInsights": true }
  }
}
```

{% endcode %}

Options that apply to all capabilities are:

| Attribute         | Description                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | <p>Overwrite the capability title <code>{ "en": "My Custom Title" }</code>.<br><em>Make sure a custom title is never more than 2 - 3 words.</em></p> |
| `preventInsights` | Prevent Insights from being automatically generated.                                                                                                 |
| `preventTag`      | Prevent a Flow Tag from being automatically generated.                                                                                               |

### Duration

The duration capability option can be used to allow users to specify the duration of a Flow Action card for built-in capabilities. The configured duration will be passed as a second argument to your capability listener in [`Device#registerCapabilityListener()`](https://apps-sdk-v3.developer.homey.app/Device.html#registerCapabilityListener).

| Attribute  | Description                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `duration` | Set to `true` to allow users to set a duration on the Flow Action card associated with this capability. |

{% code title="/drivers/\<driver\_id>/device.js" %}

```javascript
const Homey = require('homey');
const DeviceApi = require('device-api');

const DEFAULT_DIM_DURATION = 1000;

class Device extends Homey.Device {
  async onInit() {
    this.registerCapabilityListener("dim", async (value, options) => {
      await DeviceApi.setMyDeviceState({
        on: value,
        duration: typeof options.duration === "number"
          ? options.duration
          : DEFAULT_DIM_DURATION,
      });
    });
  }
}

module.exports = Device;
```

{% endcode %}

### Boolean capability options

Options that apply to boolean capabilities, such as `onoff`, `windowcoverings_closed`, `garagedoor_closed,` `alarm_generic` and `button`, are:

<table data-header-hidden><thead><tr><th width="238">Attribute</th><th>Description</th></tr></thead><tbody><tr><td>Attribute</td><td>Description</td></tr><tr><td><code>insightsTitleTrue</code></td><td>A <a href="../app/internationalization">translation object</a> which describes the title when shown in a Timeline.</td></tr><tr><td><code>insightsTitleFalse</code></td><td>A <a href="../app/internationalization">translation object</a> which describes the title when shown in a Timeline.</td></tr><tr><td><code>titleTrue</code></td><td>A <a href="../app/internationalization">translation object</a> which describes the title when shown in a sensor UI component.</td></tr><tr><td><code>titleFalse</code></td><td>A <a href="../app/internationalization">translation object</a> which describes the title when shown in a sensor UI component.</td></tr></tbody></table>

### Number capability options

Options that apply to number capabilities, such as the `measure_*` capabilities, are:

<table data-header-hidden><thead><tr><th width="239">Attribute</th><th>Description</th></tr></thead><tbody><tr><td>Attribute</td><td>Description</td></tr><tr><td><code>units</code></td><td>A <a href="../app/internationalization">translation object</a> of the capability's units, when applicable. If set to <code>"°C"</code> Homey can automatically convert this capability value to Fahrenheit.</td></tr><tr><td><code>decimals</code></td><td>The number of decimals to show in the UI.</td></tr><tr><td><code>min</code></td><td>A minimum for the capability value.</td></tr><tr><td><code>max</code></td><td>A maximum for the capability value.</td></tr><tr><td><code>step</code></td><td>A step size of the capability value.</td></tr></tbody></table>

### Enum capability options

Options that apply to enum capabilities, such as the `thermostat_mode,` are:

<table><thead><tr><th width="245">Attribute</th><th>Description</th></tr></thead><tbody><tr><td><code>values</code></td><td>An array of object's where each object contains a unique id and a title property that is a <a href="../app/internationalization">translation object</a>.</td></tr></tbody></table>

```json
"capabilitiesOptions": {
    "thermostat_mode": {
      "values": [
        {
          "id": "heat",
          "title": { 
            "en": "Heat",
            "nl": "Verhitten"
          }
        },
        {
          "id": "cool",
          "title": { 
            "en": "Cool",
            "nl": "Koelen"
          }
        }
      ]
    }
  }
```

{% hint style="warning" %}
Note that these are only available since Homey v12.0.1 so in order to use this option increase your app's [compatibility](https://apps.developer.homey.app/app/manifest#properties).
{% endhint %}

### Zone activity capability options

Certain capabilities will mark their device's zone active when their value changes. This behaviour can be controlled using capability options.

Options that apply to `alarm_motion`, `alarm_contact`, `alarm_vibration`, `alarm_occupancy` and `alarm_presence` are:

| Attribute      | Description                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zoneActivity` | Controls whether changes to this capability value also trigger the zone to become active. Set to `false` to disable zone activity for this capability. |

### Homey Energy capability options

Options that apply to `measure_power` are:

| Attribute      | Description                                                                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approximated` | This capability option shows to the user that this power usage measurement might not be accurate. See [#approximated-power-usage](https://apps.developer.homey.app/the-basics/energy#approximated-power-usage "mention") for more information. |

### Light device capability options

Options that apply to `onoff` are:

| Attribute  | Description                                                                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setOnDim` | You can set this capability to `false` to prevent the `onoff` capability from being set when the `dim` capability is updated by a Flow action card. See [lights](https://apps.developer.homey.app/the-basics/devices/best-practices/lights "mention") for more information. |

### Getable

Options that apply to `onoff` and `volume_mute` are:

| Attribute | Description                                                                                                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getable` | This capability option can be set to `false` to make the `onoff` or `volume_mute` capability stateless. If this option is set to `false` the device's `quickAction` will be disabled, the UI components will be updated, and some Flow cards will be added/removed. |

{% hint style="info" %}
The `getable` capability option is available as of Homey v7.2.1.
{% endhint %}

{% hint style="info" %}
Adding `getable: false` to an existing driver will break users' Flows as it removes a number of Flow cards belonging to the `onoff` and `volume_mute` capabilities.
{% endhint %}

## Custom capabilities

In some cases these might not suit your device. Your app can provide additional capabilities (called custom capabilities).

Define custom capabilities in your App Manifest, in an object `capabilities`.

{% code title="/.homeycompose/capabilities/my\_boolean\_capability.json" %}

```javascript
{
  "type": "boolean",
  "title": { "en": "My Boolean capability" },
  "getable": true,
  "setable": true,
  "uiComponent": "toggle",
  "uiQuickAction": true,
  "icon": "/assets/my_boolean_capability.svg"
}
```

{% endcode %}

{% code title="/.homeycompose/capabilities/my\_numeric\_capability.json" %}

```javascript
{
  "type": "number",
  "title": { "en": "My Numeric capability" },
  "uiComponent": "slider",
  "getable": true,
  "setable": false,
  "units": { "en": "Cb" },
  "min": 0,
  "max": 30,
  "step": 0.5
}
```

{% endcode %}

{% code title="/drivers/\<driver\_id>/driver.compose.json" %}

```javascript
{
  "name": { "en": "My Driver" },
  "images": {
    "small": "/drivers/my_driver/assets/images/small.png",
    "large": "/drivers/my_driver/assets/images/large.png"
  },
  "class": "other",
  "capabilities": ["onoff", "my_boolean_capability", "my_numeric_capability"]
}
```

{% endcode %}

The following options can be set for all custom capabilities:

| Property      | Description                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | A capability can be of type `boolean`, `number`, `string` or `enum`.                                                                                                                                                                                        |
| `title`       | A [translation object](https://apps.developer.homey.app/the-basics/app/internationalization) with the capability's title. Keep titles short, max 3 words.                                                                                                   |
| `getable`     | Default: `true`, a boolean whether the capability's value can be requested by a front-end. When getable is `false`, your Device doesn't need to call [`Device#setCapabilityValue`](https://apps-sdk-v3.developer.homey.app/Device.html#setCapabilityValue). |
| `setable`     | Default: `true`, a boolean whether the capability's value can be set by a front-end. When setable is `false`, your Device doesn't need to register a capability listener.                                                                                   |
| `units`       | A [translation object](https://apps.developer.homey.app/the-basics/app/internationalization) of the capability's units, when applicable. If set to `"°C"` Homey can automatically convert this capability value to Fahrenheit.                              |
| `uiComponent` | A preferred component to display in the UI. To hide a capability in the UI, set `uiComponent` to `null`.                                                                                                                                                    |
| `icon`        | A path to an `.svg` Icon.                                                                                                                                                                                                                                   |
| `insights`    | Default: `false`, whether this capability should create an Insights log. Only applicable to the **number** and **boolean** type.                                                                                                                            |

When the capability type is `boolean` the following additional properties can be set:

| Property             | Description                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uiQuickAction`      | Set this to true when you want the user to quick-toggle the capability's value from the UI.                                                      |
| `insightsTitleTrue`  | A [translation object](https://apps.developer.homey.app/the-basics/app/internationalization) which describes the title when shown in a Timeline. |
| `insightsTitleFalse` | A [translation object](https://apps.developer.homey.app/the-basics/app/internationalization) which describes the title when shown in a Timeline. |

When the capability type is `number` the following additional properties can be set:

| Property   | Description                               |
| ---------- | ----------------------------------------- |
| `min`      | A minimum for the capability value.       |
| `max`      | A maximum for the capability value.       |
| `step`     | A step size of the capability value.      |
| `decimals` | The number of decimals to show in the UI. |

When the capability type is `enum` the following additional properties can be set:

| Property | Description                                                                                                                                                                                                                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values` | An array of possible values for this capability. A value consists of an `id`, which will be the capability value, and a `title`, which is a [translation object](https://apps.developer.homey.app/the-basics/app/internationalization). The three `values` should have the ID's `up`, `idle`, and `down`.`{ "id": "option1", "title": { "en": "First option" }}` |

### Device Indicators and Custom Capabilities

The Homey web app and mobile app can display indicators next to the device icons. This gives users the ability to view a specific capability, such as a temperature value or battery status, at a glance. Custom boolean and number capabilities can also be shown as indicators as device indicators.

#### Boolean Capabilities

Boolean capabilities, also called Alarms in Homey, are displayed in two different ways if they start with the prefix `alarm_`. By default all capabilities with this prefix are grouped, and a warning icon is shown if the value of any of the boolean capabilities is `true`. Alternatively users can choose to show the indicator value of a single specific Alarm capability. The `alarm_battery` capabilities will show an "empty battery" icon instead of an exclamation mark.

#### Number Capabilities

Number capabilities, are displayed as a numeric value together with the unit of the capability. Users are able to select capabilities that start with either the prefix `measure_` or `meter_`. The `measure_battery` capability will always be displayed with a custom battery icon instead of a number.

![An example with capabilities: 'meter\_power', 'measure\_battery' and 'alarm\_motion'.](https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-c842003bed438a7f5e190c05c8a28b5ef9275e17%2Fdriver-capability-ui-maintenance.png?alt=media)

{% hint style="warning" %}
Note that it's not possible for users to select and override the default indicator if the device class is **thermostat**, **light**, **lock** or **speaker**.
{% endhint %}

## UI Components

All system capabilities have their own UI component. Custom capabilities can also use these UI components. Homey will automatically try to find the right component, but you can override this by specifying the `uiComponent` property in your custom capability.

### Toggle

`"uiComponent": "toggle"`

The toggle component displays one `boolean` capability. Depending on the capability, the look might change.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-9382025114d235033e790cb1d50f2ef652506ca9%2Fdriver-capability-ui-toggle.png?alt=media" alt=""><figcaption></figcaption></figure>

### Slider

`"uiComponent": "slider"`

The slider component displays one `number` capability. Depending on the capability, the look might change.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-cfe5301b8abdbd8e43869452f4caff6fa1b9ad79%2Fdriver-capability-ui-slider.png?alt=media" alt=""><figcaption></figcaption></figure>

### Sensor

`"uiComponent": "sensor"`

The sensor component displays multiple `number`, `enum`, `string` or `boolean` capabilities.

Booleans that are `true` and begin with `alarm_` will flash red.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-1b1acff5a223a651f8b9fdd0c3c66e59fc481044%2Fdriver-capability-ui-sensors.png?alt=media" alt=""><figcaption></figcaption></figure>

### Thermostat

`"uiComponent": "thermostat"`

The thermostat component displays a `target_temperature` capability, and an optional `measure_temperature`.

If you use sub-capabilities for `target_temperature` and `measure_temperature`, make sure the dot suffix of the capabilities are the same so that they will be displayed together, for instance: `target_temperature.top` and `measure_temperature.top`.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-0b053d9f259bedc2075470549053725030909ad0%2Fdriver-capability-ui-thermostat.png?alt=media" alt=""><figcaption></figcaption></figure>

### Media

`"uiComponent": "media"`

The media component accepts the `speaker_playing`, `speaker_next`, `speaker_prev`, `speaker_shuffle` and `speaker_repeat` capabilities.

Additionally, it shows the album art as set using [`Device#setAlbumArt()`](https://apps-sdk-v3.developer.homey.app/Device.html#setAlbumArt).

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-1c23049c43baa25a753059ff33f5e704d5d7860b%2Fdriver-capability-ui-media.png?alt=media" alt=""><figcaption></figcaption></figure>

### Color

`"uiComponent": "color"`

The color component accepts the `light_hue`, `light_saturation`, `light_temperature` and `light_mode` capabilities.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-3c296338f5cd9699555f6160f5a71ebbfe84ad2e%2Fdriver-capability-ui-color.png?alt=media" alt=""><figcaption></figcaption></figure>

### Battery

`"uiComponent": "battery"`

The battery component accepts either a `measure_battery` or `alarm_battery` capability.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-82f3e9c6c410cb0054e45169d8a534aad6123621%2Fdriver-capability-ui-battery.png?alt=media" alt=""><figcaption></figcaption></figure>

### Picker

`"uiComponent": "picker"`

The picker component accepts one `enum` capability and shows a list of possible values. Make sure the values titles fit on one line and are never more than 3 words.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-aaaee327939dc4626d0a34758d7c6955a49e7d03%2Fdriver-capability-ui-picker.png?alt=media" alt=""><figcaption></figcaption></figure>

### Ternary

`"uiComponent": "ternary"`

The ternary component accepts one `enum` capability with three values, meant for motorized components.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-903e18de531d073ce766bd46073af4b4775e2724%2Fdriver-capability-ui-ternary.png?alt=media" alt=""><figcaption></figcaption></figure>

### Button

`"uiComponent": "button"`

The button component displays one or more`boolean` capabilities. Depending on the capability, the look might change. Most buttons are stateless but it is possible to add a stateful button if the capability is both `setable` and `getable`. Some buttons will be grouped together like volume\_up and volume\_down.

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-6e4ff76c33ff211a97796ded788b2cb2c7a607de%2Fdriver-capability-ui-button.png?alt=media" alt=""><figcaption></figcaption></figure>

### *No UI component*

`"uiComponent": null`

To hide the UI component, specify `null` as value.

## Maintenance Actions

> This feature depends on Homey v3.1.0 and Homey Smartphone App v3.0.1.

Button capabilities can be flagged as maintenance action. This will show a button in 'Device settings > Maintenance actions' and hide the `uiComponent` in the device view. When this button is pressed the registered capability listener will be triggered. This allows you to initiate actions from the device's settings.

Example use cases:

* Starting the calibration process on a device
* Resetting accumulated power measurements

<figure><img src="https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-08c85274efbf6ba4a15e21414fe1daa1cd35ffc1%2Fdriver-capability-ui-maintenance.png?alt=media" alt=""><figcaption></figcaption></figure>

### Creating a maintenance action

A maintenance action capability must be a capability that extends the system capability `button`. In order to mark it as a maintenance action add the `maintenanceAction: true` property to the `capabilitiesOptions` object of the driver manifest. Additionally, provide a `title` property, and optionally a `desc` property.

{% code title="/drivers/\<driver\_id>/driver.compose.json" %}

```javascript
{
  "name": { "en": "P1 Meter" },
  "capabilities": [
    "meter_power",
    "measure_power",
    "button.calibrate",
    "button.reset_meter"
  ],
  "capabilitiesOptions": {
    "button.calibrate": {
      "maintenanceAction": true,
      "title": { "en": "Start calibration" },
      "desc": { "en": "Start the sensor calibration process." }
    },
    "button.reset_meter": {
      "maintenanceAction": true,
      "title": { "en": "Reset power meter" },
      "desc": { "en": "Reset the accumulated power usage (kWh), this can not be restored." }
    }
  }
}
```

{% endcode %}

### Listening for maintenance action events

Register the capability listeners in `device.js` to listen for maintenance action events.

{% code title="/drivers/\<driver\_id>/device.js" %}

```javascript
const Homey = require('homey');

class Device extends Homey.Device {
  async onInit() {
    this.registerCapabilityListener('button.reset_meter', async () => {
      // Maintenance action button was pressed
    });

    this.registerCapabilityListener('button.calibrate', async () => {
      // Maintenance action button was pressed, return a promise
      throw new Error('Something went wrong');
    });
  }
}

module.exports = Device;
```

{% endcode %}

## Sub-capabilities - using the same capability more than once

In certain cases it might occur that a device should use a capability more than once. You can use a sub-capability for this purpose.

An example would be a device with an outside and inside temperature sensor. Simply append a dot followed by an identifier after the capability string during in your driver, e.g. `measure_temperature.inside` & `measure_temperature.outside`.

{% hint style="warning" %}
Flow Cards will not be automatically generated for sub-capabilities, you should create these cards yourself.
{% endhint %}
