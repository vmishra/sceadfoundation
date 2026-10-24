# Server setup — scead.excelfinvest.com

> The canonical deployment doc for this repository. It is generated from the server kit
> (`Projects/server-hel1-4/tools/gen_repo_docs.py`) and was last verified **2026-10-24** on hel1-4 (Hetzner Cloud, 89.167.4.245, Ubuntu 24.04).
> It is self-contained: someone moving this site to a new server needs only this file plus the host baseline.

## 1. Production at a glance

| | |
|---|---|
| Domain(s) | scead.excelfinvest.com |
| Server | hel1-4 (Hetzner Cloud, 89.167.4.245, Ubuntu 24.04); `ssh -p 2222 vmishra@hel1-4` — **over Tailscale only** (public SSH is closed) |
| Traffic | Cloudflare (proxied, SSL Full strict) → nginx :443 → static files |
| Site id | `sceadfoundation` (used by every `site` command) |
| What it is | plain static HTML |
| Repo on server | `/srv/sceadfoundation/repo` (checkout of `vmishra/sceadfoundation` `main`, read-only deploy key `~vmishra/.ssh/deploy_sceadfoundation`, host alias `github-sceadfoundation`) |
| Live build | `/srv/sceadfoundation/current` → `/srv/sceadfoundation/releases/<UTC time>-<commit>` (3 kept) |
| nginx | `/etc/nginx/sites-available/sceadfoundation.conf`; logs `/var/log/nginx/sceadfoundation.access.log` / `.error.log` |
| TLS | Let's Encrypt (`/etc/letsencrypt/live/scead.excelfinvest.com/`), renewed by `certbot.timer` through Cloudflare |
| Backups | nightly 03:30 UTC → `/srv/backups/sceadfoundation/` (14 kept) |

## 2. Everyday operations (on the server, as `vmishra`)

```bash
site status sceadfoundation              # checkout, live release, health, releases, last backups
site deploy sceadfoundation              # pull main → build a NEW release → switch → health check → purge CDN
site deploy sceadfoundation --force      # rebuild the same commit
site rollback sceadfoundation            # previous release
site logs sceadfoundation [-f]

site backup sceadfoundation
```

A deploy builds in a new directory while the current release keeps serving. Only a finished build is switched in. If
the new release fails its health check, the tool switches back automatically, restarts, and sends an urgent phone alert.
`git merge --ff-only` never discards edits made on the server.

## 3. Site-specific notes

- The repo root *is* the website. `site deploy` publishes it with `rsync`, excluding `README.md`, `LICENSE`,
  `nginx-scead.conf`, `docs/` and `.git*`. `screenshots/` **is** published, because `index.html` uses it.
- File names are not content-hashed, so assets are cached for 7 days. Every deploy purges `scead.excelfinvest.com` (only
  this hostname) from Cloudflare.
- **Cloudflare:** the `scead` record must stay **proxied (orange cloud)**. It was DNS-only until 2026-10-24, which exposed
  the server's real IP. The firewall now accepts web traffic only from Cloudflare, so a DNS-only record would go dark.
- `nginx-scead.conf` in the repo is the original vhost. The live one is reproduced below.

## 4. Rebuild on a new server

### 4.1 Host baseline (once per server; skip if the server already hosts sister sites)

The full, current procedure is `/srv/SERVER.md` on any of these servers, and the laptop kit `Projects/server-hel1-4/`
(its `files/` directory holds every config at its installed path). In short, as root on a fresh Ubuntu 24.04:

