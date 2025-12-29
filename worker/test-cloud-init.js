// Test cloud-init template rendering
const mockSecrets = {
  REDIS_PASSWORD: 'test123',
  RABBITMQ_USER: 'flagger',
  RABBITMQ_PASSWORD: 'test123',
  DATABASE_USER: 'flagger',
  DATABASE_PASSWORD: 'dbpass',
  DATABASE_HOST: 'db.example.com',
  DATABASE_NAME: 'flaggerlink',
  JWT_SECRET: 'jwtsecret',
  ENCRYPTION_KEY: 'enckey',
  CLOUDFLARE_ORIGIN_CERT: `-----BEGIN CERTIFICATE-----
MIIEmTCCA4GgAwIBAgIUEmSsvQcI0D1rT8gHLXOcTmi/r84wDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRkwFwYDVQQKExBDbG91ZEZsYXJlLCBJbmMuMTQw
-----END CERTIFICATE-----`,
  CLOUDFLARE_ORIGIN_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+IIu819foOetD
-----END PRIVATE KEY-----`
};

// Import the render function
import('./src/lib/cloud-init.ts').then(module => {
  return module.renderCloudInit({
    secrets: mockSecrets,
    githubToken: 'test_token',
    branch: 'master'
  });
}).then(yaml => {
  console.log('=== RENDERED CLOUD-INIT ===');
  console.log(yaml);
  console.log('\n=== LINE COUNT ===');
  console.log('Total lines:', yaml.split('\n').length);
  console.log('\n=== CHECKING FOR COMMON ISSUES ===');
  
  // Check for unindented certificate lines
  const lines = yaml.split('\n');
  let inCert = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('BEGIN CERTIFICATE') || line.includes('BEGIN PRIVATE KEY')) {
      inCert = true;
    }
    if (inCert && line.match(/^[A-Za-z0-9+\/=]+$/) && !line.startsWith('      ')) {
      console.log(`❌ Line ${i+1} not indented properly: "${line}"`);
    }
    if (line.includes('END CERTIFICATE') || line.includes('END PRIVATE KEY')) {
      inCert = false;
    }
  }
  
  console.log('✅ Template validation complete');
}).catch(err => {
  console.error('❌ Error:', err);
});
