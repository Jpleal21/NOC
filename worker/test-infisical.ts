// Test script to verify Infisical secret fetching
// Run with: npx tsx test-infisical.ts

import { InfisicalService } from './src/services/infisical';

async function testInfisicalSecrets() {
  console.log('========================================');
  console.log('Testing Infisical Secret Fetch');
  console.log('========================================\n');

  // Get credentials from environment variables
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;

  if (!clientId || !clientSecret || !projectId) {
    console.error('❌ Missing required environment variables:');
    console.error('   INFISICAL_CLIENT_ID');
    console.error('   INFISICAL_CLIENT_SECRET');
    console.error('   INFISICAL_PROJECT_ID');
    process.exit(1);
  }

  console.log('✓ Environment variables loaded\n');

  const service = new InfisicalService(
    { clientId, clientSecret },
    projectId
  );

  // Expected secret keys (43 total)
  const expectedSecrets = [
    // Database Secrets - MySQL Main Data (5)
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_DATABASE',
    'MYSQL_USERNAME',
    'MYSQL_PASSWORD',

    // Database Secrets - MySQL Auth (5)
    'AUTH_DB_HOST',
    'AUTH_DB_PORT',
    'AUTH_DB_DATABASE',
    'AUTH_DB_USERNAME',
    'AUTH_DB_PASSWORD',

    // Database Secrets - MySQL Texting (5)
    'TEXTING_DB_HOST',
    'TEXTING_DB_PORT',
    'TEXTING_DB_DATABASE',
    'TEXTING_DB_USERNAME',
    'TEXTING_DB_PASSWORD',

    // Infrastructure - Redis (3)
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',

    // Infrastructure - RabbitMQ (5)
    'RABBITMQ_HOST',
    'RABBITMQ_PORT',
    'RABBITMQ_USERNAME',
    'RABBITMQ_PASSWORD',
    'RABBITMQ_VIRTUAL_HOST',

    // External APIs - Telnyx SMS (6)
    'TELNYX_BASE_URL',
    'TELNYX_API_KEY',
    'TELNYX_MESSAGING_PROFILE_ID',
    'TELNYX_WEBHOOK_KEY',
    'TELNYX_WEBHOOK_URL',
    'TELNYX_FROM_NUMBER',

    // External APIs - SMTP2GO Email (1)
    'SMTP2GO_API_KEY',

    // External APIs - Chargebee Billing (4)
    'CHARGEBEE_SITE',
    'CHARGEBEE_API_KEY',
    'CHARGEBEE_CF_CLIENT_ID',
    'CHARGEBEE_CF_CLIENT_SECRET',

    // External APIs - Billing Worker (1)
    'BILLING_WORKER_API_KEY',

    // Application Secrets - Authentication (4)
    'INVITATION_SIGNING_KEY',
    'MFA_SESSION_KEY',
    'JWT_SECRET',
    'ENCRYPTION_KEY',

    // Application Secrets - Internal API Keys (3)
    'TEXTING_SERVICE_API_KEY',
    'TEXTING_NOTIFICATION_KEY',
    'FLAGGER_API_KEY',

    // SSL/TLS Certificates (2)
    'CLOUDFLARE_ORIGIN_CERT',
    'CLOUDFLARE_ORIGIN_KEY',
  ];

  // Test staging environment
  console.log('Testing STAGING environment...\n');
  try {
    const stagingSecrets = await service.getSecrets('staging');

    const missingStaging: string[] = [];
    const emptyStaging: string[] = [];

    expectedSecrets.forEach(key => {
      const value = (stagingSecrets as any)[key];
      if (value === undefined) {
        missingStaging.push(key);
      } else if (value === '') {
        emptyStaging.push(key);
      }
    });

    if (missingStaging.length === 0 && emptyStaging.length === 0) {
      console.log('✅ STAGING: All 43 secrets fetched successfully!');
    } else {
      if (missingStaging.length > 0) {
        console.log(`❌ STAGING: ${missingStaging.length} secrets missing from interface:`);
        missingStaging.forEach(key => console.log(`   - ${key}`));
      }
      if (emptyStaging.length > 0) {
        console.log(`⚠️  STAGING: ${emptyStaging.length} secrets are empty (not in Infisical):`);
        emptyStaging.forEach(key => console.log(`   - ${key}`));
      }
    }
  } catch (error) {
    console.error('❌ STAGING: Failed to fetch secrets');
    console.error(error);
  }

  console.log('\n');

  // Test production environment
  console.log('Testing PRODUCTION environment...\n');
  try {
    const prodSecrets = await service.getSecrets('production');

    const missingProd: string[] = [];
    const emptyProd: string[] = [];

    expectedSecrets.forEach(key => {
      const value = (prodSecrets as any)[key];
      if (value === undefined) {
        missingProd.push(key);
      } else if (value === '') {
        emptyProd.push(key);
      }
    });

    if (missingProd.length === 0 && emptyProd.length === 0) {
      console.log('✅ PRODUCTION: All 43 secrets fetched successfully!');
    } else {
      if (missingProd.length > 0) {
        console.log(`❌ PRODUCTION: ${missingProd.length} secrets missing from interface:`);
        missingProd.forEach(key => console.log(`   - ${key}`));
      }
      if (emptyProd.length > 0) {
        console.log(`⚠️  PRODUCTION: ${emptyProd.length} secrets are empty (not in Infisical):`);
        emptyProd.forEach(key => console.log(`   - ${key}`));
      }
    }
  } catch (error) {
    console.error('❌ PRODUCTION: Failed to fetch secrets');
    console.error(error);
  }

  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================');
}

testInfisicalSecrets().catch(console.error);
