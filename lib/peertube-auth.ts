/**
 * PeerTube OAuth authentication helpers.
 *
 * PeerTube uses the Resource Owner Password Credentials grant (ROPC):
 * 1. Fetch OAuth client credentials from /api/v1/oauth-clients/local
 * 2. Exchange email+password for access/refresh tokens via /api/v1/users/token
 * 3. Refresh expired tokens via the same endpoint with grant_type=refresh_token
 */

export interface PeerTubeOAuthClient {
  client_id: string;
  client_secret: string;
}

export interface PeerTubeTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
}

/**
 * Fetch the local OAuth client credentials for a PeerTube instance.
 * These are public credentials that identify this application to the instance.
 */
export async function fetchOAuthClient(
  baseUrl: string
): Promise<PeerTubeOAuthClient> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/oauth-clients/local`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch OAuth client: HTTP ${res.status}`);
  }
  const data = (await res.json()) as PeerTubeOAuthClient;
  if (!data.client_id || !data.client_secret) {
    throw new Error("Invalid OAuth client response from PeerTube instance");
  }
  return data;
}

/**
 * Authenticate a user against a PeerTube instance using email/password.
 * Returns access token, refresh token and expiry info.
 */
export async function authenticatePeerTube(
  baseUrl: string,
  usernameOrEmail: string,
  password: string
): Promise<PeerTubeTokenResponse> {
  const oauthClient = await fetchOAuthClient(baseUrl);
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/users/token`;

  const body = new URLSearchParams({
    client_id: oauthClient.client_id,
    client_secret: oauthClient.client_secret,
    grant_type: "password",
    response_type: "code",
    username: usernameOrEmail,
    password,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new Error("invalid_credentials");
    }
    throw new Error(`PeerTube authentication failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as PeerTubeTokenResponse;
  if (!data.access_token) {
    throw new Error("No access token in PeerTube response");
  }
  return data;
}

/**
 * Refresh an expired PeerTube access token using a refresh token.
 */
export async function refreshPeerTubeToken(
  baseUrl: string,
  refreshToken: string
): Promise<PeerTubeTokenResponse> {
  const oauthClient = await fetchOAuthClient(baseUrl);
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/users/token`;

  const body = new URLSearchParams({
    client_id: oauthClient.client_id,
    client_secret: oauthClient.client_secret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as PeerTubeTokenResponse;
  if (!data.access_token) {
    throw new Error("No access token in PeerTube refresh response");
  }
  return data;
}
