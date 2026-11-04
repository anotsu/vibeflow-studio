import type {
  CoolifyApplication,
  CoolifyDeployment,
  CoolifyEnvVar,
} from '@/types';

/**
 * Error thrown when a Coolify API request fails.
 */
export class CoolifyApiError extends Error {
  public readonly status: number;
  public readonly endpoint: string;
  public readonly responseBody: string;

  constructor(message: string, status: number, endpoint: string, responseBody: string) {
    super(message);
    this.name = 'CoolifyApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.responseBody = responseBody;
  }
}

/**
 * Service class for interacting with the Coolify REST API.
 *
 * Provides methods for managing applications, deployments, environment variables,
 * and performing health checks against a self-hosted Coolify instance.
 */
export class CoolifyService {
  private readonly serverUrl: string;
  private readonly apiToken: string;

  constructor(serverUrl: string, apiToken: string) {
    // Strip trailing slash for consistency
    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this.apiToken = apiToken;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Centralized HTTP request helper. Adds auth headers, serializes JSON bodies,
   * and wraps errors with context about which endpoint failed.
   *
   * @template T - Expected response JSON type
   * @param method - HTTP method (GET, POST, PATCH, DELETE, PUT)
   * @param path   - API path relative to server root, e.g. `/api/v1/applications`
   * @param body   - Optional request body (will be JSON-serialized)
   * @returns Parsed JSON response body typed as `T`
   */
  private async _request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.serverUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new CoolifyApiError(
        `Network error while calling ${method} ${path}: ${message}`,
        0,
        `${method} ${path}`,
        '',
      );
    }

    // For 204 No Content responses, return an empty object
    if (response.status === 204) {
      return {} as T;
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new CoolifyApiError(
        `Coolify API error ${response.status} on ${method} ${path}: ${responseText}`,
        response.status,
        `${method} ${path}`,
        responseText,
      );
    }

    // If the response body is empty, return empty object
    if (!responseText.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch {
      // If response is not JSON (e.g. plain-text logs), return raw text cast as T
      return responseText as unknown as T;
    }
  }

  // ---------------------------------------------------------------------------
  // Application management
  // ---------------------------------------------------------------------------

  /**
   * Retrieve details for a single application by UUID.
   * @param appUuid - The application's UUID
   */
  async getApplication(appUuid: string): Promise<CoolifyApplication> {
    const raw = await this._request<Record<string, unknown>>(
      'GET',
      `/api/v1/applications/${appUuid}`,
    );

    return this._mapApplication(raw);
  }

  /**
   * List all applications accessible to the current API token.
   */
  async listApplications(): Promise<CoolifyApplication[]> {
    const raw = await this._request<Record<string, unknown>[]>(
      'GET',
      '/api/v1/applications',
    );

    return raw.map((item) => this._mapApplication(item));
  }

  /**
   * Trigger a new deployment for the given application.
   * @param appUuid - The application's UUID
   * @param options - Optional deployment options (branch override, force rebuild)
   * @returns Object containing the `deploymentUuid`
   */
  async triggerDeployment(
    appUuid: string,
    options?: { branch?: string; force?: boolean },
  ): Promise<{ deploymentUuid: string }> {
    const body: Record<string, unknown> = {};
    if (options?.branch) {
      body.branch = options.branch;
    }
    if (options?.force !== undefined) {
      body.force = options.force;
    }

    const raw = await this._request<{ deployment_uuid: string }>(
      'POST',
      `/api/v1/applications/${appUuid}/deploy`,
      body,
    );

    return { deploymentUuid: raw.deployment_uuid };
  }

  /**
   * Get the current status and details of a deployment.
   * @param deploymentUuid - The deployment's UUID
   */
  async getDeploymentStatus(deploymentUuid: string): Promise<CoolifyDeployment> {
    const raw = await this._request<Record<string, unknown>>(
      'GET',
      `/api/v1/deployments/${deploymentUuid}`,
    );

    return this._mapDeployment(raw);
  }

  /**
   * Retrieve the build/deploy logs for a specific deployment.
   * @param deploymentUuid - The deployment's UUID
   * @returns Raw log output as a string
   */
  async getDeploymentLogs(deploymentUuid: string): Promise<string> {
    const raw = await this._request<string | { logs: string }>(
      'GET',
      `/api/v1/deployments/${deploymentUuid}/logs`,
    );

    // API may return raw text or a JSON wrapper
    if (typeof raw === 'string') {
      return raw;
    }
    return raw.logs ?? '';
  }

