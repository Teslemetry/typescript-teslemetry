import Homey from "homey";
import type TeslemetryApp from "../app.js";

export default class TeslemetryDriver extends Homey.Driver {
  async onPair(session: any) {
    let codeVerifier: string;
    const app = this.homey.app as TeslemetryApp;

    session.setHandler("showView", async (viewId: string) => {
      if (viewId === "login_oauth2") {
        // Check if we already have a valid OAuth token
        if (app.oauth.hasValidToken()) {
          this.log("Valid OAuth token already exists, skipping OAuth flow");
          session.emit("authorized");
          return;
        }

        const pkce = app.oauth.generatePKCE();
        codeVerifier = pkce.codeVerifier;
        const state = Math.random().toString(36).substring(7);
        const url = app.oauth.getAuthorizationUrl(state, pkce.codeChallenge);

        const callback = await this.homey.cloud.createOAuth2Callback(url);

        callback
          .on("url", (url: string) => {
            session.emit("url", url);
          })
          .on("code", async (code: string | Error) => {
            if (code instanceof Error) {
              session.emit("error", code.message || "Unknown error");
              return;
            }

            try {
              await app.oauth.exchangeCodeForToken(code, codeVerifier);
              session.emit("authorized");
            } catch (err: any) {
              this.error(err);
              session.emit("error", err.message || err.toString());
            }
          });
      }
    });

    session.setHandler("list_devices", async () => {
      return (this as any).onPairListDevices();
    });
  }
}
