// Cloud-init template rendering
// Injects secrets into the FlaggerLink cloud-init template

import { InfisicalSecrets } from '../services/infisical';

interface CloudInitParams {
  secrets: InfisicalSecrets;
  githubToken: string;
  branch: string;
}

export async function renderCloudInit(params: CloudInitParams): Promise<string> {
  // Read the cloud-init template from shared/templates
  // In Worker environment, we'll inline the template or fetch it from KV
  // For now, we'll construct it programmatically
  
  const { secrets, githubToken, branch } = params;

  return `#cloud-config
# FlaggerLink Server Provisioning - NOC Automated Deployment
# Generated: ${new Date().toISOString()}

package_update: true
package_upgrade: true

packages:
  - apt-transport-https
  - ca-certificates
  - wget
  - nginx
  - redis-server
  - curl
  - git
  - jq

users:
  - name: flaggerlink
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

runcmd:
  # Install .NET 8.0 Runtime
  - echo "Installing .NET 8.0 runtime..."
  - wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
  - dpkg -i packages-microsoft-prod.deb
  - rm packages-microsoft-prod.deb
  - apt-get update
  - apt-get install -y aspnetcore-runtime-8.0

  # Configure Redis
  - echo "Configuring Redis..."
  - sed -i "s/^# requirepass .*/requirepass ${secrets.REDIS_PASSWORD}/" /etc/redis/redis.conf
  - sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
  - systemctl enable redis-server
  - systemctl restart redis-server

  # Install and Configure RabbitMQ
  - echo "Installing RabbitMQ..."
  - curl -1sLf 'https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-erlang/setup.deb.sh' | sudo -E bash
  - curl -1sLf 'https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh' | sudo -E bash
  - apt-get install -y rabbitmq-server
  - systemctl enable rabbitmq-server
  - systemctl start rabbitmq-server
  - sleep 10
  - rabbitmqctl add_user "${secrets.RABBITMQ_USER}" "${secrets.RABBITMQ_PASSWORD}" || true
  - rabbitmqctl set_user_tags "${secrets.RABBITMQ_USER}" administrator
  - rabbitmqctl set_permissions -p / "${secrets.RABBITMQ_USER}" ".*" ".*" ".*"
  - rabbitmq-plugins enable rabbitmq_management

  # Create Directory Structure
  - mkdir -p /opt/flaggerlink/{api,texting,portal-api,scripts,secrets}
  - mkdir -p /var/www/flaggerlink/{web,portal}
  - mkdir -p /var/log/flaggerlink

  # Clone FlaggerLink Repository
  - echo "Cloning FlaggerLink repository..."
  - su - flaggerlink -c "git clone -b ${branch} https://${githubToken}@github.com/RichardHorwath/FlaggerLink.git /home/flaggerlink/FlaggerLink"

  # Save Secrets
  - |
    cat > /opt/flaggerlink/secrets/.env << ENVEOF
    # FlaggerLink Environment Secrets
    # Generated: $(date -u)
    
    REDIS_PASSWORD=${secrets.REDIS_PASSWORD}
    RABBITMQ_USER=${secrets.RABBITMQ_USER}
    RABBITMQ_PASSWORD=${secrets.RABBITMQ_PASSWORD}
    DATABASE_USER=${secrets.DATABASE_USER}
    DATABASE_PASSWORD=${secrets.DATABASE_PASSWORD}
    DATABASE_HOST=${secrets.DATABASE_HOST}
    DATABASE_NAME=${secrets.DATABASE_NAME}
    JWT_SECRET=${secrets.JWT_SECRET}
    ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
    ENVEOF
  - chmod 600 /opt/flaggerlink/secrets/.env

  # Set Ownership
  - chown -R flaggerlink:flaggerlink /opt/flaggerlink
  - chown -R flaggerlink:flaggerlink /var/log/flaggerlink
  - chown -R www-data:www-data /var/www/flaggerlink

  # Configure Firewall
  - ufw --force enable
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp

  # Configure Nginx
  - rm -f /etc/nginx/sites-enabled/default
  - systemctl enable nginx
  - systemctl restart nginx

  # System Optimizations
  - sysctl -w net.core.somaxconn=1024
  - sysctl -w vm.overcommit_memory=1
  - echo "net.core.somaxconn=1024" >> /etc/sysctl.conf
  - echo "vm.overcommit_memory=1" >> /etc/sysctl.conf

write_files:
  - path: /opt/flaggerlink/.provisioned
    content: |
      Provisioned: ${new Date().toISOString()}
      Branch: ${branch}
      NOC Platform: Automated Deployment
    permissions: '0644'
    owner: flaggerlink:flaggerlink

  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80 default_server;
          listen [::]:80 default_server;
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
  
  Services Running:
    - nginx
    - redis-server
    - rabbitmq-server
  
  Repository: Cloned to /home/flaggerlink/FlaggerLink
  Branch: ${branch}
  
  Next Steps:
    - Deploy systemd service files
    - Deploy application code
    - Configure nginx reverse proxy
    - Deploy SSL certificates
  
  =======================================
`;
}
