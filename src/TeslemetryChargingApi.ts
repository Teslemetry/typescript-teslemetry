import { Teslemetry } from "./Teslemetry";
import {
  getApi1DcChargingHistory,
  getApi1DcChargingInvoiceById,
  getApi1DcChargingSessions,
  getApi1DxChargingHistory,
} from "./client";
import {
  GetApi1DcChargingHistoryData,
  GetApi1DcChargingInvoiceByIdData,
  GetApi1DcChargingSessionsData,
  GetApi1DxChargingHistoryData,
} from "./client/types.gen";

export class TeslemetryChargingApi {
  private root: Teslemetry;

  constructor(root: Teslemetry) {
    this.root = root;
  }

  /**
   * Returns the paginated charging history.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getChargingHistory(
    query?: GetApi1DcChargingHistoryData["query"],
  ) {
    return getApi1DcChargingHistory({ query, client: this.root.client });
  }

  /**
   * Returns an invoice for a charging session.
   * @param path
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getInvoice(id: string) {
    return getApi1DcChargingInvoiceById({
      path: { id },
      client: this.root.client,
    });
  }

  /**
   * Returns the paginated charging sessions.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getChargingSessions(
    query?: GetApi1DcChargingSessionsData["query"],
  ) {
    return getApi1DcChargingSessions({ query, client: this.root.client });
  }

  /**
   * Returns the paginated charging history.
   * @param query
   * @returns A promise that resolves to a data object containing the response.
   */
  public async getDxChargingHistory(
    query: GetApi1DxChargingHistoryData["query"],
  ) {
    return getApi1DxChargingHistory({ query, client: this.root.client });
  }
}
