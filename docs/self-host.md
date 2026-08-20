# Self-host a node

You need **Docker**, and **Python 3.12+** on the machine you write strategies on. Images come from **GHCR**. Pin `MFTIK_VERSION` in `.env` once the node matters — `:latest` moves under you.

## 1. Host a node

```bash
pip install mftik
mftik node-init ./mynode
cd mynode
docker compose pull
docker compose run --rm migrate
docker compose run --rm seed
docker compose up -d
```

`node-init` writes compose, a Caddyfile, and a `.env` (mode `0600`, with a generated database password). Postgres, Redis, and the edge are part of the stack — you do not have to bring them.

Open the URL Caddy is bound to (default `http://localhost:8080`). **First visit claims the instance** — that is the Owner, and it is not undoable from this side. Prove identity with a password, Discord, or Google; mint machine keys for scripts and peers afterward.

## 2. Point this machine at it

```bash
mftik connect http://localhost:8080 --setup
mftik whoami
```

`connect` signs in, mints an API key, stores the key, and drops the session. The password is never written down. Profiles live in `~/.config/mftik/config.toml` at `0600`. For CI, pass an existing key with `--token`.

## Next

Write a strategy and deploy it — see [Write & publish](/publish).
