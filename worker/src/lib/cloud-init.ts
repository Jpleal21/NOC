// Cloud-init template rendering
// Processes the FlaggerLink cloud-init YAML template with secret injection

import { InfisicalSecrets } from '../services/infisical';

interface CloudInitParams {
  secrets: InfisicalSecrets;
  githubToken: string;
  branch: string;
}

// Helper function to indent multi-line strings for YAML
function indentLines(text: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return text.split('\n').map(line => indent + line).join('\n');
}

// Cloud-init YAML template
// This template is processed at runtime to inject secrets and configuration
const CLOUD_INIT_TEMPLATE = `#cloud-config
# FlaggerLink Server Provisioning
# This cloud-init script prepares a fresh Ubuntu 22.04 server for FlaggerLink deployment
# It installs all dependencies and configures the environment

package_update: true
package_upgrade: true

packages:
  # .NET 8.0 dependencies
  - apt-transport-https
  - ca-certificates
  - wget

  # Web server
  - nginx

  # Redis
  - redis-server

  # Utilities
  - curl
  - git
  - jq

# Create flaggerlink user and directories
users:
  - name: flaggerlink
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

runcmd:
  # ========================================================================
  # Install .NET 8.0 Runtime
  # ========================================================================
  - echo "Installing .NET 8.0 runtime..."
  - wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
  - dpkg -i packages-microsoft-prod.deb
  - rm packages-microsoft-prod.deb
  - apt-get update
  - apt-get install -y aspnetcore-runtime-8.0

  # ========================================================================
  # Configure Redis
  # ========================================================================
  - echo "Configuring Redis..."
  - REDIS_PASS="\${REDIS_PASSWORD}"
  - sed -i "s/^# requirepass .*/requirepass $REDIS_PASS/" /etc/redis/redis.conf
  - sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
  - systemctl enable redis-server
  - systemctl restart redis-server
  - echo "✓ Redis configured with password from environment"

  # ========================================================================
  # Install and Configure RabbitMQ
  # ========================================================================
  - echo "Installing RabbitMQ..."
  - curl -1sLf 'https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-erlang/setup.deb.sh' | sudo -E bash
  - curl -1sLf 'https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh' | sudo -E bash
  - apt-get install -y rabbitmq-server
  - systemctl enable rabbitmq-server
  - systemctl start rabbitmq-server
  - sleep 10
  - RABBITMQ_USER="\${RABBITMQ_USER}"
  - RABBITMQ_PASS="\${RABBITMQ_PASSWORD}"
  - rabbitmqctl add_user "$RABBITMQ_USER" "$RABBITMQ_PASS" || true
  - rabbitmqctl set_user_tags "$RABBITMQ_USER" administrator
  - rabbitmqctl set_permissions -p / "$RABBITMQ_USER" ".*" ".*" ".*"
  - rabbitmq-plugins enable rabbitmq_management
  - echo "✓ RabbitMQ configured with credentials from environment"

  # ========================================================================
  # Create Directory Structure
  # ========================================================================
  - echo "Creating directory structure..."
  - mkdir -p /opt/flaggerlink/{api,texting,portal-api,scripts,secrets}
  - mkdir -p /var/www/flaggerlink/{web,portal}
  - mkdir -p /var/log/flaggerlink
  - mkdir -p /etc/ssl/cloudflare

  # ========================================================================
  # Clone FlaggerLink Repository
  # ========================================================================
  - echo "Cloning FlaggerLink repository..."
  - su - flaggerlink -c "git clone -b \${GITHUB_BRANCH} https://\${GITHUB_TOKEN}@github.com/RichardHorwath/FlaggerLink.git /home/flaggerlink/FlaggerLink"

  # ========================================================================
  # Save Secrets to Secure Location
  # ========================================================================
  - echo "Saving secrets configuration..."
  - |
    cat > /opt/flaggerlink/secrets/.env << EOF
    # FlaggerLink Environment Secrets
    # Generated: $(date -u)
    # DO NOT COMMIT THIS FILE

    # Infrastructure
    REDIS_PASSWORD=\${REDIS_PASSWORD}
    RABBITMQ_USER=\${RABBITMQ_USER}
    RABBITMQ_PASSWORD=\${RABBITMQ_PASSWORD}

    # Database (to be configured by deployment)
    DATABASE_USER=\${DATABASE_USER}
    DATABASE_PASSWORD=\${DATABASE_PASSWORD}
    DATABASE_HOST=\${DATABASE_HOST}
    DATABASE_NAME=\${DATABASE_NAME}

    # Application Secrets
    JWT_SECRET=\${JWT_SECRET}
    ENCRYPTION_KEY=\${ENCRYPTION_KEY}
    EOF
  - chmod 600 /opt/flaggerlink/secrets/.env
  - echo "✓ Secrets saved to /opt/flaggerlink/secrets/.env"

  # ========================================================================
  # Set Ownership
  # ========================================================================
  - chown flaggerlink:flaggerlink /opt/flaggerlink/.provisioned
  - chown -R flaggerlink:flaggerlink /opt/flaggerlink
  - chown -R flaggerlink:flaggerlink /var/log/flaggerlink
  - chown -R www-data:www-data /var/www/flaggerlink

  # ========================================================================
  # Set SSL Certificate Permissions
  # ========================================================================
  - echo "Setting SSL certificate permissions..."
  - chmod 644 /etc/ssl/cloudflare/origin.pem
  - chmod 600 /etc/ssl/cloudflare/origin.key
  - chown root:root /etc/ssl/cloudflare/origin.pem
  - chown root:root /etc/ssl/cloudflare/origin.key

  # ========================================================================
  # Configure Firewall (UFW)
  # ========================================================================
  - echo "Configuring firewall..."
  - ufw --force enable
  - ufw allow 22/tcp    # SSH
  - ufw allow 80/tcp    # HTTP
  - ufw allow 443/tcp   # HTTPS

  # ========================================================================
  # Configure Nginx
  # ========================================================================
  - echo "Configuring nginx..."
  - rm -f /etc/nginx/sites-enabled/default
  - systemctl enable nginx
  - systemctl restart nginx

  # ========================================================================
  # System Optimizations
  # ========================================================================
  - echo "Applying system optimizations..."
  - sysctl -w net.core.somaxconn=1024
  - sysctl -w vm.overcommit_memory=1
  - echo "net.core.somaxconn=1024" >> /etc/sysctl.conf
  - echo "vm.overcommit_memory=1" >> /etc/sysctl.conf

write_files:
  # Create a marker file to indicate provisioning is complete
  - path: /opt/flaggerlink/.provisioned
    content: |
      Provisioned: \${PROVISIONED_TIMESTAMP}
      Branch: \${GITHUB_BRANCH}
      NOC Platform: Automated Deployment
    permissions: '0644'

  # Cloudflare Origin SSL Certificate
  - path: /etc/ssl/cloudflare/origin.pem
    content: |
\${CLOUDFLARE_ORIGIN_CERT_INDENTED}
    permissions: '0644'

  # Cloudflare Origin SSL Private Key
  - path: /etc/ssl/cloudflare/origin.key
    content: |
\${CLOUDFLARE_ORIGIN_KEY_INDENTED}
    permissions: '0600'

  # Create initial nginx default configuration
  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80 default_server;
          listen [::]:80 default_server;
          listen 443 ssl http2 default_server;
          listen [::]:443 ssl http2 default_server;

          # Cloudflare Origin Certificate
          ssl_certificate /etc/ssl/cloudflare/origin.pem;
          ssl_certificate_key /etc/ssl/cloudflare/origin.key;

          # SSL Configuration
          ssl_protocols TLSv1.2 TLSv1.3;
          ssl_ciphers HIGH:!aNULL:!MD5;
          ssl_prefer_server_ciphers on;

          server_name _;

          root /var/www/html;
          index index.html;

          location / {
              return 200 'FlaggerLink server is ready for deployment';
              add_header Content-Type text/plain;
          }

          location /health {
              return 200 'OK';
              add_header Content-Type text/plain;
          }
      }
    permissions: '0644'

final_message: |
  =======================================
  FlaggerLink Server Provisioning Complete
  =======================================

  Installed:
    - .NET 8.0 Runtime
    - Nginx
    - Redis (with password configured)
    - RabbitMQ (user: \${RABBITMQ_USER})

  Directories:
    - /opt/flaggerlink/     (API services)
    - /var/www/flaggerlink/ (Frontend apps)

  Services Running:
    - nginx
    - redis-server
    - rabbitmq-server

  Next Steps:
    - Deploy systemd service files
    - Deploy application code
    - Configure nginx reverse proxy

  =======================================
`;

