/**
 * Configuration types and constants for Homebridge Teslemetry platform
 */

/**
 * Platform configuration interface
 */
export interface TeslemetryPlatformConfig {
  /**
   * Platform identifier (must be "Teslemetry")
   */
  platform: string;

  /**
   * Optional platform name for display
   */
  name?: string;

  /**
   * Teslemetry API access token
   * Create one at https://teslemetry.com
   */
  accessToken: string;

  /**
   * Latitude for Homelink activation
   * Required if using Homelink service
   */
  latitude?: number;

  /**
   * Longitude for Homelink activation
   * Required if using Homelink service
   */
  longitude?: number;

  /**
   * List of vehicle VINs to ignore
   */
  ignoreVehicles?: string[];

  /**
   * List of energy site IDs to ignore
   */
  ignoreEnergySites?: number[];

  /**
   * Prefix accessory names with vehicle/site name
   * @default true
   */
  prefixName?: boolean;
}

/**
 * Plugin constants
 */
export const PLATFORM_NAME = "Teslemetry";
export const PLUGIN_NAME = "homebridge-teslemetry";
