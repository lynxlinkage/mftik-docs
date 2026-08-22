# Quick start

From a clean machine to a running strategy session: host a node, claim it, connect the CLI, then `init` / `check` / `run`.

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

Open the URL Caddy is bound to (default `http://localhost:8080`). **First visit claims the instance** — that person is the Owner. Prove identity with a password, Discord, or Google.

## 2. Point this machine at it

```bash
mftik connect http://localhost:8080 --setup
mftik whoami
```

`connect` signs in, mints an API key, stores the key, and drops the session. The password is never written down. Profiles live in `~/.config/mftik/config.toml` at `0600`. For CI, pass an existing key with `--token`.

## 3. Write something and run it

```bash
mftik init ./hello
mftik check ./hello
mftik run ./hello
```

`init` asks the node which accounts and instruments it has, and writes a strategy that reads the book and exits after a few snapshots. Seed creates paper accounts; tickers look like `Paper_Spot_…` (`Venue_Category_SYMBOL`).

`run` copies the tree into the node's **private** registry, deploys it, and tails. Ctrl-C drops the tail and does **not** stop the session.

```bash
mftik ps
mftik logs -f <session>
mftik stop <session>
```

Import rules (stdlib, `mftik`, your tree, declared extras) are on [Write & publish](/publish).

## Next

More host detail: [Self-host a node](/self-host) or [Architecture](/architecture). Strategy authoring: [Write & publish](/publish).
