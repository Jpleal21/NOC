// Infisical API Service
// Fetches FlaggerLink application secrets for cloud-init injection

interface InfisicalAuth {
  clientId: string;
  clientSecret: string;
}

export interface InfisicalSecrets {
  // Database Secrets - MySQL Main Data (5)
  MYSQL_HOST: string;
  MYSQL_PORT: string;
  MYSQL_DATABASE: string;
  MYSQL_USERNAME: string;
  MYSQL_PASSWORD: string;

  // Database Secrets - MySQL Auth (5)
  AUTH_DB_HOST: string;
  AUTH_DB_PORT: string;
  AUTH_DB_DATABASE: string;
  AUTH_DB_USERNAME: string;
  AUTH_DB_PASSWORD: string;

  // Database Secrets - MySQL Texting (5)
  TEXTING_DB_HOST: string;
  TEXTING_DB_PORT: string;
  TEXTING_DB_DATABASE: string;
  TEXTING_DB_USERNAME: string;
  TEXTING_DB_PASSWORD: string;

  // Infrastructure - Redis (3)
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD: string;

  // Infrastructure - RabbitMQ (5)
  RABBITMQ_HOST: string;
  RABBITMQ_PORT: string;
  RABBITMQ_USERNAME: string;
  RABBITMQ_PASSWORD: string;
  RABBITMQ_VIRTUAL_HOST: string;

  // External APIs - Telnyx SMS (6)
  TELNYX_BASE_URL: string;
  TELNYX_API_KEY: string;
  TELNYX_MESSAGING_PROFILE_ID: string;
  TELNYX_WEBHOOK_KEY: string;
  TELNYX_WEBHOOK_URL: string;
  TELNYX_FROM_NUMBER: string;

  // External APIs - SMTP2GO Email (1)
  SMTP2GO_API_KEY: string;

  // External APIs - Chargebee Billing (4)
  CHARGEBEE_SITE: string;
  CHARGEBEE_API_KEY: string;
  CHARGEBEE_CF_CLIENT_ID: string;
  CHARGEBEE_CF_CLIENT_SECRET: string;

  // External APIs - Billing Worker (1)
  BILLING_WORKER_API_KEY: string;

  // Application Secrets - Authentication (4)
  INVITATION_SIGNING_KEY: string;
  MFA_SESSION_KEY: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;

  // Application Secrets - Internal API Keys (3)
  TEXTING_SERVICE_API_KEY: string;
  TEXTING_NOTIFICATION_KEY: string;
  FLAGGER_API_KEY: string;

  // SSL/TLS Certificates (2)
  CLOUDFLARE_ORIGIN_CERT: string;
  CLOUDFLARE_ORIGIN_KEY: string;
}

export class InfisicalService {
  private baseUrl = 'https://app.infisical.com/api/v1';
  private auth: InfisicalAuth;
  private projectId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null; // Unix timestamp in milliseconds
  private authPromise: Promise<string> | null = null; // Promise cache to prevent race conditions
  private defaultTimeout = 30000; // 30 seconds default timeout

  constructor(auth: InfisicalAuth, projectId: string) {
    this.auth = auth;
    this.projectId = projectId;
  }