```bash
# deploy user (key-only SSH; sudo needs a password; the ONLY account allowed to log in)
adduser vmishra && usermod -aG sudo vmishra
install -d -m 700 -o vmishra -g vmishra /home/vmishra/.ssh   # then add your laptop public key to authorized_keys

# packages + Node 24 LTS; pin npm to the version your laptop uses (lockfiles are npm-version sensitive)
apt-get update && apt-get -y full-upgrade
apt-get install -y nginx certbot python3-certbot-nginx git curl build-essential sqlite3 rsync ufw fail2ban \
                   unattended-upgrades python3-venv jq
curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs
npm install -g npm@11.6.2

# SSH: keys only           -> /etc/ssh/sshd_config.d/99-hardening.conf (copy from the kit): no passwords, AllowUsers vmishra,
#   PermitRootLogin no, modern KEX/ciphers/MACs only, no X11/agent/reverse-tunnel forwarding, MaxAuthTries 3,
#   MaxStartups 10:30:60, LogLevel VERBOSE                                   (sshd -t && systemctl reload ssh)
# fail2ban                 -> /etc/fail2ban/jail.local: [sshd] mode=aggressive, 3 tries/1h, escalating bans; [recidive]
#   4-week all-port ban; on Ubuntu 24.04 journalmatch = _SYSTEMD_UNIT=ssh.service + _COMM=sshd (stock match sees nothing)
# Tailscale                -> install from pkgs.tailscale.com; tailscale up --hostname=<name> --ssh=false --accept-dns=false;
#   disable key expiry for the node in the admin; 52unattended-upgrades-tailscale; ssh-failsafe.timer
# firewall                 -> ufw default deny; 2222 only on tailscale0; 80/443 only from Cloudflare (cf-sync lockdown)
# swap 2G + sysctl         -> /etc/sysctl.d/98-swappiness.conf, 99-hardening.conf
# journald cap             -> /etc/systemd/journald.conf.d/size.conf (SystemMaxUse=500M)
# nginx                    -> server_tokens off; ssl_protocols TLSv1.2 TLSv1.3; worker_connections 4096;
#                             conf.d/00-hardening.conf, conf.d/10-performance.conf, snippets/*.conf,
#                             sites-available/00-default.conf (catch-all that drops unknown hosts)
# site tool + timers       -> /usr/local/sbin/site, /etc/sudoers.d/60-site,
#                             site-health.timer (2 min), site-backup.timer (03:30 UTC), site-autodeploy@.timer
# Cloudflare               -> /usr/local/bin/cf-sync.sh + /etc/cron.d/cf-sync (real client IP; 80/443 lockdown);
#                             purge token (Zone Cache Purge + Zone Read, IP-locked) in /etc/site/cloudflare.env (root 0600)
# alerts                   -> /etc/site/ntfy.conf (random topic), /usr/local/bin/ssh-login-notify.sh via /etc/pam.d/sshd
# off-box backups          -> a PC pulls /srv/backups daily with a key pinned to: restrict,command="rrsync -ro /srv/backups/"
```

### 4.2 This site

**1. Directories**

```bash
install -d -m 755 -o root -g root /srv/sceadfoundation
install -d -m 755 -o vmishra -g vmishra /srv/sceadfoundation/repo /srv/sceadfoundation/releases
```

**2. Read-only deploy key and checkout (as vmishra)**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_sceadfoundation -N "" -C "<server>:sceadfoundation (read-only deploy)"
cat >> ~/.ssh/config <<'EOF'

Host github-sceadfoundation
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_sceadfoundation
  IdentitiesOnly yes
