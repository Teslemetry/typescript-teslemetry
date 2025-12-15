"use strict";

import Homey from "homey";
import { Products, Teslemetry } from "@teslemetry/api";
import TeslemetryOAuth2Client from "./lib/TeslemetryOAuth2Client.js";

export default class TeslemetryApp extends Homey.App {
  public oauth!: TeslemetryOAuth2Client;
  public teslemetry?: Teslemetry;
  public products?: Products;
  private initializationPromise?: Promise<void>;

  /**
   * onInit is called when the app is initialized
   */
  async onInit() {
    this.log("Teslemetry App initializing...");

    this.oauth = new TeslemetryOAuth2Client(this);

    // Register API routes for testing (if needed for settings page)
    this.homey.api.on(
      "test_oauth",
      async (
        args: { sessionId?: string },
        callback: (err: Error | null, result?: boolean) => void,
      ) => {
        this.log("test_oauth");
        try {
          if (this.oauth.hasValidToken()) {
            await this.initializeTeslemetry();
            callback(null, true);
          } else {
            callback(null, false);
          }
        } catch (error) {
          callback(null, false);
        }
      },
    );

    // Listen for token updates
    this.on("oauth2:token_saved", () => {
      this.log("Token saved, re-initializing Teslemetry...");
      this.reinitialize();
    });

    // Initialize the Teslemetry SDK connection using OAuth2 token
    await this.initializeTeslemetry();
  }

  /**
   * Initialize Teslemetry connection with OAuth2 token
   */
  private async initializeTeslemetry(): Promise<void> {
    try {
      if (!this.oauth.hasValidToken()) {
        this.log("No OAuth2 token available. User needs to authenticate.");
        return;
      }

      if (this.teslemetry) {
        // Is there a condition here where testing is invalid?
        return;
      }

      this.log("Initializing Teslemetry with OAuth2 token...");
      this.teslemetry = new Teslemetry(this.oauth.getAccessToken);
      this.products = await this.teslemetry.createProducts();

      const vehicleCount = Object.keys(this.products.vehicles).length;
      const energyCount = Object.keys(this.products.energySites).length;

      this.log(
        `Teslemetry initialized successfully! Found ${vehicleCount} vehicles and ${energyCount} energy sites.`,
      );
    } catch (error) {
      this.error("Failed to initialize Teslemetry:", error);
      this.teslemetry = undefined;
      this.products = undefined;
      // Don't throw here to prevent app crash on init
    }
  }

  /**
   * Reinitialize the app when OAuth2 session changes
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

        // Initialize with new OAuth2 session
        await this.initializeTeslemetry();
      } catch (error) {
        this.error("Failed to reinitialize:", error);
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
   * Check if the app is properly configured with OAuth2
   */
  isConfigured(): boolean {
    return this.oauth.hasValidToken() && !!this.teslemetry && !!this.products;
  }
}
