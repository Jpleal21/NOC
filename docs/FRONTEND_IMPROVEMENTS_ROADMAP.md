# NOC Frontend Improvements Roadmap

**Created:** 2026-01-02
**Status:** Planning Document
**Priority:** Implement after Quick Wins (Pinia, Router, Toasts, History Table, SSE)

---

## Overview

This document outlines architectural improvements and feature additions for the NOC frontend as it scales beyond the initial deployment form.

---

## 1. Component Library Integration

### Why
Pre-built, accessible, tested components save development time and ensure consistency.

### Recommended Options

**PrimeVue** (Recommended)
- ✅ Comprehensive component set
- ✅ Works great with Tailwind CSS
- ✅ Excellent documentation
- ✅ Active maintenance
- 📦 `npm install primevue primeicons`

**Naive UI**
- ✅ Modern, lightweight
- ✅ Great developer experience
- ✅ Beautiful default styling
- 📦 `npm install naive-ui`

**Element Plus**
- ✅ Mature, enterprise-ready
- ✅ Large component library
- ✅ Vue 3 compatible
- 📦 `npm install element-plus`

### Components to Use

**Immediate:**
- Table component (sorting, filtering, pagination)
- Modal/Dialog components
- Toast notifications (if not using vue-sonner)
- Loading states/skeletons
- Form components with built-in validation

**Future:**
- Charts for server metrics
- Timeline for deployment history
- Tree for server hierarchy
- Tabs for multi-view pages

---

## 2. Real-time Deployment Status Dashboard

### Goal
Provide at-a-glance view of all servers and their health status.

### Features

**Server Grid View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Active Servers (6)                        ⟳ Auto-refresh    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ alpha       │  │ bravo       │  │ charlie     │          │
│ │ ● CORE      │  │ ● CORE      │  │ ● CORE      │          │
│ │ master      │  │ master      │  │ staging     │          │
│ │ ✓ Healthy   │  │ ✓ Healthy   │  │ ⚠ Warning   │          │
│ │ 24d uptime  │  │ 18d uptime  │  │ 2h uptime   │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ delta       │  │ echo        │  │ foxtrot     │          │
│ │ ● FULL      │  │ ● CORE      │  │ ● CORE      │          │
│ │ master      │  │ staging     │  │ dev         │          │
│ │ ✓ Healthy   │  │ 🔄 Deploy.. │  │ ❌ Failed   │          │
│ │ 12d uptime  │  │ --          │  │ --          │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**Status Indicators:**
- 🟢 Healthy (all services running)
- 🟡 Warning (partial services, high resource usage)
- 🔴 Failed (deployment failed, services down)
- 🔵 Deploying (deployment in progress)

**Real-time Updates via SSE:**
```javascript
// Dashboard receives updates for all servers
const eventSource = new EventSource('/api/servers/stream')
eventSource.onmessage = (event) => {
  const { server_name, status, uptime } = JSON.parse(event.data)
  updateServerCard(server_name, status, uptime)
}
```

**Click Actions:**
- Click server card → Navigate to server details page
- Hover → Show quick stats (CPU, RAM, disk)
- Right-click → Context menu (redeploy, logs, SSH info, delete)

---

## 3. Cloud-Init Log Viewer

### Goal
Debug deployment issues by viewing cloud-init execution logs directly in the UI.

### Implementation

**Backend Endpoint:**
```typescript
// GET /api/droplets/{droplet_id}/cloud-init-logs
async function getCloudInitLogs(dropletId: string) {
  // Call DigitalOcean API to fetch droplet metadata
  const response = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}`,
    { headers: { Authorization: `Bearer ${DO_API_TOKEN}` } }
  )

  // SSH into droplet and fetch cloud-init logs
  const logs = await execSSH(dropletIp, 'cat /var/log/cloud-init-output.log')

  return {
    status: 'done' | 'running' | 'error',
    logs: logs,
    errors: parseCloudInitErrors(logs)
  }
}
```

**Frontend Component:**
```vue
<template>
  <Modal title="Cloud-Init Logs - bravo">
    <div class="log-viewer">
      <!-- Progress indicators -->
      <div class="progress-steps">
        <Step completed>Installing .NET 8.0 ✓</Step>
        <Step completed>Configuring Redis ✓</Step>
        <Step completed>Installing RabbitMQ ✓</Step>
        <Step active>Cloning repository ⏳</Step>
        <Step pending>Starting services</Step>
      </div>

      <!-- Raw logs with syntax highlighting -->
      <pre class="logs">{{ cloudInitLogs }}</pre>

      <!-- Error summary if any -->
      <Alert v-if="errors.length" type="error">
        Found {{ errors.length }} errors in cloud-init
      </Alert>
    </div>
  </Modal>