EOF
# GitHub → vmishra/sceadfoundation → Settings → Deploy keys → add ~/.ssh/deploy_sceadfoundation.pub, leave "Allow write access" UNCHECKED
#   (or from a laptop: gh repo deploy-key add deploy_sceadfoundation.pub -R vmishra/sceadfoundation -t "<server> :sceadfoundation (read-only)")
ssh -T git@github-sceadfoundation          # "Hi vmishra/sceadfoundation! You've successfully authenticated"
git clone git@github-sceadfoundation:vmishra/sceadfoundation.git /srv/sceadfoundation/repo
```

Never put an account-level GitHub key on a server. A deploy key can read only this repo.

**3. `/srv/sceadfoundation/site.conf` (root:root 0644)**

```bash
# scead.excelfinvest.com — SCEAD Foundation (plain static HTML)
DOMAIN=scead.excelfinvest.com
TYPE=static
GITHUB_REPO=vmishra/sceadfoundation
BRANCH=main
PUBLISH_DIR=.
PUBLISH_EXCLUDES="README.md LICENSE nginx-scead.conf docs"
# Cloudflare zone (not secret): deploys purge this site's hostnames with the token in /etc/site/cloudflare.env
CF_ZONE_ID=bb8e1b36e5e7b58061b641990bbdf7c7
```

**4. DNS and certificate**

Cloudflare: `A` records for `scead.excelfinvest.com` → the server's IP, **proxied**; SSL/TLS mode **Full (strict)**.
First certificate (with a port-80-only vhost for these names enabled, so certbot can answer the challenge):

```bash
certbot certonly --nginx --key-type ecdsa -m vikvikvik007@gmail.com --agree-tos \
  -d scead.excelfinvest.com
```

(When moving a live site, copying `/etc/letsencrypt` from the old server avoids re-issuing.)

Cache purge: in Cloudflare → My Profile → API Tokens, edit the server's purge token and add this zone under *Zone
Resources*; the zone id goes in `site.conf` as `CF_ZONE_ID` (already there for this server).

**5. nginx vhost `/etc/nginx/sites-available/sceadfoundation.conf`**

```nginx
# scead.excelfinvest.com — static site. Files: /srv/sceadfoundation/current (atomic release symlink). See /srv/SERVER.md
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name scead.excelfinvest.com;
    ssl_certificate /etc/letsencrypt/live/scead.excelfinvest.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/scead.excelfinvest.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    root /srv/sceadfoundation/current;
    index index.html;
    access_log /var/log/nginx/sceadfoundation.access.log;
    error_log  /var/log/nginx/sceadfoundation.error.log warn;

    include snippets/site-security.conf;
    include snippets/site-deny-hidden.conf;

    # file names are not content-hashed: cache for a week, not "immutable"
    location ~* \.(css|js|svg|png|jpg|jpeg|gif|ico|webp|avif|woff2?|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public";
        include snippets/site-security.conf;
    }
    location / { try_files $uri $uri/ /index.html; }
}

server {
    listen 80;
    listen [::]:80;
    server_name scead.excelfinvest.com;
    location / { return 301 https://$host$request_uri; }
}
```

```bash
ln -sfn /etc/nginx/sites-available/sceadfoundation.conf /etc/nginx/sites-enabled/sceadfoundation.conf
nginx -t && systemctl reload nginx
```

**6. First deploy and verification**

- [ ] `site deploy sceadfoundation`, then `site list` shows `sceadfoundation` as up
- [ ] `curl -sI https://scead.excelfinvest.com/` → 200 with `server: cloudflare`; `/.git/config` → 403
- [ ] `sudo certbot renew --dry-run` succeeds
- [ ] the ntfy phone app receives the SSH-login alert

### 4.3 Without the `site` tool

The same steps by hand, for a server that doesn't have the tooling:

```bash
cd /srv/sceadfoundation/repo && git pull --ff-only
# (no build step)
R=/srv/sceadfoundation/releases/$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short=12 HEAD)
rsync -a --delete --exclude=.git <publish dir>/ $R/      # see PUBLISH_DIR / PUBLISH_EXCLUDES above
ln -sfn $R /srv/sceadfoundation/current.tmp && mv -Tf /srv/sceadfoundation/current.tmp /srv/sceadfoundation/current
```

## 5. History

- **2026-10-24**: moved to the standard `/srv/sceadfoundation` layout on hel1-4 (Hetzner Cloud, 89.167.4.245, Ubuntu 24.04) (release directories, atomic switch, per-site
  deploy key). This document replaces earlier deployment notes; their text is in git history.
