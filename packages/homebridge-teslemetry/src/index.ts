/**
 * Homebridge Teslemetry Platform Plugin
 *
 * This plugin provides real-time streaming integration with Tesla vehicles and energy sites
 * through the Teslemetry API.
 */

import type { API } from "homebridge";
import { TeslemetryPlatform } from "./platform.js";
import { PLATFORM_NAME, PLUGIN_NAME } from "./settings.js";

/**
 * Plugin registration function
 * This is called by Homebridge during startup to register the platform
 */
export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, TeslemetryPlatform);
};
