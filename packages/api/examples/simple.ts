// examples/simple.ts

import { config } from "dotenv";
import { Teslemetry } from "../src"; // Adjust path if needed

// Load environment variables from .env file
const { TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN } = config().parsed as Record<
  string,
  string
>;

console.log({ TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN });

async function main() {
  const teslemetry = new Teslemetry(TESLEMETRY_ACCESS_TOKEN, "na");
  await teslemetry.getRegion();
  await teslemetry.api.test();

  const sonic = teslemetry.getVehicle(TESLEMETRY_VIN);
  const state = await sonic.api.state();
  console.log(state);
  await sonic.api.flashLights();

  // Listen for battery level updates
  const removeDataListener = sonic.sse.listenData("ChargerVoltage", (x) => {
    console.log(`BChargerVoltage: ${x}`);
  });
  const removeDataListener2 = sonic.sse.listenData("PackCurrent", (x) => {
    console.log(`PackCurrent: ${x}`);
  });
  sonic.sse.listen((event) => {
    console.log(`Sonic listen:`, event);
  });
  teslemetry.sse.listen((event) => {
    console.log(`listen:`, event);
  });
  // Listen for connection status changes
  const removeConnectionListener = teslemetry.sse.addConnectionListener(
    (connected: boolean) => {
      console.log(
        `Stream connection status: ${connected ? "Connected" : "Disconnected"}`,
      );
    },
  );

  // Connect to the stream
  await teslemetry.sse.connect();

  console.log("Listening for Teslemetry Stream events...");
  console.log("Press Ctrl+C to stop.");

  // Keep the script running
  process.on("SIGINT", () => {
    console.log("Disconnecting from Teslemetry Stream...");
    removeDataListener();
    removeConnectionListener();
    teslemetry.sse.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
