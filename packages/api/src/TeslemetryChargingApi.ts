import { EventEmitter } from "events";
import { Teslemetry } from "./Teslemetry.js";
import {
  getApi1DxChargingHistory,
  getApi1DxChargingInvoiceById,
  getApi1DxChargingSessions,
} from "./client/index.js";
import {
  GetApi1DxChargingHistoryData,
  GetApi1DxChargingSessionsData,
} from "./client/types.gen.js";

// Interface for event type safety
type TeslemetryChargingEventMap = {
  chargingHistory: unknown;
  invoice: unknown;
  chargingSessions: unknown;
};

// TypeScript interface for event type safety
export declare interface TeslemetryChargingApi {
  on<K extends keyof TeslemetryChargingEventMap>(
    event: K,
    listener: (data: TeslemetryChargingEventMap[K]) => void,
  ): this;
  off<K extends keyof TeslemetryChargingEventMap>(
    event: K,
    listener: (data: TeslemetryChargingEventMap[K]) => void,
  ): this;
  once<K extends keyof TeslemetryChargingEventMap>(
    event: K,
    listener: (data: TeslemetryChargingEventMap[K]) => void,
  ): this;
  emit<K extends keyof TeslemetryChargingEventMap>(
    event: K,
    data: TeslemetryChargingEventMap[K],
  ): boolean;
}

export class TeslemetryChargingApi extends EventEmitter {
  private root: Teslemetry;

  constructor(root: Teslemetry) {
    super();
    this.root = root;
  }

  /**
   * Returns the paginated charging history.
   * @param query Query parameters for filtering charging history
   * @param query.endTime End time of the windows to download charging history for (i.e "2023-07-28T11:43:45-07:00")
   * @param query.pageNo Current page number
   * @param query.pageSize Number of records per page
   * @param query.sortBy Field to sort by
   * @param query.sortOrder Sort order (ASC or DESC)
   * @param query.startTime Start time of the windows to download charging history for (i.e "2023-07-27T11:43:45-07:00")
   * @param query.vin Vehicle Identification Number (VIN) of the selected vehicle
   * @return Promise to an object with response containing paginated charging history records
   */
  public async getChargingHistory(
    query: GetApi1DxChargingHistoryData["query"],
  ) {
    const { data } = await getApi1DxChargingHistory({
      query,
      client: this.root.client,
    });
    this.emit("chargingHistory", data);
    return data;
  }

  /**
   * Returns a charging invoice pdf for an event from charging history.
   * @param id The charging session ID
   * @return Promise to an object with response containing charging invoice PDF URL
   */
  public async getInvoice(id: string) {
    const { data } = await getApi1DxChargingInvoiceById({
      path: { id },
      client: this.root.client,
    });
    this.emit("invoice", data);
    return data;
  }

  /**
   * Returns the charging session information including pricing and energy data. This endpoint is only available for business accounts that own a fleet of vehicles.
   * @param query Query parameters for filtering charging sessions
   * @param query.date_from Start date of the windows to download charging sessions
   * @param query.date_to End date of the windows to download charging sessions
   * @param query.limit Number of entities to be returned
   * @param query.offset offset
   * @param query.vin Vehicle Identification Number (VIN) of the selected vehicle
   * @return Promise to an object with response containing charging session information with pricing and energy data
   */
  public async getChargingSessions(
    query?: GetApi1DxChargingSessionsData["query"],
  ) {
    const { data } = await getApi1DxChargingSessions({
      query,
      client: this.root.client,
    });
    this.emit("chargingSessions", data);
    return data;
  }
}