  // Private request helper with timeout support
  private async request(url: string, options: RequestInit, timeout: number = this.defaultTimeout): Promise<Response> {
    console.log('[Infisical]', options.method || 'GET', url, `(timeout: ${timeout}ms)`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[Infisical] Request timeout after', timeout, 'ms');
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Infisical API timeout after ${timeout}ms for ${url}`);
      }
      throw error;
    }
  }

  // Authenticate and get access token with expiration handling
  private async authenticate(): Promise<string> {
    const now = Date.now();
    const refreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiration

    // Check if we have a valid cached token (exists and not expired/near expiration)
    if (this.accessToken && this.tokenExpiresAt && now < (this.tokenExpiresAt - refreshBuffer)) {
      const expiresInSeconds = Math.floor((this.tokenExpiresAt - now) / 1000);
      console.log('[Infisical] Using cached access token (expires in', expiresInSeconds, 'seconds)');
      return this.accessToken;
    }

    // If authentication is already in progress, return the existing promise (prevents race condition)
    if (this.authPromise) {
      console.log('[Infisical] Authentication already in progress, waiting for existing request...');
      return this.authPromise;
    }

    // Token expired or near expiration, get a new one
    if (this.accessToken) {
      console.log('[Infisical] Token expired or near expiration, refreshing...');
      this.accessToken = null;
      this.tokenExpiresAt = null;
    }

    // Create and cache the authentication promise
    this.authPromise = (async () => {
      try {
        const authUrl = `${this.baseUrl}/auth/universal-auth/login`;
        console.log('[Infisical] Authenticating...');
        console.log('[Infisical] Client ID length:', this.auth.clientId?.length || 0);
        console.log('[Infisical] Client Secret length:', this.auth.clientSecret?.length || 0);

        const response = await this.request(authUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: this.auth.clientId,
            clientSecret: this.auth.clientSecret,
          }),
        });

        console.log('[Infisical] Auth response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Infisical] Auth failed:', errorText);
          throw new Error(`Infisical auth failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Infisical] Auth successful, token received');

        // Cache token and calculate expiration
        this.accessToken = data.accessToken;

        // Infisical Universal Auth tokens typically have 7200s (2 hour) TTL
        // If API provides expiresIn, use that; otherwise default to 1 hour for safety
        const expiresInSeconds = data.expiresIn || 3600;
        this.tokenExpiresAt = now + (expiresInSeconds * 1000);

        console.log('[Infisical] Token expires in', expiresInSeconds, 'seconds');
        return this.accessToken;
      } finally {
        // Clear the promise cache once authentication completes (success or failure)
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  }