</template>
```

**Features:**
- Real-time log streaming during deployment
- Syntax highlighting for better readability
- Auto-scroll to bottom as logs arrive
- Error detection and highlighting
- Download logs as .txt file
- Filter logs by severity (info/warning/error)

---

## 4. Server Details Page

### Goal
Deep dive into individual server status, services, and operations.

### Route
`/servers/:server_name`

### Layout
```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Servers                                        │
├──────────────────────────────────────────────────────────┤
│ Server: bravo                            [Redeploy ▼]    │
│ ● CORE Profile | master branch | 192.168.1.50           │
├──────────────────────────────────────────────────────────┤
│ ┌─ Services ──────────┐  ┌─ Resources ─────────┐        │
│ │ ✓ Main API          │  │ CPU:  24%           │        │
│ │ ✓ Texting Service   │  │ RAM:  1.8GB / 4GB   │        │
│ │ ✓ Web Frontend      │  │ Disk: 12GB / 80GB   │        │
│ │ ✓ Redis             │  │ Load: 0.42          │        │
│ │ ✓ RabbitMQ          │  └─────────────────────┘        │
│ │ ✓ Nginx             │                                  │
│ └─────────────────────┘  ┌─ Quick Actions ─────┐        │
│                          │ 🔄 Restart Services │        │
│ ┌─ Details ────────────┐│ 📋 View Logs        │        │
│ │ Droplet ID: 12345678││ 💻 SSH Info         │        │
│ │ Region: nyc3        ││ 🗑️  Delete Server   │        │
│ │ Size: s-2vcpu-4gb   ││                     │        │
│ │ Created: 2026-01-01 │└─────────────────────┘        │
│ │ Uptime: 24d 6h 12m  │                                │
│ └─────────────────────┘                                │
│                                                         │
│ ┌─ Recent Deployments ────────────────────────────────┐│
│ │ 2026-01-01 14:30  master  SUCCESS  6m 24s          ││
│ │ 2025-12-28 09:15  staging SUCCESS  5m 51s          ││
│ │ 2025-12-20 16:45  master  FAILED   2m 10s (logs)   ││
│ └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Data Sources

**Server Info:**
- From D1: server_name, profile, branch, deployment records
- From DigitalOcean API: droplet_id, ip, region, size, created_at

**Service Status:**
- SSH into server, run `systemctl status flaggerlink-*`
- Parse output to show running/stopped/failed

**Resources:**
- DigitalOcean Monitoring API (if enabled)
- Or SSH: `top -bn1`, `df -h`, `free -m`

**Real-time Updates:**
- SSE connection to `/api/servers/{name}/stream`
- Updates every 30 seconds

---

## 5. Form Improvements

### 5.1 Configuration Presets

**Goal:** Save time by reusing common configurations.

```vue
<template>
  <div class="preset-selector">
    <label>Quick Deploy</label>
    <select v-model="selectedPreset" @change="loadPreset">
      <option value="">Custom Configuration</option>
      <option value="prod-worker">Production Worker (CORE)</option>
      <option value="staging-worker">Staging Worker (CORE)</option>
      <option value="standalone">Standalone System (FULL)</option>
    </select>
  </div>
</template>

<script>
const PRESETS = {
  'prod-worker': {
    droplet_size: 's-2vcpu-4gb',
    deployment_profile: 'core',
    branch: 'master',
    enable_backups: true,
    enable_cloudflare_proxy: true,
    tags: ['production', 'worker']
  },
  'standalone': {
    droplet_size: 's-4vcpu-8gb',
    deployment_profile: 'full',
    branch: 'master',
    enable_backups: true,
    tags: ['production', 'standalone']
  }
}
</script>
```

### 5.2 "Deploy Like..." Button

**Goal:** Clone configuration from existing server.

```vue
<button @click="showCloneModal">
  📋 Clone from existing server
</button>

<Modal v-if="cloneModal">
  <h3>Clone Configuration From:</h3>
  <select v-model="cloneSource">
    <option value="alpha">alpha (CORE, master, s-2vcpu-4gb)</option>
    <option value="bravo">bravo (CORE, master, s-2vcpu-4gb)</option>
    <option value="delta">delta (FULL, master, s-4vcpu-8gb)</option>
  </select>
  <button @click="cloneConfig">Clone & Edit</button>
</Modal>
```

