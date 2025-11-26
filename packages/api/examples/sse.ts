// examples/simple.ts

import { config } from "dotenv";
import { Teslemetry } from "@teslemetry/api"; // Adjust path if needed

// Load environment variables from .env file
const { TESLEMETRY_ACCESS_TOKEN, TESLEMETRY_VIN } = config().parsed as Record<
  string,
  string
>;
async function main() {
  const teslemetry = new Teslemetry(TESLEMETRY_ACCESS_TOKEN, "na");

  const sonic = teslemetry.getVehicle(TESLEMETRY_VIN);

  // Listen for battery level updates
  const l1 = sonic.sse.onSignal("ChargerVoltage", (x) => {
    console.log(`BChargerVoltage:`, x);
  });
  const l2 = sonic.sse.on((x) => {
    //console.log(`Sonic:`, x);
  });
  const l3 = teslemetry.sse.on((x) => {
    //console.log(`Enervything:`, x);
  });
  // Listen for connection status changes
  const l4 = teslemetry.sse.onConnection((connected: boolean) => {
    console.log(
      `Stream connection status: ${connected ? "Connected" : "Disconnected"}`,
    );
  });

  // Connect to the stream
  await teslemetry.sse.connect();

  console.log("Listening for Teslemetry Stream events...");
  console.log("Press Ctrl+C to stop.");

  // Keep the script running
  process.on("SIGINT", () => {
    console.log("Disconnecting from Teslemetry Stream...");
    l1();
    l2();
    l3();
    l4();
    teslemetry.sse.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
