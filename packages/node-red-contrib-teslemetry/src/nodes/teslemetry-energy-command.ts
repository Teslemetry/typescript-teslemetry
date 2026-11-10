import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { failInput, getInstance } from "../shared";
import { validateParameters, ValidationRules } from "../validation";
import { Msg } from "../types";
import type { SiteCommands } from "../localPowerwall";
import type { TeslemetryLocalPowerwallNode } from "./teslemetry-local-powerwall";

/**
 * Required top-level shape of `tesla-fleet-api`'s `TariffContentV2` type
 * (packages/api/src/tariff.ts) - the SDK's typed structure for a TOU tariff
 * document, e.g. https://digitalassets-energy.tesla.com/raw/upload/app/fleet-api/example-tariff/PGE-EV2-A.json
 */
const TARIFF_CONTENT_V2_RULES: ValidationRules = {
  version: { required: true, type: "number" },
  utility: { required: true, type: "string" },
  code: { required: true, type: "string" },
  name: { required: true, type: "string" },
  currency: { required: true, type: "string" },
  daily_charges: { required: true, type: "object", isArray: true },
  demand_charges: { required: true, type: "object" },
  energy_charges: { required: true, type: "object" },
  seasons: { required: true, type: "object" },
  monthly_minimum_bill: { type: "number" },
  min_applicable_demand: { type: "number" },
  max_applicable_demand: { type: "number" },
  monthly_charges: { type: "number" },
  daily_demand_charges: { type: "object" },
  sell_tariff: { type: "object" },
};

const TARIFF_CONTENT_V2_NUMERIC_FIELDS = [
  "version",
  "monthly_minimum_bill",
  "min_applicable_demand",
  "max_applicable_demand",
  "monthly_charges",
] as const;

/** Coerces the numeric-string values a Change/Function node may produce into real numbers before the SDK call. */
function normalizeTariffContentV2(tariff: Record<string, any>) {
  const normalized = { ...tariff };
  for (const field of TARIFF_CONTENT_V2_NUMERIC_FIELDS) {
    if (normalized[field] !== undefined) {
      normalized[field] = Number(normalized[field]);
    }
  }
  return normalized;
}

/** Dispatch and resume must be signed. The cloud signs them with Teslemetry's
 *  key, so it refuses them until that key is verified on the gateway (metadata
 *  `paired`); a local gateway signs them with Node-RED's own key. */
const PAIRED_COMMANDS = new Set(["dispatchBatteryPower", "resumeBatteryOperation"]);

export const NOT_PAIRED_MESSAGE =
  "This energy site is not paired: set a Local gateway for it on this node, or verify Teslemetry's key on the gateway from the Teslemetry console";

type CloudSite = ReturnType<Teslemetry["api"]["getEnergySite"]>;

/** The cloud's form of the commands a local gateway also takes. */
function cloudCommands(site: CloudSite): SiteCommands {
  return {
    backup: (percent) => site.setBackupReserve(percent),
    operation: (mode) => site.setOperationMode(mode),
    grid_import_export: (disallowGridCharging, exportRule) =>
      site.gridImportExport(exportRule, disallowGridCharging ?? undefined),
    dispatch_battery_power: (powerWatts, durationSeconds) =>
      site.dispatchBatteryPower(powerWatts, durationSeconds),
    resume_battery_operation: () => site.resumeBatteryOperation(),
  };
}

export interface TeslemetryEnergyCommandNodeDef extends NodeDef {
  teslemetryConfig: string;
  siteId: string;
  command: string;
  /** A Teslemetry Local Powerwall config node. Absent on nodes saved before the field existed. */
  localGateway?: string;
}

