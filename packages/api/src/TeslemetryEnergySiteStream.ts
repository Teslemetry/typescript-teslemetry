import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import type {
  SseLiveStatus,
  SseSiteInfo,
  SseTariffContentV2,
  SseEnergyTotals,
} from "./const.js";
import { Logger } from "./logger.js";
import { composeEnergySiteInfo, EnergySiteCache } from "./TeslemetryStream.js";

type TeslemetryEnergySiteStreamEventMap = {
  live_status: SseLiveStatus;
  site_info: SseSiteInfo;
  tariff_content_v2: SseTariffContentV2;
  energy_totals: SseEnergyTotals;
};

export declare interface TeslemetryEnergySiteStream {
  on<K extends keyof TeslemetryEnergySiteStreamEventMap>(
    event: K,
    listener: (data: TeslemetryEnergySiteStreamEventMap[K]) => void,
  ): this;

  once<K extends keyof TeslemetryEnergySiteStreamEventMap>(
    event: K,
    listener: (data: TeslemetryEnergySiteStreamEventMap[K]) => void,
  ): this;

  off<K extends keyof TeslemetryEnergySiteStreamEventMap>(
    event: K,
    listener: (data: TeslemetryEnergySiteStreamEventMap[K]) => void,
  ): this;

  emit<K extends keyof TeslemetryEnergySiteStreamEventMap>(
    event: K,
    data: TeslemetryEnergySiteStreamEventMap[K],
  ): boolean;
}

export class TeslemetryEnergySiteStream extends EventEmitter {
  private root: Teslemetry;
  public id: string;
  public logger: Logger;

  constructor(root: Teslemetry, id: string) {
    if (root.sse.energySites.has(id)) {
      throw new Error("Energy site already exists");
    }
    super();
    this.root = root;
    this.id = id;
    this.logger = root.sse.logger;

    root.sse.energySites.set(id, this);
  }

  get cache(): EnergySiteCache {
    return this.root.sse.energyCache[this.id] ?? {};
  }

  /** Merges the cached slim `site_info` with the last `tariff_content_v2`
   *  piece into a whole-document view. `undefined` until `site_info` has
   *  been received at least once. */
  get siteInfoDocument():
    | (Record<string, unknown> & { tariff_content_v2?: Record<string, unknown> | null })
    | undefined {
    return composeEnergySiteInfo(this.cache);
  }

  public on<K extends keyof TeslemetryEnergySiteStreamEventMap>(
    event: K,
    listener: (data: TeslemetryEnergySiteStreamEventMap[K]) => void,
  ): this {
    // Register before replaying: see the matching comment in
    // TeslemetryStream.on() - once() wraps the listener in a self-removing
    // shim that must already be registered for its self-removal to work,
    // or it becomes a permanently inert leftover listener.
    super.on(event, listener);
    this.root.sse.sendEnergyCache(this.id, event, listener);
    return this;
  }

  public stop(): void {
    this.removeAllListeners();
  }
}
