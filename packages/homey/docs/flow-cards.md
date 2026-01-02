# Flow

{% embed url="<https://www.youtube.com/watch?v=W01YXz5HlR0>" %}

With Homey Flow, Homey users can automate their home. A Flow is a series of *Flow cards*, which are evaluated and executed.

As a developer, you can add new functionality from your app to Flow by exposing various cards.

![](https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-1d415a477b089dbdbffcf58193c141d75e4f3e75%2FFlow.png?alt=media)

A Flow consists of cards in three columns: *when*, *and*, *then*.

* Cards in the *when...* column are called `triggers`. Your app tells Homey to fire a trigger, which will then run all of the user's flows with this trigger.
* Cards in the *...and...* column are called `conditions`. The conditions must be met in order for the flow to continue. For example *it is raining*, or *the vacuum cleaner is cleaning*.
* Cards in the *...then* column are called `actions`. Actions are executed when the trigger has been fired, and all conditions are met.

Your app can expose any of these three card types, by defining them in your App Manifest.

## Defining Flow cards

All Flow cards must at least have an `id` and a `title` property. The `id` is used to refer to the Flow card from your source code. The `title` will be shown to the users and should be a short and clear description of what the Flow card does. A Flow card can have an optional `hint` property that can be used to pass additional information to the user that can not be included in the title.

{% hint style="info" %}
Often it is not necessary to define your own Flow cards because most device classes and capabilities automatically add their own Flow cards.
{% endhint %}

{% code title="/.homeycompose/flow/triggers/rain\_start.json" %}

```javascript
{
  "title": {
    "en": "It starts raining"
  },
  "hint": {
    "en": "When it starts raining more than 0.1 mm/h."
  }
}
```

{% endcode %}

{% code title="/.homeycompose/flow/actions/stop\_raining.json" %}

```javascript
{
  "title": {
    "en": "Make it stop raining.",
  }
}
```

{% endcode %}

### Title for Flow card with arguments

When a Flow card contains arguments it may be necessary to change the title according to these arguments. Using the `titleFormatted` property it is possible to integrate argument values into the title of the Flow card.

{% code title="/.homeycompose/flow/conditions/raining\_in.json" %}

```javascript
{
  "title": 
    "en": "It !{{is|isn't}} going to rain in...",
  },
  "titleFormatted": {
    "en": "It !{{is|isn't}} going to rain in [[when]]",
  },
  "hint": {
    "en": "Checks if it will/will not rain more than 0.1 mm/h within the given amount of time.",
  },
  "args": [
    {
      "name": "when",
      "type": "dropdown",
      "values": [
        { "id": "5", "label": { "en": "5 minutes" } },
        { "id": "10", "label": { "en": "10 minutes" } },
        { "id": "15", "label": { "en": "15 minutes" } }
      ]
    }
  ]
}
```

{% endcode %}

### Title for Flow card condition

For conditional Flow cards it is possible to change the title if the Flow card is inverted. This can be done using the `!{{...|...}}` syntax. In the place of the first three dots (`...`) should be the text that will be shown if the Flow card is not inverted, in place of the second three dots should be the text that will be shown when the Flow card is inverted.

{% code title="/.homeycompose/flow/conditions/is\_raining.json" %}

```javascript
{
  "title": {
    "en": "It !{{is|isn't}} raining"
  },
  "hint": {
    "en": "Checks if it is currently raining more than 0.1 mm/h."
  }
}
```

{% endcode %}

