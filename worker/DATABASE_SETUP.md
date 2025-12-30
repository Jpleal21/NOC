# NOC Platform - D1 Database Setup

This document explains how to set up the D1 database for the NOC Platform.

## Overview

The NOC Platform uses Cloudflare D1 (SQLite) to store:
- **Deployment History**: All infrastructure and application deployments
- **Server Tags**: Custom labels for organizing servers

## Database Setup

### 1. Create the D1 Database

```bash
cd /mnt/c/source/NOC/worker

# Create the database
npx wrangler d1 create noc-platform
```

This will output something like:
```
✅ Successfully created DB 'noc-platform'
   ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. Update wrangler.jsonc

Copy the database ID from the output above and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "noc-platform",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // <-- Paste ID here
  }
]
```

### 3. Apply the Schema

Run the schema migration to create all tables:

```bash
# For local development
npx wrangler d1 execute noc-platform --local --file=schema.sql

# For production (after testing locally)
npx wrangler d1 execute noc-platform --file=schema.sql
```

### 4. Apply Migrations (if upgrading)

If you have an existing database, apply migrations to update the schema:

```bash
# Apply migration to remove webhook_settings table
npx wrangler d1 execute noc-platform --file=migrations/001_remove_webhook_settings.sql
```

### 5. Verify the Database

Check that tables were created:

```bash
# Local
npx wrangler d1 execute noc-platform --local --command="SELECT name FROM sqlite_master WHERE type='table'"

# Production
npx wrangler d1 execute noc-platform --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see:
- `deployments`
- `server_tags`
- `deployment_events`

## Database Schema

### deployments Table
Tracks all server deployments (infrastructure provisioning + application deployments).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| server_name | TEXT | Server name (e.g., "charlie") |
| droplet_id | INTEGER | DigitalOcean droplet ID |
| ip_address | TEXT | Server IP address |
| region | TEXT | DigitalOcean region |
| branch | TEXT | Git branch deployed (master/staging/development) |
| deployment_type | TEXT | 'infrastructure' or 'application' |
| status | TEXT | 'in_progress', 'success', or 'failed' |
| duration | INTEGER | Deployment duration in seconds |
| workflow_url | TEXT | GitHub Actions workflow URL (for app deployments) |
| error_message | TEXT | Error message if failed |
| created_at | TEXT | ISO timestamp of deployment start |
| completed_at | TEXT | ISO timestamp of deployment completion |
| created_by | TEXT | Who triggered the deployment (default: 'noc-platform') |

### server_tags Table
Many-to-many relationship between servers and tags.

| Column | Type | Description |
|--------|------|-------------|
| server_name | TEXT | Server name |
| tag | TEXT | Tag name (e.g., "production", "customer-xyz") |
| created_at | TEXT | ISO timestamp when tag was added |

**Primary Key**: (server_name, tag)

### deployment_events Table (Optional)
Detailed step tracking for debugging deployments.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| deployment_id | INTEGER | Foreign key to deployments.id |
| step | TEXT | Step name ('secrets', 'template', 'droplet', 'dns', etc.) |
| status | TEXT | 'started', 'completed', or 'failed' |
| message | TEXT | Optional message |
| created_at | TEXT | ISO timestamp |

## Testing the Database

### Query Deployments

```bash
# Get all deployments
npx wrangler d1 execute noc-platform --command="SELECT * FROM deployments ORDER BY created_at DESC LIMIT 10"

# Get deployment statistics
npx wrangler d1 execute noc-platform --command="
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
FROM deployments
"
```

### Query Server Tags

```bash
# Get all tags
npx wrangler d1 execute noc-platform --command="SELECT DISTINCT tag FROM server_tags ORDER BY tag"

# Get servers with a specific tag
npx wrangler d1 execute noc-platform --command="SELECT server_name FROM server_tags WHERE tag = 'production'"
```

## Development Workflow

### Local Development
Use `--local` flag to test against a local D1 database:

```bash
# Run worker locally with local D1
npm run dev
# or
npx wrangler dev
```

### Production Deployment
Deploy to production:

```bash
npm run deploy
# or
npx wrangler deploy
```

## API Endpoints

After deployment, the following endpoints are available:

### Deployments
- `GET /api/deployments` - List all deployments (with filtering)
- `GET /api/deployments/stats` - Get deployment statistics

### Server Tags
- `GET /api/servers/:name/tags` - Get tags for a server
- `POST /api/servers/:name/tags` - Add a tag to a server
- `DELETE /api/servers/:name/tags/:tag` - Remove a tag from a server
- `GET /api/tags` - Get all unique tags

## Troubleshooting

### Database ID Not Found
If you get an error about database ID, make sure you:
1. Created the database with `npx wrangler d1 create noc-platform`
2. Copied the correct ID to `wrangler.jsonc`
3. Replaced "TBD" with the actual ID

### Tables Don't Exist
Run the schema migration:
```bash
npx wrangler d1 execute noc-platform --file=schema.sql
```

### Testing Locally
Always test with `--local` first:
```bash
npx wrangler d1 execute noc-platform --local --file=schema.sql
npx wrangler dev
```

## Free Tier Limits

Cloudflare D1 free tier:
- **Storage**: 5 GB
- **Reads**: 5 million per day
- **Writes**: 100,000 per day

More than enough for the NOC Platform!