  /**
   * Poll a deployment's status until it transitions out of the "building" /
   * "in_progress" state, or until the timeout is reached.
   *
   * @param deploymentUuid  - The deployment's UUID
   * @param timeoutMs       - Maximum wait time in milliseconds (default: 10 minutes)
   * @param pollIntervalMs  - Time between polls in milliseconds (default: 10 seconds)
   * @returns The final deployment status
   * @throws CoolifyApiError if the timeout elapses before deployment finishes
   */
  async waitForDeployment(
    deploymentUuid: string,
    timeoutMs: number = 10 * 60 * 1000,
    pollIntervalMs: number = 10 * 1000,
  ): Promise<CoolifyDeployment> {
    const inProgressStatuses = new Set([
      'building',
      'in_progress',
      'queued',
      'pending',
      'deploying',
    ]);

    const startTime = Date.now();

    while (true) {
      const deployment = await this.getDeploymentStatus(deploymentUuid);

      if (!inProgressStatuses.has(deployment.status.toLowerCase())) {
        return deployment;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed + pollIntervalMs > timeoutMs) {
        throw new CoolifyApiError(
          `Deployment ${deploymentUuid} did not complete within ${timeoutMs}ms (last status: ${deployment.status})`,
          0,
          `waitForDeployment(${deploymentUuid})`,
          JSON.stringify(deployment),
        );
      }

      await this._sleep(pollIntervalMs);
    }
  }

  // ---------------------------------------------------------------------------
  // Environment variables
  // ---------------------------------------------------------------------------

  /**
   * List all environment variables for an application.
   * @param appUuid - The application's UUID
   */
  async getEnvironmentVariables(appUuid: string): Promise<CoolifyEnvVar[]> {
    const raw = await this._request<Record<string, unknown>[]>(
      'GET',
      `/api/v1/applications/${appUuid}/envs`,
    );

    return raw.map((item) => ({
      key: String(item.key ?? ''),
      value: String(item.value ?? ''),
      isBuildTime: Boolean(item.is_build_time ?? false),
      isPreview: Boolean(item.is_preview ?? false),
    }));
  }

  /**
   * Create or update an environment variable on an application.
   * @param appUuid - The application's UUID
   * @param envVar  - The environment variable to set
   */
  async setEnvironmentVariable(appUuid: string, envVar: CoolifyEnvVar): Promise<void> {
    await this._request<unknown>(
      'POST',
      `/api/v1/applications/${appUuid}/envs`,
      {
        key: envVar.key,
        value: envVar.value,
        is_build_time: envVar.isBuildTime,
        is_preview: envVar.isPreview,
      },
    );
  }

