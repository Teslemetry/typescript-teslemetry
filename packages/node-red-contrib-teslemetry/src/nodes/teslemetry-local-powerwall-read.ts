import { Node, NodeAPI, NodeDef } from "node-red";
import { failInput, getErrorMessage } from "../shared";
import { pollInterval } from "../validation";
import type { LocalRead } from "../localPowerwall";
import { Msg } from "../types";
import type { TeslemetryLocalPowerwallNode } from "./teslemetry-local-powerwall";

export interface TeslemetryLocalPowerwallReadNodeDef extends NodeDef {
  localGateway: string;
  read: LocalRead;
  /** Seconds between polls; 0 reads only on an input message. */
  interval: string | number;
}

export default function (RED: NodeAPI) {
  function TeslemetryLocalPowerwallReadNode(
    this: Node,
    config: TeslemetryLocalPowerwallReadNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;
    const read = config.read || "live_status";
    const gateway = RED.nodes.getNode(config.localGateway) as
      | TeslemetryLocalPowerwallNode
      | undefined;

    async function readGateway(): Promise<unknown> {
      if (!gateway?.local) {
        throw new Error("Set up the Local gateway first");
      }
      const { LOCAL_READS } = await import("../localPowerwall");
      if (!Object.prototype.hasOwnProperty.call(LOCAL_READS, read)) {
        throw new Error(`Unknown read: ${read}`);
      }
      return LOCAL_READS[read](await gateway.local());
    }

    function showRead() {
      node.status({
        fill: "green",
        shape: "dot",
        text: new Date().toLocaleTimeString(),
      });
    }

    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    /** Set while polls fail, so a gateway that stays down is logged once, not every poll. */
    let failing = false;
    const interval = pollInterval(config.interval);

    async function poll() {
      try {
        const payload = await readGateway();
        if (closed) return;
        failing = false;
        showRead();
        node.send({ payload, topic: read });
      } catch (error) {
        if (closed) return;
        const text = getErrorMessage(error);
        node.status({ fill: "red", shape: "ring", text });
        if (!failing) node.error(`Local Powerwall read failed: ${text}`);
        failing = true;
      }
      // The next poll waits for this one, so slow replies never pile up.
      if (!closed) timer = setTimeout(poll, interval);
    }
    if (interval) timer = setTimeout(poll, 0);

    node.on("input", async (msg: Msg, send, done) => {
      try {
        const payload = await readGateway();
        showRead();
        send({ ...msg, payload, topic: read });
        done();
      } catch (error) {
        failInput(node, done, error);
      }
    });

    node.on("close", (done: () => void) => {
      closed = true;
      clearTimeout(timer);
      done();
    });
  }
  RED.nodes.registerType(
    "teslemetry-local-powerwall-read",
    TeslemetryLocalPowerwallReadNode,
  );
}
