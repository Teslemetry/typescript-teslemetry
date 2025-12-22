# Teslemetry for Homey

This app integrates Tesla vehicles and energy products (Powerwall, Solar, Wall Connector) into Homey using the Teslemetry API. It leverages Tesla's Fleet Telemetry for real-time updates and provides comprehensive control over your Tesla ecosystem.

## Features

### Vehicles
- Real-time status updates via Fleet Telemetry (no polling).
- Security: Lock/Unlock, Sentry Mode, Flash Lights, Honk Horn.
- Climate: AC Control, Set Temperature, Defrost, Seat & Steering Wheel Heaters.
- Charging: Start/Stop Charging, Charge Port control.
- Hardware: Frunk/Trunk actuation, Window venting.
- Sensors: Battery level, Range, Inside/Outside temperature, Lock & Plug status.

### Energy Sites (Powerwall & Solar)
- Real-time power flow monitoring (Solar, Grid, Battery, and Home Load).
- Operation Mode control (Backup, Self-Consumption, Autonomous).
- Backup Reserve configuration.
- Grid Export rules (Allow/Disallow export).
- Storm Watch toggle and status.

### Wall Connector
- Real-time charging power monitoring.
- Charging state tracking.
- Connected vehicle VIN identification.

## Setup Instructions

1. **Teslemetry Subscription**:
   - Login to [Teslemetry](https://teslemetry.com) and ensure you have a subscription for the required vehicles and energy sites
   - Install the virtual key or configure streaming on your vehicles as required.

2. **Configuration**:
   - Install the app on your Homey.
   - Go to App Settings and enter your Teslemetry Access Token.

3. **Pairing**:
   - Add a new Device in Homey.
   - Select "Tesla Vehicle", "Tesla Energy Site", or "Tesla Wall Connector".
   - Follow the pairing wizard to select your products.

## Technical Details

- **Protocol**: HTTPS / Server-Sent Events (SSE) via Teslemetry.
- **Architecture**:
  - `lib/TeslemetryDevice.ts`: Base class for shared logic and capability synchronization.
  - `lib/TeslemetryOAuth2Client.ts`: Handles secure communication with the Teslemetry API.
  - `.homeycompose`: Custom capability definitions for Tesla-specific features like Sentry Mode, Backup Reserve, and Seat Heaters.

## Requirements

- A Homey Pro (2019, 2023) or Homey Cloud.
- A Teslemetry account and active subscription.
- Tesla hardware (Vehicle with connectivity, Powerwall, or Wall Connector).

## Support

For issues, please visit the GitHub repository or contact Teslemetry support.
