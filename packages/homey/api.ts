import type TeslemetryApp from "./app.js";

interface ApiContext {
  homey: {
    app: TeslemetryApp;
  };
}

export async function getOAuthStatus({ homey }: ApiContext) {
  return {
    connected: homey.app.oauth.hasValidToken(),
  };
}

export async function deleteOAuthToken({ homey }: ApiContext) {
  homey.app.cleanup();
  homey.app.oauth.clearToken();

  return { success: true };
}

export default {
  getOAuthStatus,
  deleteOAuthToken,
};
