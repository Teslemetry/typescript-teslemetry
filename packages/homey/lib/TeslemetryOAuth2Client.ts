import { OAuth2Client, OAuth2Error, OAuth2Token } from "homey-oauth2app";

export default class TeslemetryOAuth2Client extends OAuth2Client {
  // Required OAuth2 configuration
  static API_URL = "https://api.teslemetry.com";
  static TOKEN_URL = "https://api.teslemetry.com/oauth/token";
  static AUTHORIZATION_URL = "https://teslemetry.com/connect";
  static SCOPES = [
    "user_data",
    "vehicle_device_data",
    "vehicle_cmds",
    "vehicle_charging_cmds",
    "energy_device_data",
    "energy_cmds",
  ];
  static REDIRECT_URL = "https://callback.athom.com/oauth2/callback";

  // Enable PKCE
  static PKCE = true;

  // Client configuration
  static CLIENT_ID = "homey";

  /**
   * Get a valid access token, refreshing if necessary
   * This is the main method you'll use with the Teslemetry SDK
   */
  async getAccessToken(): Promise<string> {
    const token = this.getToken();
    if (!token) {
      throw new OAuth2Error("No OAuth2 token available");
    }

    // Check if token needs refreshing
    if (this.onShouldRefreshToken({ token })) {
      try {
        const newToken = await this.refreshToken();
        return newToken.access_token;
      } catch (error) {
        throw new OAuth2Error("Failed to refresh token");
      }
    }

    return token.access_token;
  }

  /**
   * Handle API errors from Teslemetry
   */
  async onHandleNotOK({ body, status }: { body: any; status: number }) {
    if (body && body.error) {
      throw new OAuth2Error(body.error);
    }
    throw new OAuth2Error(
      `HTTP ${status}: ${body?.message || "Unknown error"}`,
    );
  }

  /**
   * Override to handle Teslemetry-specific token response
   */
  async onHandleGetTokenByCode({
    code,
    codeVerifier,
  }: {
    code: string;
    codeVerifier?: string;
  }) {
    return this.onRequestToken({
      grant_type: "authorization_code",
      client_id: (this.constructor as typeof TeslemetryOAuth2Client).CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: (this.constructor as typeof TeslemetryOAuth2Client)
        .REDIRECT_URL,
    });
  }

  /**
   * Override to handle Teslemetry-specific refresh token response
   */
  async onHandleRefreshToken({ refreshToken }: { refreshToken: string }) {
    return this.onRequestToken({
      grant_type: "refresh_token",
      client_id: (this.constructor as typeof TeslemetryOAuth2Client).CLIENT_ID,
      refresh_token: refreshToken,
    });
  }

  /**
   * Handle token requests to Teslemetry
   */
  async onRequestToken(body: any) {
    const response = await this._requestToken({
      body,
    });

    // Teslemetry returns tokens in a specific format
    if (response.access_token) {
      return {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_in: response.expires_in || 3600,
        token_type: response.token_type || "Bearer",
      };
    }

    throw new OAuth2Error("Invalid token response");
  }
}