export async function renderCloudInit(params: CloudInitParams): Promise<string> {
  const { secrets, githubToken, branch } = params;

  // Indent SSL certificates for proper YAML formatting (6 spaces)
  const certIndented = indentLines(secrets.CLOUDFLARE_ORIGIN_CERT, 6);
  const keyIndented = indentLines(secrets.CLOUDFLARE_ORIGIN_KEY, 6);

  // Replace template variables with actual values
  let rendered = CLOUD_INIT_TEMPLATE;

  // Replace all occurrences of template variables
  rendered = rendered.replace(/\$\{REDIS_PASSWORD\}/g, secrets.REDIS_PASSWORD);
  rendered = rendered.replace(/\$\{RABBITMQ_USER\}/g, secrets.RABBITMQ_USER);
  rendered = rendered.replace(/\$\{RABBITMQ_PASSWORD\}/g, secrets.RABBITMQ_PASSWORD);
  rendered = rendered.replace(/\$\{DATABASE_USER\}/g, secrets.DATABASE_USER);
  rendered = rendered.replace(/\$\{DATABASE_PASSWORD\}/g, secrets.DATABASE_PASSWORD);
  rendered = rendered.replace(/\$\{DATABASE_HOST\}/g, secrets.DATABASE_HOST);
  rendered = rendered.replace(/\$\{DATABASE_NAME\}/g, secrets.DATABASE_NAME);
  rendered = rendered.replace(/\$\{JWT_SECRET\}/g, secrets.JWT_SECRET);
  rendered = rendered.replace(/\$\{ENCRYPTION_KEY\}/g, secrets.ENCRYPTION_KEY);
  rendered = rendered.replace(/\$\{GITHUB_TOKEN\}/g, githubToken);
  rendered = rendered.replace(/\$\{GITHUB_BRANCH\}/g, branch);
  rendered = rendered.replace(/\$\{PROVISIONED_TIMESTAMP\}/g, new Date().toISOString());
  rendered = rendered.replace(/\$\{CLOUDFLARE_ORIGIN_CERT_INDENTED\}/g, certIndented);
  rendered = rendered.replace(/\$\{CLOUDFLARE_ORIGIN_KEY_INDENTED\}/g, keyIndented);

  return rendered;
}
