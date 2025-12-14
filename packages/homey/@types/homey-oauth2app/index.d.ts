declare module 'homey-oauth2app' {
  import { App, Driver, Device } from 'homey';

  export interface OAuth2Token {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  }

  export interface OAuth2Session {
    sessionId: string;
    configId?: string;
    token: OAuth2Token;
  }

  export class OAuth2Error extends Error {
    constructor(message: string, statusCode?: number);
    statusCode?: number;
  }

  export interface OAuth2ClientConfig {
    clientId?: string;
    clientSecret?: string;
    apiUrl?: string;
    tokenUrl?: string;
    authorizationUrl?: string;
    redirectUrl?: string;
    scopes?: string[];
    allowMultiSession?: boolean;
  }

  export interface OAuth2RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path?: string;
    query?: Record<string, any>;
    json?: any;
    body?: any;
    headers?: Record<string, string>;
  }

  export class OAuth2Client {
    static API_URL: string;
    static TOKEN_URL: string;
    static AUTHORIZATION_URL: string;
    static SCOPES: string[];
    static REDIRECT_URL: string;
    static CLIENT_ID: string;
    static CLIENT_SECRET?: string;
    static TOKEN: typeof OAuth2Token;
    static PKCE: boolean;

    constructor(config: OAuth2ClientConfig);

    // Token management
    getToken(): OAuth2Token | null;
    setToken(token: OAuth2Token): void;
    refreshToken(): Promise<OAuth2Token>;
    save(): Promise<void>;
    destroy(): Promise<void>;

    // HTTP methods
    get(options: OAuth2RequestOptions): Promise<any>;
    post(options: OAuth2RequestOptions): Promise<any>;
    put(options: OAuth2RequestOptions): Promise<any>;
    delete(options: OAuth2RequestOptions): Promise<any>;
    patch(options: OAuth2RequestOptions): Promise<any>;

    // Authorization
    getAuthorizationUrl(): string;
    getTokenByCode(code: string, codeVerifier?: string): Promise<OAuth2Token>;

    // Hooks (meant to be overridden)
    onHandleNotOK(args: { body: any; status: number; statusText: string }): Promise<void>;
    onHandleResult(args: { result: any }): Promise<any>;
    onHandleGetTokenByCode(args: { code: string; codeVerifier?: string }): Promise<OAuth2Token>;
    onHandleRefreshToken(args: { refreshToken: string }): Promise<OAuth2Token>;
    onRequestToken(body: any): Promise<OAuth2Token>;
    onRequestError(args: { error: Error }): Promise<void>;
    onShouldRefreshToken(args: { token: OAuth2Token }): boolean;

    // Internal methods
    _requestToken(args: { body: any }): Promise<OAuth2Token>;
  }

  export class OAuth2App extends App {
    static OAUTH2_DEBUG: boolean;
    static OAUTH2_CLIENT: typeof OAuth2Client;
    static OAUTH2_MULTI_SESSION: boolean;
    static OAUTH2_DRIVERS: string[];

    // Lifecycle
    onInit(): Promise<void>;
    onOAuth2Init(): Promise<void>;

    // Debug
    enableOAuth2Debug(): void;
    disableOAuth2Debug(): void;

    // Config management
    setOAuth2Config(config: {
      configId?: string;
      client?: typeof OAuth2Client;
      clientId?: string;
      clientSecret?: string;
      apiUrl?: string;
      token?: string;
      tokenUrl?: string;
      authorizationUrl?: string;
      redirectUrl?: string;
      scopes?: string[];
      allowMultiSession?: boolean;
    }): void;

    hasConfig(args?: { configId?: string }): boolean;
    checkHasConfig(args?: { configId?: string }): void;
    getConfig(args?: { configId?: string }): any;

    // Client management
    hasOAuth2Client(args?: { sessionId?: string; configId?: string }): boolean;
    checkHasOAuth2Client(args?: { sessionId?: string; configId?: string }): void;
    createOAuth2Client(args?: { sessionId?: string; configId?: string }): OAuth2Client;
    deleteOAuth2Client(args?: { sessionId?: string; configId?: string }): void;
    getOAuth2Client(args?: { sessionId?: string; configId?: string }): OAuth2Client;
    saveOAuth2Client(args: { configId?: string; sessionId: string; client: OAuth2Client }): void;

    // Session management
    getSavedOAuth2Sessions(): Record<string, OAuth2Session>;
    getSavedOAuth2SessionBySessionId(sessionId: string): OAuth2Session | null;
    getFirstSavedOAuth2SessionId(): string | null;
    getFirstSavedOAuth2Client(): OAuth2Client | null;
    tryCleanSession(args: { sessionId: string; configId?: string }): void;

    // Hooks
    onOAuth2Saved(args: { sessionId: string; configId?: string }): Promise<void>;
    onOAuth2Deleted(args: { sessionId: string; configId?: string }): Promise<void>;
    onShouldDeleteSession(args: { sessionId: string; configId?: string }): Promise<boolean>;
    getOAuth2Devices(args: { sessionId: string; configId?: string }): Promise<OAuth2Device[]>;
  }

  export class OAuth2Driver extends Driver {
    // Lifecycle
    onOAuth2Init(): Promise<void>;

    // Pairing
    onPairListDevices(args: { oAuth2Client: OAuth2Client }): Promise<any[]>;

    // OAuth2 helpers
    getOAuth2Client(): OAuth2Client;
  }

  export class OAuth2Device extends Device {
    oAuth2Client: OAuth2Client;

    // Lifecycle
    onOAuth2Init(): Promise<void>;
    onOAuth2Deleted(): Promise<void>;
    onOAuth2Uninit(): Promise<void>;

    // OAuth2 helpers
    getOAuth2Client(): OAuth2Client;
  }

  export class OAuth2Util {
    static generateRandomId(): string;
    static generateCodeChallenge(codeVerifier: string): string;
    static generateCodeVerifier(): string;
  }
}
