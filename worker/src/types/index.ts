// NOC Platform Types

export interface DeploymentParams {
  server_name: string;
  droplet_size: string;
  droplet_region: string;
  vpc_uuid: string;
  branch: string;
  enable_cloudflare_proxy: boolean;
}

export interface Droplet {
  id: number;
  name: string;
  status: string;
  ip_address: string;
  region: string;
  size: string;
  vpc_uuid: string;
  tags: string[];
  created_at: string;
}

export interface VPC {
  id: string;
  name: string;
  region: string;
  ip_range: string;
  description?: string;
}

export interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

export interface InfisicalSecrets {
  REDIS_PASSWORD: string;
  RABBITMQ_USER: string;
  RABBITMQ_PASSWORD: string;
}
