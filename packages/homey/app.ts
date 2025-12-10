"use strict";

import Homey from "homey";
import { Products, Teslemetry } from "@teslemetry/api";

export default class TeslemetryApp extends Homey.App {
  teslemetry?: Teslemetry;
  products?: Products;
  private initializationPromise?: Promise<void>;

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.homey.log("Teslemetry app initializing...");

    // Register API routes for settings page
    this.homey.api.on(
      "test",
      (
        args: { token: string },
        callback: (err: Error | null, result?: boolean) => void,
      ) => {
        const teslemetry = new Teslemetry(args.token);
        teslemetry.api
          .test()
          .then(({ response }) => {
            callback(null, response);
          })
          .catch((error) => {
            callback(null, false);
          });
      },
    );

    // Listen for settings changes
    this.homey.settings.on("set", (key: string) => {
      if (key === "access_token") {
        this.homey.log("Access token updated, reinitializing...");
        this.reinitialize();
      }
    });

    // Initialize the Teslemetry connection
    await this.initializeTeslemetry();
  }

  /**
   * Initialize Teslemetry connection with current access token
   */
  private async initializeTeslemetry(): Promise<void> {
    try {
      const accessToken = this.homey.settings.get("access_token") as string;

      if (!accessToken) {
        this.homey.log(
          "No access token configured. Please configure in app settings.",
        );
        return;
      }

      this.homey.log("Initializing Teslemetry with access token...");
      this.teslemetry = new Teslemetry(accessToken);
      this.products = await this.teslemetry.createProducts();

      const vehicleCount = Object.keys(this.products.vehicles).length;
      const energyCount = Object.keys(this.products.energySites).length;

      this.homey.log(
        `Teslemetry initialized successfully! Found ${vehicleCount} vehicles and ${energyCount} energy sites.`,
      );
    } catch (error) {
      this.homey.error("Failed to initialize Teslemetry:", error);
      this.teslemetry = undefined;
      this.products = undefined;
      throw error;
    }
  }

  /**
   * Reinitialize the app when settings change
   */
  private async reinitialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Clean up existing connection
        if (this.teslemetry) {
          this.teslemetry.sse.close();
          this.teslemetry = undefined;
          this.products = undefined;
        }

        // Initialize with new settings
        await this.initializeTeslemetry();
      } catch (error) {
        this.homey.error("Failed to reinitialize:", error);
      } finally {
        this.initializationPromise = undefined;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Get the current Teslemetry instance, initializing if needed
   */
  async getTeslemetry(): Promise<Teslemetry | undefined> {
    if (!this.teslemetry) {
      await this.initializeTeslemetry();
    }
    return this.teslemetry;
  }

  /**
   * Get the current Products instance, initializing if needed
   */
  async getProducts(): Promise<Products | undefined> {
    if (!this.products) {
      await this.initializeTeslemetry();
    }
    return this.products;
  }

  /**
   * Check if the app is properly configured
   */
  isConfigured(): boolean {
    const accessToken = this.homey.settings.get("access_token") as string;
    return !!accessToken && !!this.teslemetry && !!this.products;
  }

  async onUninit() {
    this.homey.log("Teslemetry app shutting down...");

    // Wait for any pending initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // Close SSE connection
    this.teslemetry?.sse.close();
  }
}
