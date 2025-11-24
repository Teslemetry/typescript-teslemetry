// examples/simple.ts

import { TeslemetryStream } from "../src"; // Adjust path if needed

// IMPORTANT: Replace with your actual Teslemetry Access Token and VIN
const TESLEMTRY_ACCESS_TOKEN =
  process.env.TESLEMTRY_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN";
const TESLEMTRY_VIN = process.env.TESLEMTRY_VIN || "YOUR_VIN";

async function main() {
  if (
    TESLEMTRY_ACCESS_TOKEN === "YOUR_ACCESS_TOKEN" ||
    TESLEMTRY_VIN === "YOUR_VIN"
  ) {
    console.error(
      "Please set TESLEMTRY_ACCESS_TOKEN and TESLEMTRY_VIN environment variables or replace placeholders in examples/simple.ts",
    );
    process.exit(1);
  }

  const stream = new TeslemetryStream({
    access_token: TESLEMTRY_ACCESS_TOKEN,
    vin: TESLEMTRY_VIN,
    // server: "na.teslemetry.com", // Optional: specify server
    parse_timestamp: true, // Optional: parse timestamps in events
  });

  const vehicle = stream.getVehicle(TESLEMTRY_VIN);

  // Listen for battery level updates
  const removeBatteryLevelListener = vehicle.listenBatteryLevel(
    (batteryLevel: number | null) => {
      console.log(`Battery Level: ${batteryLevel}%`);
    },
  );

  // Listen for vehicle speed updates
  const removeVehicleSpeedListener = vehicle.listenVehicleSpeed(
    (speed: number | null) => {
      console.log(`Vehicle Speed: ${speed} km/h`);
    },
  );

  // Listen for connection status changes
  const removeConnectionListener = stream.addConnectionListener(
    (connected: boolean) => {
      console.log(
        `Stream connection status: ${connected ? "Connected" : "Disconnected"}`,
      );
    },
  );

  console.log("Listening for Teslemetry Stream events...");
  console.log("Press Ctrl+C to stop.");

  // Keep the script running
  process.on("SIGINT", () => {
    console.log("Disconnecting from Teslemetry Stream...");
    removeBatteryLevelListener();
    removeVehicleSpeedListener();
    removeConnectionListener();
    stream.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