### 5.3 Deployment Cost Estimator

**Goal:** Show estimated monthly cost before deploying.

```vue
<div class="cost-estimate">
  <h4>Estimated Monthly Cost</h4>
  <div class="cost-breakdown">
    <div>Droplet ({{ form.droplet_size }}): $24.00</div>
    <div v-if="form.enable_backups">Backups (+20%): $4.80</div>
    <div>Total: <strong>${{ totalCost }}/month</strong></div>
  </div>
</div>

<script>
const DROPLET_COSTS = {
  's-2vcpu-4gb': 24,
  's-4vcpu-8gb': 48,
  's-8vcpu-16gb': 96
}

const totalCost = computed(() => {
  let cost = DROPLET_COSTS[form.droplet_size]
  if (form.enable_backups) cost *= 1.2
  return cost.toFixed(2)
})
</script>
```

### 5.4 Deployment Preview Modal

**Goal:** Confirm all settings before deploying.

```vue
<button @click="showPreview">Review & Deploy</button>

<Modal v-if="preview">
  <h3>Confirm Deployment</h3>
  <table>
    <tr><td>Server Name:</td><td><strong>{{ form.server_name }}</strong></td></tr>
    <tr><td>Profile:</td><td><Badge>{{ form.deployment_profile.toUpperCase() }}</Badge></td></tr>
    <tr><td>Branch:</td><td>{{ form.branch }}</td></tr>
    <tr><td>Size:</td><td>{{ form.droplet_size }}</td></tr>
    <tr><td>Region:</td><td>{{ form.droplet_region }}</td></tr>
    <tr><td>Est. Cost:</td><td>${{ estimatedCost }}/mo</td></tr>
  </table>

  <div class="services-to-deploy">
    <h4>Services to Deploy:</h4>
    <ul v-if="form.deployment_profile === 'core'">
      <li>✓ Main API</li>
      <li>✓ Texting Service</li>
      <li>✓ Web Frontend</li>
      <li>❌ Portal API (uses centralized portal)</li>
      <li>❌ UserPortal (uses centralized portal)</li>
    </ul>
    <ul v-else>
      <li>✓ Portal API (LOCAL)</li>
      <li>✓ Main API</li>
      <li>✓ Texting Service</li>
      <li>✓ Web Frontend</li>
      <li>✓ UserPortal (LOCAL)</li>
    </ul>
  </div>

  <button @click="confirmDeploy" class="primary">
    🚀 Deploy Server
  </button>
  <button @click="preview = false">Cancel</button>
</Modal>
```

### 5.5 Form Validation with VeeValidate

**Goal:** Real-time validation feedback.

```bash
npm install vee-validate yup
```

```vue
<script setup>
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

const schema = yup.object({
  server_name: yup.string()
    .required('Server name is required')
    .matches(/^[a-z]+$/, 'Only lowercase letters allowed')
    .min(3, 'Minimum 3 characters')
    .max(20, 'Maximum 20 characters'),
  droplet_region: yup.string().required('Region is required'),
  vpc_uuid: yup.string().required('VPC is required'),
  database_id: yup.string().required('Database is required'),
  ssh_keys: yup.array().min(1, 'At least one SSH key required')
})

const { handleSubmit, errors } = useForm({ validationSchema: schema })
const { value: serverName } = useField('server_name')
</script>

<template>
  <input v-model="serverName" :class="{ error: errors.server_name }" />
  <span class="error-message">{{ errors.server_name }}</span>
</template>
```

---

## 6. TypeScript Migration

### Why TypeScript?

**Benefits:**
- Type safety catches bugs at compile time
- Better IDE autocomplete and IntelliSense
- Self-documenting code via types
- Easier refactoring
- Better collaboration on larger teams

### Migration Strategy

**Phase 1: Setup** (1 hour)
```bash
npm install -D typescript @vue/tsconfig @types/node
```

Create `tsconfig.json`:
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

**Phase 2: Type Definitions** (2 hours)

