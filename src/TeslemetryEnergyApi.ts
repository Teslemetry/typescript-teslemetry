import { Teslemetry } from "./Teslemetry";

export class TeslemetryEnergyApi {
  private root: Teslemetry;
  public siteId: number;

  constructor(root: Teslemetry, siteId: number) {
    this.root = root;
    this.siteId = siteId;
  }

  // Energy API methods will be implemented here
  // Examples:
  // - getSiteInfo()
  // - getLiveStatus()
  // - setStormMode()
  // - setOperation()
  // - etc.
}
