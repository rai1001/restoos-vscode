# ChefOS — DevOps Workflow Setup

## Arquitectura del Workflow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   JIRA      │────▶│   GITHUB     │────▶│   SLACK      │
│  (Planning) │◀────│   (Code)     │◀────│  (Comms)     │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                     │
       │            ┌──────┴───────┐             │
       │            │   VERCEL     │             │
       └───────────▶│  (Deploy)    │◀────────────┘
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   SENTRY     │────▶ Slack alerts
                    │ (Monitoring) │
                    └──────────────┘
```

## Flujo de Trabajo

1. **Jira → GitHub**: Issue en Jira → crear branch → PR → merge
2. **GitHub → Vercel**: Push a main → deploy automatico
3. **GitHub → Slack**: PR creado/mergeado → notificacion en #dev
4. **Sentry → Slack**: Error en produccion → alerta en #alerts
5. **Jira → Slack**: Cambio de estado de ticket → notificacion

---

## PASO 1: Configurar GitHub Repository

### 1.1 Crear repo en GitHub
```bash
cd "C:\culinary claude\chefos"
git init
git add .
git commit -m "Initial commit: ChefOS v1.0 - 46 pages, 6 engines, 149 tests"
gh repo create chefos --private --source=. --push
```

### 1.2 Branch protection (main)
```bash
gh api repos/{owner}/chefos/branches/main/protection -X PUT -f '{
  "required_pull_request_reviews": {"required_approving_review_count": 0},
  "required_status_checks": {"strict": true, "contexts": ["test"]},
  "enforce_admins": false
}'
```

---

## PASO 2: GitHub Actions — CI/CD

### 2.1 Test + Lint on PR
Crear `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - name: Build check
        run: npm run build

  notify-slack:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "${{ job.status == 'success' && '✅' || '❌' }} CI ${{ github.event.pull_request.title || github.ref_name }}: ${{ job.status }}\n${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
```

### 2.2 Deploy a Vercel on merge to main
```yaml
# Vercel handles this automatically when connected to the repo
# No need for a separate workflow
```

---

## PASO 3: Configurar Jira

### 3.1 Proyecto en Jira
- Nombre: **CHEF**
- Tipo: Scrum board
- Columnas: Backlog → To Do → In Progress → Code Review → Done

### 3.2 Issue Types
| Tipo | Icono | Uso |
|------|-------|-----|
| Epic | 🟣 | Modulo completo (ej: "Supabase Integration") |
| Story | 🟢 | Feature de usuario (ej: "Como chef quiero crear receta") |
| Task | 🔵 | Tarea tecnica (ej: "Configurar RLS policies") |
| Bug | 🔴 | Error reportado |
| Subtask | ⚪ | Subtarea dentro de un story |

### 3.3 Epics iniciales
1. **CHEF-1**: Supabase Integration (Auth + DB + Storage)
2. **CHEF-2**: Landing Page & Marketing
3. **CHEF-3**: Deploy Production (Vercel + Supabase)
4. **CHEF-4**: RestoOS Fork
5. **CHEF-5**: Mobile App (PWA/Capacitor)
6. **CHEF-6**: Remotion Video Rendering
7. **CHEF-7**: UI Polish & Testing

### 3.4 Jira + GitHub Integration
1. Instalar "GitHub for Jira" app en Jira
2. Conectar el repo de GitHub
3. Usar smart commits: `CHEF-123 #comment Fixed the bug #done`
4. Branch naming: `feature/CHEF-123-recipe-creation`

### 3.5 Jira + Slack Integration
1. Instalar "Jira Cloud for Slack" en tu workspace
2. Conectar proyecto CHEF
3. Configurar notificaciones:
   - Canal #dev: cambios de estado, PRs, deploys
   - Canal #alerts: bugs criticos, errores Sentry

---

## PASO 4: Configurar Slack

### 4.1 Canales
| Canal | Proposito |
|-------|-----------|
| #chefos-general | Comunicacion general del equipo |
| #chefos-dev | PRs, merges, deploys, CI results |
| #chefos-alerts | Errores Sentry, bugs criticos, downtime |
| #chefos-design | Feedback de UI/UX, screenshots |
| #chefos-viktor | Canal para Viktor agent |

### 4.2 Slack Webhook para GitHub Actions
1. Ir a api.slack.com/apps → Create New App
2. Incoming Webhooks → Activate → Add New Webhook to #chefos-dev
3. Copiar URL del webhook
4. En GitHub repo → Settings → Secrets → New secret: `SLACK_WEBHOOK_URL`

### 4.3 Slack + Sentry
1. En Sentry → Settings → Integrations → Slack
2. Conectar workspace
3. Alert Rules:
   - New issue → #chefos-alerts
   - Issue regression → #chefos-alerts
   - Error count > 10 in 1h → #chefos-alerts + @channel

---

## PASO 5: Configurar Sentry

### 5.1 Sentry SDK en ChefOS
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 5.2 Archivos a crear
`sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

`sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 5.3 Source Maps en Vercel
```bash
# En vercel.json
{
  "env": {
    "SENTRY_ORG": "rai-vp",
    "SENTRY_PROJECT": "chefos"
  }
}
```

---

## PASO 6: Configurar Vercel

### 6.1 Conectar repo
```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SENTRY_DSN
vercel env add SENTRY_AUTH_TOKEN
vercel env add RESEND_API_KEY
```

### 6.2 Preview Deployments
- Cada PR genera un preview URL automatico
- Preview URL se postea como comment en el PR
- Preview URL se puede compartir en Slack para review

---

## PASO 7: Workflow Diario del Equipo

### Morning (9:00)
1. Viktor posta daily standup en #chefos-general
2. Revisar Jira board → mover tickets a "In Progress"
3. Crear branch desde Jira: `feature/CHEF-XXX-description`

### Development
1. Codigo en branch feature
2. Push → CI runs tests automaticamente
3. Crear PR → notificacion en #chefos-dev
4. PR description incluye link a Jira ticket

### Review & Merge
1. PR aprobado → merge a main
2. Vercel deploy automatico a preview
3. Tests pasan → deploy a production
4. Jira ticket se mueve a "Done" automaticamente (smart commits)
5. Slack notifica merge + deploy URL

### Monitoring
1. Sentry detecta error → alerta en #chefos-alerts
2. Viktor revisa y notifica con contexto
3. Se crea bug en Jira automaticamente (Sentry → Jira integration)

---

## Variables de Entorno Necesarias

| Variable | Donde | Descripcion |
|----------|-------|-------------|
| `SLACK_WEBHOOK_URL` | GitHub Secrets | Webhook para #chefos-dev |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel + .env | DSN de Sentry |
| `SENTRY_AUTH_TOKEN` | Vercel + GitHub | Token para source maps |
| `SENTRY_ORG` | Vercel | Organizacion Sentry |
| `SENTRY_PROJECT` | Vercel | Proyecto Sentry |
| `RESEND_API_KEY` | Vercel | API key para emails |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + .env | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + .env | Anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Service role (server only) |

---

## Comandos Rapidos

```bash
# Crear branch desde Jira ticket
git checkout -b feature/CHEF-123-recipe-photo-upload

# Commit con smart commit (mueve ticket en Jira)
git commit -m "CHEF-123 #comment Added photo upload to recipes #done"

# Push y crear PR
git push -u origin feature/CHEF-123-recipe-photo-upload
gh pr create --title "CHEF-123: Recipe photo upload" --body "Closes CHEF-123"

# Ver estado CI
gh run list --limit 5

# Ver deploy Vercel
vercel ls
```
