import crypto from "crypto";
import type TeslemetryApp from "../app.js";

export interface OAuth2Token {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  expires_at?: number; // Calculated timestamp
}

export default class TeslemetryOAuth2Client {
  static TOKEN_URL = "https://api.teslemetry.com/oauth/token";
  static AUTHORIZATION_URL = "https://teslemetry.com/connect";
  static REDIRECT_URL = "https://callback.athom.com/oauth2/callback";
  static CLIENT_ID = "homey";
  static SETTINGS_KEY = "teslemetry_oauth2_token";

  private app: TeslemetryApp;
  private token: OAuth2Token | null = null;
  private requestPromise: Promise<OAuth2Token> | null = null;

  constructor(app: TeslemetryApp) {
    this.app = app;
    this.loadToken();
  }

  private loadToken() {
    const data = this.app.homey.settings.get(
      TeslemetryOAuth2Client.SETTINGS_KEY,
    );
    if (data) {
      this.token = data;
    }
  }

  private saveToken(token: OAuth2Token) {
    // Calculate expires_at if not present
    if (!token.expires_at) {
      token.expires_at = Date.now() + token.expires_in * 1000;
    }
    this.token = token;
    this.app.homey.settings.set(TeslemetryOAuth2Client.SETTINGS_KEY, token);
    this.app.homey.emit("oauth2:token_saved", token);
  }

  /**
   * Generates PKCE code verifier and challenge
   */
  generatePKCE() {
    const codeVerifier = this.base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = this.base64URLEncode(
      crypto.createHash("sha256").update(codeVerifier).digest(),
    );
    return { codeVerifier, codeChallenge };
  }

  private base64URLEncode(buffer: Buffer) {
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: TeslemetryOAuth2Client.CLIENT_ID,
      redirect_uri: TeslemetryOAuth2Client.REDIRECT_URL,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${TeslemetryOAuth2Client.AUTHORIZATION_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<OAuth2Token> {
    const body = {
      grant_type: "authorization_code",
      client_id: TeslemetryOAuth2Client.CLIENT_ID,
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: TeslemetryOAuth2Client.REDIRECT_URL,
    };

    return this.requestToken(body);
  }

  /**
   * Refresh the token using the refresh token
   */
  async refreshToken(): Promise<OAuth2Token> {
    if (!this.token?.refresh_token) {
      throw new Error("No refresh token available");
    }
    const body = {
      grant_type: "refresh_token",
      client_id: TeslemetryOAuth2Client.CLIENT_ID,
      refresh_token: this.token.refresh_token,
    };
    return this.requestToken(body);
  }

  /**
   * Return the existing token request or create a new one
   */
  private async requestToken(body: any): Promise<OAuth2Token> {
    this.requestPromise ??= this._requestToken(body);
    return this.requestPromise.finally(() => {
      this.requestPromise = null;
    });
  }

  private async _requestToken(body: any): Promise<OAuth2Token> {
    const response = await fetch(TeslemetryOAuth2Client.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (!response.ok) {
      if (data.error === "invalid_refresh_token") {
        this.clearToken();
      }
      if (data.error === "invalid_token") {
        this.refreshToken();
      }
      this.app.handleApiError(data);
    }

    if (!data.access_token) {
      throw new Error("Invalid token response from server");
    }

    const token: OAuth2Token = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
      token_type: data.token_type || "Bearer",
      expires_at: Date.now() + data.expires_in * 1000,
    };

    this.saveToken(token);
    return token;
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * Bound to instance for passing as callback.
   */
  getAccessToken = async (): Promise<string> => {
    if (!this.token) {
      throw new Error("No OAuth2 token available");
    }

    // Refresh if expiring in less than a minute
    if (this.token.expires_at && Date.now() + 60_000 > this.token.expires_at) {
      await this.refreshToken();
    }

    return this.token.access_token;
  };

  hasValidToken(): boolean {
    return !!this.token;
  }

  clearToken() {
    this.app.error("OAuth credentials are being removed");
    this.token = null;
    this.app.homey.settings.unset(TeslemetryOAuth2Client.SETTINGS_KEY);
  }
}