```typescript
// types/noc.ts

export type DeploymentProfile = 'core' | 'full'

export interface DeploymentConfig {
  server_name: string
  droplet_size: 's-2vcpu-4gb' | 's-4vcpu-8gb' | 's-8vcpu-16gb'
  droplet_region: string
  vpc_uuid: string
  branch: string
  deployment_profile: DeploymentProfile
  reserved_ip?: string
  ssh_keys: number[]
  firewall_id?: string
  database_id: string
  enable_backups: boolean
  enable_cloudflare_proxy: boolean
  tags: string[]
}

export interface Deployment {
  id: number
  server_name: string
  droplet_id?: number
  ip_address?: string
  region: string
  branch: string
  deployment_type: string
  deployment_profile: DeploymentProfile
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  workflow_url?: string
  created_at: string
  created_by: string
}

export interface Server {
  id: number
  name: string
  droplet_id: number
  ip_address: string
  status: 'healthy' | 'warning' | 'failed' | 'deploying'
  profile: DeploymentProfile
  branch: string
  uptime_seconds: number
  created_at: string
}

export interface CloudInitLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'failed'
  uptime?: string
}
```

**Phase 3: Migrate Components** (incremental)

Start with new components in TypeScript, gradually migrate existing ones.

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { DeploymentConfig } from '@/types/noc'

const form = reactive<DeploymentConfig>({
  server_name: '',
  droplet_size: 's-2vcpu-4gb',
  droplet_region: '',
  vpc_uuid: '',
  branch: 'master',
  deployment_profile: 'core',
  ssh_keys: [],
  database_id: '',
  enable_backups: false,
  enable_cloudflare_proxy: false,
  tags: []
})

const deploying = ref<boolean>(false)

async function handleSubmit(): Promise<void> {
  deploying.value = true
  // TypeScript ensures form matches DeploymentConfig interface
  const response = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  })
  // ... handle response
}
</script>
```

**Phase 4: Type-safe API Layer**

```typescript
// services/noc-api.ts
import type { DeploymentConfig, Deployment, Server } from '@/types/noc'

export const nocAPI = {
  async deploy(config: DeploymentConfig): Promise<Deployment> {
    const response = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      throw new Error(`Deployment failed: ${response.statusText}`)
    }

    return await response.json()
  },

  async getDeployments(): Promise<Deployment[]> {
    const response = await fetch('/api/deployments')
    return await response.json()
  },

  async getServers(): Promise<Server[]> {
    const response = await fetch('/api/servers')
    return await response.json()
  },

  async getCloudInitLogs(dropletId: number): Promise<string> {
    const response = await fetch(`/api/droplets/${dropletId}/cloud-init-logs`)
    const { logs } = await response.json()
    return logs
  }
}
```

---

## 7. Advanced Features (Future)

### 7.1 Bulk Operations

**Deploy multiple servers at once:**
```vue
<button @click="bulkDeploy">
  Deploy 5 servers (alpha-echo)
</button>

<!-- Automatically creates: alpha, bravo, charlie, delta, echo -->
<!-- All with same config, incremental names -->
```

### 7.2 Server Templates

**Save deployment configurations as templates:**
```typescript
interface Template {
  name: string
  description: string
  config: Partial<DeploymentConfig>
}

// Example templates
const templates: Template[] = [
  {
    name: 'Production Worker',
    description: 'Standard CORE profile worker server',
    config: {
      droplet_size: 's-2vcpu-4gb',
      deployment_profile: 'core',
      branch: 'master',
      enable_backups: true,
      enable_cloudflare_proxy: true
    }
  }
]
```

### 7.3 Deployment Scheduling

**Schedule deployments for later:**
```vue
<input type="datetime-local" v-model="scheduledTime" />
<button @click="scheduleDeployment">
  Schedule for {{ scheduledTime }}
</button>

<!-- Backend: Cloudflare Durable Objects or Cron Triggers -->
```

### 7.4 Server Groups

**Organize servers into logical groups:**
```typescript
interface ServerGroup {
  name: string
  servers: string[]
  auto_deploy: boolean // Deploy to all on push
}

// Example groups
const groups: ServerGroup[] = [
  { name: 'Production', servers: ['alpha', 'bravo', 'charlie'], auto_deploy: false },
  { name: 'Staging', servers: ['staging-1', 'staging-2'], auto_deploy: true },
  { name: 'Development', servers: ['dev-1'], auto_deploy: true }
]
```

### 7.5 Resource Usage Charts

**Display CPU/RAM/Disk trends:**
```vue
<template>
  <div class="charts">
    <LineChart :data="cpuHistory" title="CPU Usage (7 days)" />
    <LineChart :data="ramHistory" title="RAM Usage (7 days)" />
    <LineChart :data="diskHistory" title="Disk Usage (7 days)" />
  </div>
</template>