export interface TeslemetryEnergyCommandNode extends Node {
  teslemetry?: Teslemetry;
  siteId: string;
  command: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryEnergyCommandNode(
    this: TeslemetryEnergyCommandNode,
    config: TeslemetryEnergyCommandNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;

    node.teslemetry = instance.teslemetry;
    node.siteId = config.siteId;
    node.command = config.command;
    node.status({});

    const gateway = config.localGateway
      ? (RED.nodes.getNode(config.localGateway) as
          | TeslemetryLocalPowerwallNode
          | undefined)
      : undefined;

    node.on("input", async function (msg: Msg, send, done) {
      const siteId: string = node.siteId || (msg.siteId as string) || "";
      const command: string = node.command || (msg.command as string) || "";
      const site = node.teslemetry!.api.getEnergySite(Number(siteId));

      try {
        if (!siteId) {
          throw new Error("No Energy Site ID provided");
        }
        if (!command) {
          throw new Error("No Energy Command provided");
        }

        // A gateway only takes commands for its own site.
        const local =
          gateway?.siteId === String(siteId) ? gateway.local : undefined;
        let cloudCanRun = true;
        if (PAIRED_COMMANDS.has(command)) {
          // Read at message time: a products retry replaces the promise.
          const { energySites } = await instance.products;
          cloudCanRun = energySites[siteId]?.metadata.paired === true;
          if (!cloudCanRun && !local) {
            throw new Error(NOT_PAIRED_MESSAGE);
          }
        }

        node.status({ fill: "blue", shape: "dot", text: "running command" });

        const cloud = cloudCommands(site);
        let path: "local" | "cloud" = "cloud";
        /** Local first when this node has a gateway for the site, else the cloud. */
        const run = async <M extends keyof SiteCommands>(
          method: M,
          ...args: Parameters<SiteCommands[M]>
        ): Promise<{ response?: any }> => {
          if (!local) {
            return (cloud[method] as (...a: unknown[]) => Promise<any>)(...args);
          }
          const { sendLocalFirst } = await import("../localPowerwall");
          const sent = await sendLocalFirst(
            await local(),
            cloudCanRun ? cloud : null,
            method,
            args,
          );
          path = sent.path;
          if (sent.failover) {
            node.warn(
              `The local gateway did not answer (${sent.failover}); the command was sent through the cloud`,
            );
          }
          return sent.result;
        };

        let result: { response?: any };

        switch (command) {
          case "getLiveStatus":
            result = await site.getLiveStatus();
            break;
          case "getSiteInfo":
            result = await site.getSiteInfo();
            break;
          case "getTariff":
            result = { response: await site.getTariff() };
            break;
          case "setBackupReserve":
            validateParameters(msg, {
              percentage: {
                required: true,
                type: "number",
                min: 0,
                max: 100,
              },
            });
            result = await run("backup", msg.percentage);
            break;
          case "setOperationModeSelfConsumption":
            result = await run("operation", "self_consumption");
            break;
          case "setOperationModeBackup":
            result = await run("operation", "backup");
            break;
          case "setOperationModeAutonomous":
            result = await run("operation", "autonomous");
            break;
          case "setStormModeOn":
            result = await site.setStormMode(true);
            break;
          case "setStormModeOff":
            result = await site.setStormMode(false);
            break;
          case "gridExportEverything":
            result = await run("grid_import_export", null, "battery_ok");
            break;
          case "gridExportSolar":
            result = await run("grid_import_export", null, "pv_only");
            break;
          case "gridExportNothing":
            result = await run("grid_import_export", null, "never");
            break;
          case "setOffGridVehicleChargingReserve":
            validateParameters(msg, {
              percent: { required: true, type: "number", min: 0, max: 100 },
            });
            result = await site.setOffGridVehicleChargingReserve(msg.percent);
            break;
          case "setTimeOfUseSettings":
            validateParameters(msg, {
              tariffContentV2: { required: true, type: "object" },
            });
            validateParameters(msg.tariffContentV2, TARIFF_CONTENT_V2_RULES);
            result = await site.setTimeOfUseSettings({
              tou_settings: {
                tariff_content_v2: normalizeTariffContentV2(
                  msg.tariffContentV2,
                ),
              },
            });
            break;
          case "dispatchBatteryPower":
            validateParameters(msg, {
              powerWatts: {
                required: true,
                type: "number",
                min: -100000,
                max: 100000,
              },
              durationSeconds: {
                required: true,
                type: "number",
                integer: true,
                min: 1,
                max: 86400,
              },
            });
            result = await run(
              "dispatch_battery_power",
              Number(msg.powerWatts),
              Number(msg.durationSeconds),
            );
            break;
          case "resumeBatteryOperation":
            result = await run("resume_battery_operation");
            break;
          default:
            throw new Error(`Unknown command: ${command}`);
        }

        msg.payload = result.response;
        // With a gateway on this node, say which path ran the command.
        node.status(local ? { fill: "green", shape: "dot", text: path } : {});
        send(msg);
        done();
      } catch (err: unknown) {
        failInput(node, done, err);
      }
    });
  }
  RED.nodes.registerType(
    "teslemetry-energy-command",
    TeslemetryEnergyCommandNode,
  );
}
