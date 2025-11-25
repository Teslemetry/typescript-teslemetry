// examples/simple.ts

import { config } from "dotenv";
import { Teslemetry, TeslemetryStream } from "../src"; // Adjust path if needed

// Load environment variables from .env file
const { TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN } = config().parsed as Record<
  string,
  string
>;

async function main() {
  //@ts-expect-error
  const teslemetry = new Teslemetry(TESLEMETRY_ACCESS_TOKEN, "devapi");
  await teslemetry.getRegion();

  const sonic = teslemetry.getVehicle(TESLEMETRY_VIN);
  const state = await sonic.api.state();
  console.log(state);

  // Listen for battery level updates
  const removeBatteryLevelListener = sonic.sse.listenData(
    "BatteryLevel",
    (batteryLevel) => {
      console.log(`Battery Level: ${batteryLevel}%`);
    },
  );

  // Listen for vehicle speed updates
  const removeVehicleSpeedListener = sonic.sse.listenData(
    "VehicleSpeed",
    (speed) => {
      console.log(`Vehicle Speed: ${speed} km/h`);
    },
  );

  // Listen for connection status changes
  const removeConnectionListener = teslemetry.sse.addConnectionListener(
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
    teslemetry.sse.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