<!-- Use Chart.js or ApexCharts -->
<!-- Data from DigitalOcean Monitoring API -->
```

### 7.6 Webhook Integrations

**Notify external systems on deployment events:**
```typescript
interface Webhook {
  url: string
  events: ('deployment.started' | 'deployment.completed' | 'deployment.failed')[]
  secret: string
}

// Example: Post to Slack on deployment completion
POST https://hooks.slack.com/services/xxx
{
  "text": "🚀 Server `bravo` deployed successfully!"
}
```

### 7.7 Audit Log

**Track all NOC actions:**
```typescript
interface AuditLogEntry {
  id: number
  timestamp: string
  user: string
  action: 'deploy' | 'delete' | 'redeploy' | 'update_config'
  target: string // server name
  details: Record<string, any>
  ip_address: string
}

// Example log entry
{
  timestamp: '2026-01-02T10:30:00Z',
  user: 'jimmy@flaggerlink.com',
  action: 'deploy',
  target: 'foxtrot',
  details: {
    profile: 'core',
    branch: 'master',
    region: 'nyc3'
  },
  ip_address: '192.168.1.100'
}
```

---

## 8. Testing Strategy

### Unit Tests (Vitest)

```bash
npm install -D vitest @vue/test-utils
```

```typescript
// tests/components/DeploymentForm.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeploymentForm from '@/components/DeploymentForm.vue'

describe('DeploymentForm', () => {
  it('validates server name format', async () => {
    const wrapper = mount(DeploymentForm)
    const input = wrapper.find('input[name="server_name"]')

    await input.setValue('INVALID')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Only lowercase letters allowed')
  })

  it('sets default profile to core', () => {
    const wrapper = mount(DeploymentForm)
    expect(wrapper.vm.form.deployment_profile).toBe('core')
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/deployment.spec.ts
import { test, expect } from '@playwright/test'

test('deploy new server', async ({ page }) => {
  await page.goto('http://localhost:5173/deploy')

  // Fill form
  await page.fill('input[name="server_name"]', 'testserver')
  await page.selectOption('select[name="droplet_region"]', 'nyc3')
  await page.selectOption('select[name="deployment_profile"]', 'core')

  // Submit
  await page.click('button:has-text("Deploy Server")')

  // Verify success
  await expect(page.locator('.toast')).toContainText('Server deployed successfully')
})
```

---

## 9. Performance Optimizations

### 9.1 Code Splitting

```javascript
// router/index.js
const routes = [
  {
    path: '/deploy',
    component: () => import('@/views/DeployView.vue') // Lazy load
  },
  {
    path: '/deployments',
    component: () => import('@/views/DeploymentsView.vue')
  }
]
```

### 9.2 Virtual Scrolling

For large deployment history tables:

```bash
npm install vue-virtual-scroller
```

```vue
<RecycleScroller
  :items="deployments"
  :item-size="60"
  key-field="id"
>
  <template #default="{ item }">
    <DeploymentRow :deployment="item" />
  </template>
</RecycleScroller>
```

### 9.3 Request Debouncing

```javascript
import { debounce } from 'lodash-es'

const searchServers = debounce((query) => {
  fetch(`/api/servers?search=${query}`)
}, 300)
```

---

## 10. Accessibility (a11y)

### Guidelines

- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG AA compliance minimum

### Example

```vue
<button
  aria-label="Deploy server bravo"
  @click="deploy('bravo')"
>
  🚀 Deploy
</button>

<input
  type="text"
  aria-label="Server name"
  aria-describedby="server-name-help"
  v-model="serverName"
/>
<span id="server-name-help">
  Use lowercase letters only (e.g., alpha, bravo)
</span>
```

---

## Implementation Priority

### Phase 1 (Week 1)
- ✅ Quick Wins (Pinia, Router, Toasts, History, SSE)

### Phase 2 (Week 2)
- Component library integration (PrimeVue)
- Cloud-init log viewer
- Server details page

### Phase 3 (Week 3)
- Form improvements (presets, cost estimator, preview)
- Deployment status dashboard

### Phase 4 (Week 4)
- TypeScript migration (setup + core types)
- Form validation (VeeValidate)
- Basic testing setup

### Phase 5 (Month 2)
- Advanced features (bulk operations, templates)
- Resource usage charts
- Audit log

---

## Maintenance Notes

- Keep dependencies updated (`npm outdated`, `npm update`)
- Monitor bundle size (`npm run build -- --report`)
- Review Lighthouse scores for performance/accessibility
- Document new components in Storybook (optional)

---

**Last Updated:** 2026-01-02
**Next Review:** After Quick Wins implementation
