# MFTIK

A self-hosted **trading desk** (TradeOps) you keep running — not a backtester that prints a chart, and not a library that leaves you to invent the night shift.

You host a **node**. You write strategies in Python against the live book, the tape, and the accounts you attach. The node keeps processes up and gives an operator a place to live with the runs: deploy, watch, stop, ack a failure, pull the log.

## One node, one Owner

The node is **single-tenant**. First visit claims the instance — that person is the Owner. Auth is password, Discord, or Google, plus machine keys for scripts and peer nodes. Nobody else gets a user row.

## What to read next

| Page | When |
|---|---|
| [Quick start](/quick-start) | Clean machine → running session (`node-init` through `run`) |
| [CLI](/cli) | Commands on the laptop that writes strategies |
| [Architecture](/architecture) | Planes (STS, TD, MD, SYM, Paper, API+UI), Redis isolation, sessions and leases |
| [Self-host a node](/self-host) | Docker + Python 3.12, `node-init` through first `connect` |
| [Write & publish](/publish) | `Strategy`, `init` / `check` / `run`, private registry vs peer publish |
| [Hooks](/hooks) | Lifecycle (incl. rebuild / remember), market data (feeds + queries), private TD events |
| [Exchanges](/exchanges) | Canonical venues, categories, credentials, and which MD topics each serves |
| [Sessions](/sessions) | The unit of work in Control — Live / Attention / History, stop vs tail, leases, rebuild, logs |

Product source: [lynxlinkage/mftik](https://github.com/lynxlinkage/mftik). Marketing and hosted options: [mftik.com](https://mftik.com).