  // Fetch secrets from Infisical with automatic token refresh on 401
  async getSecrets(environment: string = 'prod', retryOnAuth = true): Promise<InfisicalSecrets> {
    console.log('[Infisical] Fetching secrets for environment:', environment);
    console.log('[Infisical] Project ID:', this.projectId);

    const token = await this.authenticate();

    // Use v4 API with correct parameter names
    const secretsUrl = `https://app.infisical.com/api/v4/secrets?projectId=${this.projectId}&environment=${environment}&secretPath=/`;
    console.log('[Infisical] Fetching secrets from:', secretsUrl);

    const response = await this.request(secretsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[Infisical] Secrets fetch response status:', response.status);

    // Handle 401 Unauthorized - token may have expired mid-flight
    if (response.status === 401 && retryOnAuth) {
      console.warn('[Infisical] Got 401, token may be invalid. Clearing cache and retrying...');
      this.accessToken = null;
      this.tokenExpiresAt = null;
      // Retry once with retryOnAuth=false to prevent infinite loop
      return this.getSecrets(environment, false);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Infisical] Secrets fetch failed:', errorText);
      throw new Error(`Infisical secrets fetch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Infisical] Secrets received, count:', data.secrets?.length || 0);

    // Transform array of secrets to object
    const secrets: any = {};
    data.secrets.forEach((secret: any) => {
      secrets[secret.secretKey] = secret.secretValue;
      console.log('[Infisical] Secret loaded:', secret.secretKey);
    });

    // Validate critical secrets are present and non-empty
    const requiredSecrets = [
      'REDIS_PASSWORD',
      'RABBITMQ_USERNAME',
      'RABBITMQ_PASSWORD',
      'MYSQL_PASSWORD',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'CLOUDFLARE_ORIGIN_CERT',
      'CLOUDFLARE_ORIGIN_KEY',
    ];

    const missingSecrets: string[] = [];
    for (const key of requiredSecrets) {
      if (!secrets[key] || secrets[key].trim() === '') {
        missingSecrets.push(key);
      }
    }

    if (missingSecrets.length > 0) {
      console.error('[Infisical] Missing or empty required secrets:', missingSecrets);
      throw new Error(`Missing or empty required secrets in Infisical: ${missingSecrets.join(', ')}`);
    }

    console.log('[Infisical] All required secrets validated successfully');

    return {
      // Database Secrets - MySQL Main Data (5)
      MYSQL_HOST: secrets.MYSQL_HOST || '',
      MYSQL_PORT: secrets.MYSQL_PORT || '',
      MYSQL_DATABASE: secrets.MYSQL_DATABASE || '',
      MYSQL_USERNAME: secrets.MYSQL_USERNAME || '',
      MYSQL_PASSWORD: secrets.MYSQL_PASSWORD || '',

      // Database Secrets - MySQL Auth (5)
      AUTH_DB_HOST: secrets.AUTH_DB_HOST || '',
      AUTH_DB_PORT: secrets.AUTH_DB_PORT || '',
      AUTH_DB_DATABASE: secrets.AUTH_DB_DATABASE || '',
      AUTH_DB_USERNAME: secrets.AUTH_DB_USERNAME || '',
      AUTH_DB_PASSWORD: secrets.AUTH_DB_PASSWORD || '',

      // Database Secrets - MySQL Texting (5)
      TEXTING_DB_HOST: secrets.TEXTING_DB_HOST || '',
      TEXTING_DB_PORT: secrets.TEXTING_DB_PORT || '',
      TEXTING_DB_DATABASE: secrets.TEXTING_DB_DATABASE || '',
      TEXTING_DB_USERNAME: secrets.TEXTING_DB_USERNAME || '',
      TEXTING_DB_PASSWORD: secrets.TEXTING_DB_PASSWORD || '',

      // Infrastructure - Redis (3)
      REDIS_HOST: secrets.REDIS_HOST || '',
      REDIS_PORT: secrets.REDIS_PORT || '',
      REDIS_PASSWORD: secrets.REDIS_PASSWORD || '',

      // Infrastructure - RabbitMQ (5)
      RABBITMQ_HOST: secrets.RABBITMQ_HOST || '',
      RABBITMQ_PORT: secrets.RABBITMQ_PORT || '',
      RABBITMQ_USERNAME: secrets.RABBITMQ_USERNAME || '',
      RABBITMQ_PASSWORD: secrets.RABBITMQ_PASSWORD || '',
      RABBITMQ_VIRTUAL_HOST: secrets.RABBITMQ_VIRTUAL_HOST || '',

      // External APIs - Telnyx SMS (6)
      TELNYX_BASE_URL: secrets.TELNYX_BASE_URL || '',
      TELNYX_API_KEY: secrets.TELNYX_API_KEY || '',
      TELNYX_MESSAGING_PROFILE_ID: secrets.TELNYX_MESSAGING_PROFILE_ID || '',
      TELNYX_WEBHOOK_KEY: secrets.TELNYX_WEBHOOK_KEY || '',
      TELNYX_WEBHOOK_URL: secrets.TELNYX_WEBHOOK_URL || '',
      TELNYX_FROM_NUMBER: secrets.TELNYX_FROM_NUMBER || '',

      // External APIs - SMTP2GO Email (1)
      SMTP2GO_API_KEY: secrets.SMTP2GO_API_KEY || '',

      // External APIs - Chargebee Billing (4)
      CHARGEBEE_SITE: secrets.CHARGEBEE_SITE || '',
      CHARGEBEE_API_KEY: secrets.CHARGEBEE_API_KEY || '',
      CHARGEBEE_CF_CLIENT_ID: secrets.CHARGEBEE_CF_CLIENT_ID || '',
      CHARGEBEE_CF_CLIENT_SECRET: secrets.CHARGEBEE_CF_CLIENT_SECRET || '',

      // External APIs - Billing Worker (1)
      BILLING_WORKER_API_KEY: secrets.BILLING_WORKER_API_KEY || '',

      // Application Secrets - Authentication (4)
      INVITATION_SIGNING_KEY: secrets.INVITATION_SIGNING_KEY || '',
      MFA_SESSION_KEY: secrets.MFA_SESSION_KEY || '',
      JWT_SECRET: secrets.JWT_SECRET || '',
      ENCRYPTION_KEY: secrets.ENCRYPTION_KEY || '',

      // Application Secrets - Internal API Keys (3)
      TEXTING_SERVICE_API_KEY: secrets.TEXTING_SERVICE_API_KEY || '',
      TEXTING_NOTIFICATION_KEY: secrets.TEXTING_NOTIFICATION_KEY || '',
      FLAGGER_API_KEY: secrets.FLAGGER_API_KEY || '',

      // SSL/TLS Certificates (2)
      CLOUDFLARE_ORIGIN_CERT: secrets.CLOUDFLARE_ORIGIN_CERT || '',
      CLOUDFLARE_ORIGIN_KEY: secrets.CLOUDFLARE_ORIGIN_KEY || '',
    };
  }
}
