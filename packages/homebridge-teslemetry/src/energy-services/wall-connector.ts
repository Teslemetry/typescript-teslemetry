/**
 * Wall Connector Service
 *
 * Per-DIN fault and vehicle-connected contact sensors for each Tesla Wall
 * Connector at the site, driven by live_status. No power/watts characteristic
 * is exposed - there is no honest standard HomeKit surface for that.
 */

import type { PlatformAccessory, Service } from "homebridge";
import type { TeslemetryPlatform } from "../platform.js";
import type { EnergyDetails } from "@teslemetry/api";

interface ConnectorServices {
  fault: Service;
  connected: Service;
}

interface WallConnectorStatus {
  din: string;
  vin?: string;
  wall_connector_state: number;
  wall_connector_fault_state?: number;
}

export class WallConnectorService {
  private readonly cleanupFunctions: Array<() => void> = [];
  private readonly connectors = new Map<string, ConnectorServices>();

  constructor(
    private readonly platform: TeslemetryPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly site: EnergyDetails,
  ) {
    // Per-DIN services from a prior run persist in Homebridge's accessory
    // cache, but `connectors` was otherwise only ever populated by
    // live_status - hydrate it from any already-cached services up front so
    // a setStreamFault() call this run (including one that already happened
    // before this accessory was constructed) reaches them too.
    this.hydrateFromCache();
    if (this.platform.streamFault) {
      this.setStreamFault(true);
    }

    const listener = (data: any) => this.handleLiveStatus(data);
    this.site.api.on("liveStatus", listener);
    this.cleanupFunctions.push(() => this.site.api.off("liveStatus", listener));
  }

  private hydrateFromCache(): void {
    const faultPrefix = "wall-connector-fault-";
    const connectedPrefix = "wall-connector-connected-";

    for (const service of this.accessory.services) {
      if (service.UUID !== this.platform.Service.ContactSensor.UUID) continue;
      const subtype = service.subtype;
      if (!subtype) continue;

      const din = subtype.startsWith(faultPrefix)
        ? subtype.slice(faultPrefix.length)
        : subtype.startsWith(connectedPrefix)
          ? subtype.slice(connectedPrefix.length)
          : undefined;
      if (din === undefined || this.connectors.has(din)) continue;

      this.connectors.set(din, this.createConnectorServices(din));
    }
  }

  private handleLiveStatus(data: any): void {
    const connectors = data?.response?.wall_connectors;
    if (!Array.isArray(connectors)) return;

    for (const connector of connectors as WallConnectorStatus[]) {
      if (!connector?.din) continue;
      this.updateConnector(connector);
    }
  }

  private updateConnector(connector: WallConnectorStatus): void {
    let services = this.connectors.get(connector.din);
    if (!services) {
      services = this.createConnectorServices(connector.din);
      this.connectors.set(connector.din, services);
    }

    const { ContactSensorState } = this.platform.Characteristic;

    // Fault code 0 clears the fault contact; any nonzero code sets it.
    const faultCode = connector.wall_connector_fault_state ?? 0;
    services.fault.updateCharacteristic(
      ContactSensorState,
      faultCode === 0 ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED,
    );

    // wall_connector_state 2 = "not plugged in"; every other value means a
    // cable is seated, whether or not it is actively charging.
    const isConnected = connector.wall_connector_state !== 2;
    services.connected.updateCharacteristic(
      ContactSensorState,
      isConnected ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED,
    );

    // A real reading just arrived for this DIN - clear any fault a prior
    // terminal stream failure left set (see setStreamFault()).
    this.applyStreamFault(services, false);
  }

  /**
   * Reflect terminal stream health. Only DINs already discovered (i.e. with
   * services created) can be marked - a DIN never seen has no sensors to
   * fault yet, matching the same lazy-creation contract as everything else
   * here.
   */
  setStreamFault(faulted: boolean): void {
    for (const services of this.connectors.values()) {
      this.applyStreamFault(services, faulted);
    }
  }

  private applyStreamFault(services: ConnectorServices, faulted: boolean): void {
    const { StatusFault } = this.platform.Characteristic;
    const value = faulted ? StatusFault.GENERAL_FAULT : StatusFault.NO_FAULT;
    services.fault.updateCharacteristic(StatusFault, value);
    services.connected.updateCharacteristic(StatusFault, value);
  }

  private createConnectorServices(din: string): ConnectorServices {
    const faultSubType = `wall-connector-fault-${din}`;
    const faultName = this.getDisplayName(`Wall Connector ${din} Fault`);
    const fault =
      this.accessory.getServiceById(this.platform.Service.ContactSensor, faultSubType) ||
      this.accessory.addService(this.platform.Service.ContactSensor, faultName, faultSubType);
    fault.setCharacteristic(this.platform.Characteristic.Name, faultName);

    const connectedSubType = `wall-connector-connected-${din}`;
    const connectedName = this.getDisplayName(`Wall Connector ${din} Vehicle Connected`);
    const connected =
      this.accessory.getServiceById(this.platform.Service.ContactSensor, connectedSubType) ||
      this.accessory.addService(this.platform.Service.ContactSensor, connectedName, connectedSubType);
    connected.setCharacteristic(this.platform.Characteristic.Name, connectedName);

    return { fault, connected };
  }

  private getDisplayName(serviceName: string): string {
    if (this.platform.config.prefixName !== false) {
      return `${this.site.name} ${serviceName}`;
    }
    return serviceName;
  }

  destroy(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions.length = 0;
    this.connectors.clear();
  }
}
