// examples/simple.ts

import { config } from "dotenv";
import { Teslemetry } from "@teslemetry/api"; // Adjust path if needed

// Load environment variables from .env file
const { TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN } = config().parsed as Record<
  string,
  string
>;

console.log({ TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN });

async function main() {
  const teslemetry = new Teslemetry(TESLEMETRY_ACCESS_TOKEN, {
    region: "na",
    stream: {
      cache: true,
    },
  });
  await teslemetry.getRegion();
  await teslemetry.api.test();

  const sonic = teslemetry.getVehicle(TESLEMETRY_VIN);
  const state = await sonic.api.state();
  console.log(state);
  await sonic.api.flashLights();

  // Listen for battery level updates
  const removeDataListener = sonic.sse.onSignal("ChargerVoltage", (x) => {
    console.log(`BChargerVoltage: ${x}`);
  });
  const removeDataListener2 = sonic.sse.onSignal("PackCurrent", (x) => {
    console.log(`PackCurrent: ${x}`);
  });
  // Listen for connection status changes
  const onConnect = () => {
    console.log(`Stream connection status: Connected`);
  };
  const onDisconnect = () => {
    console.log(`Stream connection status: Disconnected`);
  };
  teslemetry.sse.on("connect", onConnect);
  teslemetry.sse.on("disconnect", onDisconnect);

  // Connect to the stream
  await teslemetry.sse.connect();

  console.log("Listening for Teslemetry Stream events...");
  console.log("Press Ctrl+C to stop.");

  // Keep the script running
  process.on("SIGINT", () => {
    console.log("Disconnecting from Teslemetry Stream...");
    removeDataListener();
    removeDataListener2();
    teslemetry.sse.off("connect", onConnect);
    teslemetry.sse.off("disconnect", onDisconnect);
    teslemetry.sse.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
