// Infisical API Service
// Fetches FlaggerLink application secrets for cloud-init injection

interface InfisicalAuth {
  clientId: string;
  clientSecret: string;
}

interface InfisicalSecrets {
  REDIS_PASSWORD: string;
  RABBITMQ_USER: string;
  RABBITMQ_PASSWORD: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_HOST: string;
  DATABASE_NAME: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}

export class InfisicalService {
  private baseUrl = 'https://app.infisical.com/api/v1';
  private auth: InfisicalAuth;
  private projectId: string;
  private accessToken: string | null = null;

  constructor(auth: InfisicalAuth, projectId: string) {
    this.auth = auth;
    this.projectId = projectId;
  }

  // Authenticate and get access token
  private async authenticate(): Promise<string> {
    if (this.accessToken) {
      console.log('[Infisical] Using cached access token');
      return this.accessToken;
    }

    const authUrl = `${this.baseUrl}/auth/universal-auth/login`;
    console.log('[Infisical] Authenticating to:', authUrl);
    console.log('[Infisical] Client ID length:', this.auth.clientId?.length || 0);
    console.log('[Infisical] Client Secret length:', this.auth.clientSecret?.length || 0);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.auth.clientId,
        clientSecret: this.auth.clientSecret,
      }),
    });

    console.log('[Infisical] Auth response status:', response.status);
    console.log('[Infisical] Auth response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Infisical] Auth failed:', errorText);
      throw new Error(`Infisical auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Infisical] Auth successful, token received');
    this.accessToken = data.accessToken;
    return this.accessToken;
  }

  // Fetch secrets from Infisical
  async getSecrets(environment: string = 'prod'): Promise<InfisicalSecrets> {
    console.log('[Infisical] Fetching secrets for environment:', environment);
    console.log('[Infisical] Project ID:', this.projectId);

    const token = await this.authenticate();

    // Use v4 API with correct parameter names
    const secretsUrl = `https://app.infisical.com/api/v4/secrets?projectId=${this.projectId}&environment=${environment}&secretPath=/`;
    console.log('[Infisical] Fetching secrets from:', secretsUrl);

    const response = await fetch(secretsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('[Infisical] Secrets fetch response status:', response.status);

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

    return {
      REDIS_PASSWORD: secrets.REDIS_PASSWORD || '',
      RABBITMQ_USER: secrets.RABBITMQ_USER || 'flagger',
      RABBITMQ_PASSWORD: secrets.RABBITMQ_PASSWORD || '',
      DATABASE_USER: secrets.DATABASE_USER || 'flagger',
      DATABASE_PASSWORD: secrets.DATABASE_PASSWORD || '',
      DATABASE_HOST: secrets.DATABASE_HOST || '',
      DATABASE_NAME: secrets.DATABASE_NAME || 'flaggerlink',
      JWT_SECRET: secrets.JWT_SECRET || '',
      ENCRYPTION_KEY: secrets.ENCRYPTION_KEY || '',
    };
  }
}