![Example of a Flow condition card and its inverted variant.](https://998911913-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MPk9cn4V7WnnKt7fbry%2Fuploads%2Fgit-blob-d9dd69bd335d85ad26e774de38a6c4501bdab2d4%2FInverted.png?alt=media)

## Triggering a Flow

To fire a trigger, run the following code from anywhere in your app:

{% code title="/app.js" %}

```javascript
const Homey = require('homey');
const RainApi = require('rain-api');

class App extends Homey.App {
  async onInit() {
    const rainStartTrigger = this.homey.flow.getTriggerCard('rain_start');

    RainApi.on('raining', () => {
      await rainStartTrigger.trigger();
    });
  }
}

module.exports = App;
```

{% endcode %}

All of the Flows on the Homey, with the trigger `rain_start` will now fire. More advanced triggers can be achieved using [Tokens](https://apps.developer.homey.app/the-basics/tokens#local-tokens), [State](https://apps.developer.homey.app/the-basics/arguments#flow-state) and [Devices](#device-cards).

### Custom capability changed

As a convenience Homey will automatically run Flow trigger cards with specific IDs when you call `Device#setCapabilityValue()` for a custom capability.

For custom capabilities with the type "number", "enum" or "string" Homey will automatically run Flow triggers with ID `<capability_id>_changed`. When your custom capability has the type "boolean" Homey will automatically run Flow triggers with IDs `<capability_id>_true` and `<capability_id>_false` depending on the value.

For example if your capability is called `measure_clicks` Homey will automatically run Flow triggers with the ID `measure_clicks_changed`. This Flow card can have a [token](https://apps.developer.homey.app/the-basics/flow/tokens) with the same name as the capability that will be set to the current capability value.

{% code title="/drivers/\<driver\_id>/driver.flow\.compose.json" %}

```javascript
{
  "triggers": [
    {
      "id": "measure_clicks_changed",
      "title": { "en": "Clicks updated" },
      "tokens": [
          {
            "name": "measure_clicks",
            "type": "number",
            "title": { "en": "clicks" },
            "example": { "en": "Clicks" }
          }
        ],
    }
  ]
}
```

{% endcode %}

This also works for [sub-capabilities](https://apps.developer.homey.app/devices/capabilities#using-the-same-capability-more-than-once). For example when you update the capability `measure_clicks.inside` Homey will run Flow triggers with ID `measure_clicks.inside_changed`.

## Listening for events

For every Flow card your app includes, you should register a "run" listener. Such a listener gets called when a Flow containing the card is activated. Conditions and Actions need a listener to function, however the listener is only necessary for a Flow trigger when it has one or more [Arguments](https://apps.developer.homey.app/the-basics/flow/arguments).

Condition cards must resolve with a `true` value for the Flow to continue, or a `false` value to stop the Flow from executing. When the card is rejected (e.g. by throwing inside a Promise), the Flow stops executing as well.

{% code title="/app.js" %}

```javascript
const Homey = require('homey');
const RainApi = require('rain-api');

class App extends Homey.App {
  async onInit() {
    const rainingCondition = this.homey.flow.getConditionCard('is_raining');
    rainingCondition.registerRunListener(async (args, state) => {
      const raining = await RainApi.isItRaining(); // true or false
      return raining;
    });

    const stopRainingAction = this.homey.flow.getActionCard('stop_raining');
    stopRainingAction.registerRunListener(async (args, state) => {
      await RainApi.makeItStopRaining();
    });
  }
}

module.exports = App;
```

{% endcode %}

## Device cards

Often you will want to add Flow cards that operate on a specific device. For example you want to trigger a Flow when a button is pressed on a specific switch, not when a button is pressed on any of the switches you own. We call these types of Flow cards "device cards". These Flow cards are displayed to users as belonging to a specific device as opposed to belonging to the App.

If your driver has a `class` that Homey already has support for, like `light` or `socket`, your custom card will be added to those cards. For example, if your driver supports a light bulb that has a special disco mode, the user will see "Turn on", "Turn off", "Dim", "Set color", "Disco mode".

Device cards are defined in `/drivers/<driver_id>/driver.flow.compose.json`. Flow cards defined in this file are only shown for devices belonging to that specific driver.

{% code title="/drivers/\<driver\_id>/driver.flow\.compose.json" %}

```javascript
{
  "actions": [
    {
      "id": "disco_mode",
      "title": { "en": "Disco mode" }
    }
  ]
}
```

{% endcode %}

### Flow Device Trigger cards

When creating a Flow trigger card that should only be activated by a specific device you need to use [`ManagerFlow#getDeviceTriggerCard()`](https://apps-sdk-v3.developer.homey.app/ManagerFlow.html#getDeviceTriggerCard) instead of [`ManagerFlow#getTriggerCard()`](https://apps-sdk-v3.developer.homey.app/ManagerFlow.html#getTriggerCard). A Flow device trigger card allows you to pass the `device` to the `trigger()` method so Homey knows to only start the Flows for that specific device.

{% code title="/drivers/\<driver\_id>/driver.js" %}

```javascript
const Homey = require('homey');

class Driver extends Homey.Driver {
  async onInit() {
    this._deviceTurnedOn = this.homey.flow.getDeviceTriggerCard("turned_on");
  }

  triggerMyFlow(device, tokens, state) {
    this._deviceTurnedOn
      .trigger(device, tokens, state)
      .then(this.log)
      .catch(this.error);
  }
}

module.exports = Driver;
```

{% endcode %}

{% code title="/drivers/\<driver\_id>/device.js" %}

```javascript
const Homey = require('homey');

class Device extends Homey.Device {
  async onInit() {
    let device = this; // We're in a Device instance
    let tokens = {};
    let state = {};

    this.driver.ready().then(() => {
      this.driver.triggerMyFlow(device, tokens, state);
    });
  }
}

module.exports = Device;
```

{% endcode %}

### Flow Card Device filters

If necessary you can add filters to choose for which devices the specific flow card will be available. The `$filter` option supports the following properties:

* `class` filtering based on the device class
* `capabilities` allows based on available capabilities (note that calls to `addCapability` and `removeCapability` don't update this filter)
* `flags` filters based on additional device properties, will be explained below

A simple filter might look like this:

{% code title="/drivers/\<driver\_id>/driver.flow\.compose.json" %}

```javascript
{
  "actions": [
    {
      "id": "disco_mode",
      "title": { "en": "Disco mode" },
      "$filter": "class=socket"
    }
  ]
}
```

{% endcode %}

Filters can match one of multiple values by separating values with a pipe (`|`), for example: `"class=socket|light"` will match devices with a device class of either `socket` or `light`.

`capabilities` and `flags` also support matching on multiple values by separating the values with a comma (`,`), for example `"capabilities=onoff,dim"` will match devices that have both `onoff` and `dim` capabilities.

Multiple properties can be filtered on by combining them in the `$filter` separated by an ampersand (`&`), for example this filter will match devices belonging to the `basic` driver with a `socket` or `light` device class and `onoff` and `dim` capabilities.

```javascript
"$filter": "class=socket|light&capabilities=onoff,dim"
```

The following filters can be applied to Z-Wave devices:

**Target only multi channel node devices:**

```javascript
"$filter": "flags=zwaveMultiChannel"
```

**Target only root node devices:**

```javascript
"$filter": "flags=zwaveRoot"
```

The following filters can be applied to Zigbee devices:

**Target only sub devices:**

```javascript
"$filter": "flags=zigbeeSubDevice"
```

## Highlighted Flow cards

Sometimes you will have a large list of Flow cards available in your app, finding the most important Flow cards might then become cumbersome for users. For cases like this, there is an option available to have some cards appear in a separate list above all other cards. This list is called "Highlighted Cards", highlighting the most important cards makes it easier for users to quickly find the most important ones.

Highlighting a Flow card is simply done by adding `"highlight": true` to your Flow card in the App Manifest.

Some built-in Flow cards are always highlighted, for example the “Motion alarm turned on” card.

{% hint style="warning" %}
Choose your highlighted Flow cards carefully, the point is to list a few cards that are used often. If you highlight too many cards this list can quickly become just as hard to navigate as the list of all Flow cards.
{% endhint %}

## Advanced Flow cards

To make a Flow card available only for use in Advanced Flow, add `"advanced": true` to your Flow card in the App Manifest.

{% hint style="info" %}
Then-cards with the `"tokens"` property automatically imply the `"advanced": true` property.
{% endhint %}

## Deprecating cards

Sometimes a Flow card that has been available in the past should be removed. To not break compatibility for users who were using it, add `"deprecated": true` to your Flow card in the App Manifest. It will still work, but won't show up anymore in the 'Add Card' list.
