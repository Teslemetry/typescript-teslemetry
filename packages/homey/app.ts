"use strict";

import { OAuth2App } from "homey-oauth2app";
import { Products, Teslemetry } from "@teslemetry/api";
import TeslemetryOAuth2Client from "./lib/TeslemetryOAuth2Client.js";

export default class TeslemetryApp extends OAuth2App {
  // OAuth2App configuration
  static OAUTH2_CLIENT = TeslemetryOAuth2Client;
  static OAUTH2_DEBUG = true;
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ["vehicle", "powerwall", "wall-connector"];

  teslemetry?: Teslemetry;
  products?: Products;
  private initializationPromise?: Promise<void>;

  /**
   * onOAuth2Init is called when the OAuth2App is initialized
   */
  async onOAuth2Init() {
    this.homey.log("Teslemetry OAuth2 app initializing...");

    // Register API routes for testing (if needed for settings page)
    this.homey.api.on(
      "test_oauth",
      async (
        args: { sessionId?: string },
        callback: (err: Error | null, result?: boolean) => void,
      ) => {
        try {
          const sessionId =
            args.sessionId || this.getFirstSavedOAuth2SessionId();
          if (!sessionId) {
            callback(new Error("No OAuth2 session available"));
            return;
          }

          const client = this.getOAuth2Client({ sessionId });

          // Test with Teslemetry SDK using access token
          const accessToken = await client.getAccessToken();
          const teslemetry = new Teslemetry(accessToken);
          const result = await teslemetry.api.test();
          callback(null, !!result.response);
        } catch (error) {
          this.homey.error("OAuth test failed:", error);
          callback(null, false);
        }
      },
    );

    // Initialize the Teslemetry SDK connection using OAuth2 token
    await this.initializeTeslemetry();
  }

  /**
   * Initialize Teslemetry connection with OAuth2 token
   */
  private async initializeTeslemetry(): Promise<void> {
    try {
      // Get the first available OAuth2 session
      const sessionId = this.getFirstSavedOAuth2SessionId();
      if (!sessionId) {
        this.homey.log(
          "No OAuth2 session available. User needs to authenticate.",
        );
        return;
      }

      const client = this.getOAuth2Client({ sessionId });

      this.homey.log("Initializing Teslemetry with OAuth2 token...");
      const accessToken = await client.getAccessToken();
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
   * Called when OAuth2 session is created or updated
   */
  async onOAuth2Saved({ sessionId }: { sessionId: string }) {
    this.homey.log(`OAuth2 session saved: ${sessionId}`);
    await this.reinitialize();
  }

  /**
   * Called when OAuth2 session is deleted
   */
  async onOAuth2Deleted({ sessionId }: { sessionId: string }) {
    this.homey.log(`OAuth2 session deleted: ${sessionId}`);

    // Clean up Teslemetry connection
    if (this.teslemetry) {
      this.teslemetry.sse.close();
      this.teslemetry = undefined;
      this.products = undefined;
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
   * Check if the app is properly configured with OAuth2
   */
  isConfigured(): boolean {
    const sessionId = this.getFirstSavedOAuth2SessionId();
    if (!sessionId) return false;

    const session = this.getSavedOAuth2SessionBySessionId(sessionId);
    return !!(session && session.token && this.teslemetry && this.products);
  }

  /**
   * Get OAuth2 client for API calls
   */
  getOAuth2Client({
    sessionId,
  }: { sessionId?: string } = {}): TeslemetryOAuth2Client {
    const actualSessionId = sessionId || this.getFirstSavedOAuth2SessionId();
    if (!actualSessionId) {
      throw new Error("No OAuth2 session available");
    }
    return super.getOAuth2Client({
      sessionId: actualSessionId,
    }) as TeslemetryOAuth2Client;
  }

  /**
   * Get a token function for the Teslemetry SDK
   */
  getTokenFunction(sessionId?: string): () => Promise<string> {
    const client = this.getOAuth2Client({ sessionId });
    return () => client.getAccessToken();
  }

  async onUninit() {
    this.homey.log("Teslemetry OAuth2 app shutting down...");

    // Wait for any pending initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    // Close SSE connection
    this.teslemetry?.sse.close();
  }
}
