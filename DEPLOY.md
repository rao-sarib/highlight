# Deploy Highlight to AWS EC2 — First-Timer Guide

This runs your **entire** app (frontend, backend, database, Redis, Temporal, worker)
on **one** AWS EC2 server, exactly the way it runs on your laptop. When you finish,
your project is live at `http://YOUR-SERVER-IP`.

You only need to fill in **one file** (`.env` with your API keys). No code changes,
no IP hard-coding, no CORS setup — a small reverse proxy (Caddy) handles all of that.

---

## What you need before starting
- An AWS account (with your free credits).
- Your project pushed to GitHub (so the server can download it).
- Your OpenAI API key.

---

## STEP 1 — Launch the EC2 server

1. Go to the **AWS Console → EC2 → Launch instance**.
2. **Name:** `highlight-fyp`
3. **Application and OS Image (AMI):** choose **Ubuntu Server 22.04 LTS** (64-bit x86).
4. **Instance type:** choose **`t3.medium`** (2 vCPU, 4 GB RAM).
   - *Don't use the free `t2.micro` — 1 GB RAM is too small to run Temporal + Postgres + everything together.*
5. **Key pair (login):** click **Create new key pair** → name it `highlight-key` →
   type **RSA / .pem** → **Download** it. (You need this file to log in. Keep it safe.)
6. **Network settings → Edit → Security group rules.** You need exactly **two** rules:
   | Type  | Port | Source     | Why                  |
   |-------|------|------------|----------------------|
   | SSH   | 22   | My IP      | so you can log in    |
   | HTTP  | 80   | Anywhere   | so people see the app|
7. **Configure storage:** change to **30 GB** (gp3).
8. Click **Launch instance.**

### Give it a fixed IP (so it never changes)
9. EC2 left menu → **Elastic IPs** → **Allocate Elastic IP address** → Allocate.
10. Select it → **Actions → Associate** → choose your `highlight-fyp` instance → Associate.
11. **Write down this Elastic IP** — it's your app's permanent address.

---

## STEP 2 — Log into the server

On your Windows machine, open **PowerShell** in the folder where your `.pem` file is, then:

```powershell
# (run once) lock down the key file so SSH will accept it
icacls .\highlight-key.pem /inheritance:r
icacls .\highlight-key.pem /grant:r "$($env:USERNAME):(R)"

# connect (replace with YOUR Elastic IP)
ssh -i .\highlight-key.pem ubuntu@YOUR-ELASTIC-IP
```

Type `yes` if it asks about authenticity. You're now **inside the server.**

---

## STEP 3 — Install Docker on the server

Paste these one block at a time:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
newgrp docker
```

Check it works:

```bash
docker --version
docker compose version
```

---

## STEP 4 — Download your project

```bash
git clone https://github.com/rao-sarib/HIGHLIGHT.git
cd HIGHLIGHT
```

*(If your repo is private, GitHub will ask for a username + a Personal Access Token
instead of a password.)*

---

## STEP 5 — Add your API keys

```bash
cp .env.prod.example .env
nano .env
```

Paste your real `OPENAI_API_KEY` (and the optional ones if you have them).
Save with **Ctrl+O**, **Enter**, then **Ctrl+X**.

---

## STEP 6 — Start everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The **first** run takes about **5–10 minutes** (it downloads images, installs
Python packages, and runs `npm install`). Watch the progress with:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Wait until you see the frontend say it's **ready** and the backend show
`Application startup complete`. Press **Ctrl+C** to stop watching logs
(this does **not** stop the app).

---

## STEP 7 — Open your live app

In your browser go to:

```
http://YOUR-ELASTIC-IP
```

That's it — your full project is live. The database starts empty, so **sign up a
new account** on the deployed site and create your first project.

---

## Everyday commands (run inside the `HIGHLIGHT` folder)

| Goal                          | Command                                                        |
|-------------------------------|---------------------------------------------------------------|
| See running containers        | `docker compose -f docker-compose.prod.yml ps`                |
| View logs                     | `docker compose -f docker-compose.prod.yml logs -f`           |
| Stop the app (keeps data)     | `docker compose -f docker-compose.prod.yml down`              |
| Start it again                | `docker compose -f docker-compose.prod.yml up -d`             |
| Update after pushing changes  | `git pull` then `... up -d --build`                           |

---

## Saving your AWS credits
- A running `t3.medium` costs roughly **$30/month**, so $100 of credit lasts ~3 months.
- When you're **not** demoing, **Stop** the instance in the EC2 console
  (EC2 → Instances → select → Instance state → **Stop**). Stopped instances cost
  almost nothing (only ~$2–3/month for storage). **Start** it again before your demo.
  - Your Elastic IP and all data stay the same across stop/start.
- Set a safety alarm: **AWS Budgets → Create budget → $80 alert**, so you get an
  email before credits run out.

---

## Want a nicer URL / HTTPS later?
You currently get `http://YOUR-IP` (plain HTTP — fine for an FYP demo).
To upgrade to `https://yourdomain.com`:
1. Buy a cheap domain and point an **A record** at your Elastic IP.
2. In `Caddyfile`, change the first line `:80 {` to `yourdomain.com {`.
3. `docker compose -f docker-compose.prod.yml up -d` — Caddy fetches a free
   SSL certificate automatically. Done.

---

## If something goes wrong
- **Page won't load:** check the app is up — `docker compose -f docker-compose.prod.yml ps`
  (all should say `Up`). Confirm your Security Group allows **port 80 from Anywhere**.
- **AI features error:** check your key — `docker compose -f docker-compose.prod.yml logs backend`.
  Make sure `OPENAI_API_KEY` in `.env` is correct, then restart:
  `docker compose -f docker-compose.prod.yml up -d`.
- **Out of memory / containers restarting:** you're probably on `t2.micro`.
  Resize the instance to `t3.medium`.