  /**
   * Delete an environment variable from an application.
   * @param appUuid - The application's UUID
   * @param key     - The environment variable key to remove
   */
  async deleteEnvironmentVariable(appUuid: string, key: string): Promise<void> {
    await this._request<unknown>(
      'DELETE',
      `/api/v1/applications/${appUuid}/envs/${encodeURIComponent(key)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Application lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Restart an application.
   * @param appUuid - The application's UUID
   */
  async restartApplication(appUuid: string): Promise<void> {
    await this._request<unknown>(
      'POST',
      `/api/v1/applications/${appUuid}/restart`,
    );
  }

  /**
   * Stop a running application.
   * @param appUuid - The application's UUID
   */
  async stopApplication(appUuid: string): Promise<void> {
    await this._request<unknown>(
      'POST',
      `/api/v1/applications/${appUuid}/stop`,
    );
  }

  /**
   * Start a stopped application.
   * @param appUuid - The application's UUID
   */
  async startApplication(appUuid: string): Promise<void> {
    await this._request<unknown>(
      'POST',
      `/api/v1/applications/${appUuid}/start`,
    );
  }

  /**
   * Retrieve runtime logs for an application.
   * @param appUuid - The application's UUID
   * @param lines   - Number of log lines to fetch (default: 100)
   * @returns Raw log output as a string
   */
  async getApplicationLogs(appUuid: string, lines: number = 100): Promise<string> {
    const raw = await this._request<string | { logs: string }>(
      'GET',
      `/api/v1/applications/${appUuid}/logs?lines=${lines}`,
    );

    if (typeof raw === 'string') {
      return raw;
    }
    return raw.logs ?? '';
  }

  /**
   * Update application settings (partial update via PATCH).
   * @param appUuid  - The application's UUID
   * @param settings - Key-value pairs of settings to update
   */
  async updateApplicationSettings(
    appUuid: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await this._request<unknown>(
      'PATCH',
      `/api/v1/applications/${appUuid}`,
      settings,
    );
  }

  /**
   * Create a preview deployment for a specific branch.
   *
   * This first enables preview deployments on the application, then triggers
   * a deployment for the given branch. If a `prNumber` is provided it is included
   * in the deployment trigger payload so Coolify can associate the preview with a
   * pull-request.
   *
   * @param appUuid  - The application's UUID
   * @param branch   - The branch name to deploy as a preview
   * @param prNumber - Optional pull-request number to associate with the preview
   * @returns Object containing the `previewUrl` and `deploymentUuid`
   */
  async createPreviewDeployment(
    appUuid: string,
    branch: string,
    prNumber?: number,
  ): Promise<{ previewUrl: string; deploymentUuid: string }> {
    // Step 1: Enable preview deployments on the application
    await this.updateApplicationSettings(appUuid, {
      preview_url_template: '{{pr_id}}.{{domain}}',
      is_preview_deployments_enabled: true,
    });

    // Step 2: Trigger deployment on the specified branch
    const deployBody: Record<string, unknown> = { branch };
    if (prNumber !== undefined) {
      deployBody.pr_number = prNumber;
    }

    const deployResult = await this._request<{
      deployment_uuid: string;
      preview_url?: string;
    }>(
      'POST',
      `/api/v1/applications/${appUuid}/deploy`,
      deployBody,
    );

    // Step 3: Derive the preview URL
    // If the API returned a preview URL, use it. Otherwise construct one from
    // the application's FQDN and the PR number or branch name.
    let previewUrl = deployResult.preview_url ?? '';

    if (!previewUrl) {
      const app = await this.getApplication(appUuid);
      const identifier = prNumber ?? branch;
      // Build a preview URL by prepending the identifier as a subdomain
      try {
        const fqdnUrl = new URL(app.fqdn);
        previewUrl = `${fqdnUrl.protocol}//${identifier}.${fqdnUrl.host}`;
      } catch {
        // If FQDN isn't a valid URL, fall back to simple concatenation
        previewUrl = `${identifier}.${app.fqdn}`;
      }
    }

    return {
      previewUrl,
      deploymentUuid: deployResult.deployment_uuid,
    };
  }

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------

  /**
   * Check whether the Coolify instance is reachable and healthy.
   * @returns `true` if the healthcheck endpoint responds with a success status, `false` otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this._request<unknown>('GET', '/api/v1/healthcheck');
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal mapping helpers
  // ---------------------------------------------------------------------------

  /**
   * Map a raw API response object to a `CoolifyApplication`.
   */
  private _mapApplication(raw: Record<string, unknown>): CoolifyApplication {
    return {
      uuid: String(raw.uuid ?? ''),
      name: String(raw.name ?? ''),
      fqdn: String(raw.fqdn ?? ''),
      status: String(raw.status ?? 'unknown'),
      repository: String(raw.repository ?? raw.git_repository ?? ''),
      branch: String(raw.branch ?? raw.git_branch ?? ''),
      buildPack: String(raw.build_pack ?? raw.buildPack ?? ''),
    };
  }

  /**
   * Map a raw API response object to a `CoolifyDeployment`.
   */
  private _mapDeployment(raw: Record<string, unknown>): CoolifyDeployment {
    return {
      uuid: String(raw.uuid ?? ''),
      status: String(raw.status ?? 'unknown'),
      branch: String(raw.branch ?? raw.git_branch ?? ''),
      previewUrl: raw.preview_url ? String(raw.preview_url) : undefined,
      createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    };
  }

  /**
   * Promise-based sleep utility for polling.
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new `CoolifyService` instance.
 *
 * @param serverUrl - Base URL of the Coolify instance (e.g. `https://coolify.example.com`)
 * @param apiToken  - API bearer token for authentication
 * @returns Configured `CoolifyService` instance
 */
export function createCoolifyService(serverUrl: string, apiToken: string): CoolifyService {
  return new CoolifyService(serverUrl, apiToken);
}
