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
  private baseUrl = 'https://app.infisical.com/api/v3';
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
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/auth/universal-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.auth.clientId,
        clientSecret: this.auth.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infisical auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    return this.accessToken;
  }

  // Fetch secrets from Infisical
  async getSecrets(environment: string = 'prod'): Promise<InfisicalSecrets> {
    const token = await this.authenticate();

    const response = await fetch(
      `${this.baseUrl}/secrets?workspaceId=${this.projectId}&environment=${environment}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Infisical secrets fetch failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform array of secrets to object
    const secrets: any = {};
    data.secrets.forEach((secret: any) => {
      secrets[secret.secretKey] = secret.secretValue;
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
