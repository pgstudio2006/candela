# Deploying Candela on Hostinger VPS

Production deployment guide for **candela.adrine.in** on a Hostinger VPS with PostgreSQL, Node.js, and Nginx.

## Requirements

- Hostinger VPS (Ubuntu 22.04+ recommended)
- Domain pointed to VPS IP (`candela.adrine.in`)
- Node.js 20 LTS
- PostgreSQL 15+
- Nginx
- PM2 (process manager)

## 1. Server setup

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2
```

## 2. PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER candela WITH PASSWORD 'your-strong-password';
CREATE DATABASE candela OWNER candela;
GRANT ALL PRIVILEGES ON DATABASE candela TO candela;
\q
```

## 3. Clone and configure

```bash
cd /var/www
git clone <your-repo-url> candela
cd candela
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://candela:your-strong-password@localhost:5432/candela?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXT_PUBLIC_APP_URL="https://candela.adrine.in"
NODE_ENV="production"
```

Generate auth secret:

```bash
openssl rand -base64 32
```

## 4. Install, migrate, seed

```bash
npm ci
npm run db:generate
npm run db:push
npm run build
```

### Production (no demo patients)

On first deploy, **do not** run `db:seed` unless you want demo data. The app auto-bootstraps **departments, doctors, and admin settings** on first front-desk load via `ensureHospitalBootstrap()`.

Set tenant/branch/users via your normal onboarding (or `prisma/seed.ts` for initial org only).

Optional env for GST tax invoices:

```env
NODE_ENV=production
ALLOW_DEMO_SEED=false
NOTIFICATIONS_DEMO=false
BRANCH_GSTIN=06AABCN1234F1Z9
BRANCH_LEGAL_NAME=Navayu Spine & Joint Care Pvt Ltd
BRANCH_ADDRESS=Sector 44, Gurgaon, Haryana 122003
BRANCH_STATE=Haryana
OPD_GST_RATE=0
OPD_GST_MODE=exempt
```

Or store GST in branch `meta.gst` JSON: `{ "gstin", "legalName", "address", "placeOfSupply", "sacCode": "999312", "gstRatePercent", "taxMode" }`.

### Development / demo

```bash
npm run db:seed
```

## 5. PM2

```bash
pm2 start npm --name candela -- start
pm2 save
pm2 startup
```

App listens on port 3000 by default.

## 6. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/candela
```

```nginx
server {
    listen 80;
    server_name candela.adrine.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/candela /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d candela.adrine.in
```

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Demo logins (after seed)

| Module | Email | Password |
|--------|-------|----------|
| Front Desk | staff@navayu.in | demo2026 |
| Doctor | doctor@navayu.in | demo2026 |
| Nurse | nurse@navayu.in | demo2026 |
| Pharmacy | pharmacy@navayu.in | pharma2026 |
| Counsellor | priya@navayu.in | priya2026 |
| CRM | crm@navayu.in | crm2026 |
| HR | hr@navayu.in | hr2026 |
| Admin | admin@navayu.in | admin2026 |

## Updates

```bash
cd /var/www/candela
git pull
npm ci
npm run db:generate
npm run db:push   # or db:migrate for production migrations
npm run build
pm2 restart candela
```

## Architecture notes

- **Single monolith**: Next.js 16 + Prisma + PostgreSQL + Server Actions
- **Auth**: Auth.js v5 with JWT sessions; all server actions require authenticated session
- **No external API**: All 8 modules persist to PostgreSQL
- **Marketing site**: Stays on Adrine project at candela.adrine.in showcase — this app handles `/login` → `/app/*`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | Check `pm2 logs candela` — app may not be running |
| Database connection | Verify `DATABASE_URL` and PostgreSQL is running |
| Auth errors | Ensure `AUTH_SECRET` is set and `NEXT_PUBLIC_APP_URL` matches domain |
| Build fails | Run `npm run db:generate` before `npm run build` |
