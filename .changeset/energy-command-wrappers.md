---
"@teslemetry/api": minor
---

Add wrapper methods on `TeslemetryEnergyApi` for the remaining generated energy-command functions: `getPrograms()`, `sendCommand()`, `getCommandSystemInfo()`, `getCommandNetworkingStatus()`, `getCommandAuthorizedClients()`, `getCommandSignedCommandsPublicKey()`, `getCommandWifiScan()`, `getCommandDeviceCert()`, `scheduleBackupEvent()`, `cancelBackupEvent()`, `setLocalSiteConfig()`, `setIslandMode()`, `addAuthorizedClient()`, and `removeAuthorizedClient()`. These cover Powerwall/gateway networking diagnostics, guest-client (installer) access management, and scheduled backup-event control, which previously required calling the generated client functions directly.
