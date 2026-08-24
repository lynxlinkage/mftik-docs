# CLI

The CLI is the real client — commands you run on the machine that writes strategies. Control is the node's browser UI.

```bash
pip install mftik   # Python 3.12+; same package as import mftik
```

## Connect / identity

```bash
mftik connect <url>          # authenticate this machine
mftik whoami                 # which credential (via / key name)
mftik profiles               # nodes this machine is connected to
mftik disconnect <name>      # forget the key here
```

`connect` tries `/health` then `/api/health`, and stores which API base answered. Local compose API is `http://localhost:8000`; Caddy / quick-start default UI is `http://localhost:8080`.

- `--setup` claims an unclaimed node (opt-in; claiming is not undoable from this side).
- `--token` uses an existing key (CI; only path that needs no tty).
- Keys minted by connect are named `mftik-cli@{hostname}`.
- `disconnect` forgets the key here; the row on the node stays until revoked there.

Profile file: `~/.config/mftik/config.toml` (or `$XDG_CONFIG_HOME/mftik/config.toml`, or `MFTIK_CONFIG`). Mode `0600`. Holds bearer tokens. Which profile: `--profile`, then `MFTIK_PROFILE`, then last connect default.

The cookie is never written. What is stored is an `mftik_ak_` key, sent as Bearer. A key cannot manage keys — mint and revoke stay in the UI. `MFTIK_AUTH_ENABLED=0` issues no key; a profile without a token is normal.

## Strategy loop

Scaffold, check, push, and run — see [Quick start](/quick-start) and [Write & publish](/publish).

```bash
mftik init ./hello
mftik check <path> [cfg]     # import gate + on_initialized, offline
mftik push <path>            # copy tree into private registry (always origin=private; replaces)
mftik rm <name>              # delete by registry name, not path
mftik run <path> [cfg]       # push, deploy, tail
mftik ps
mftik logs <session>         # -f tails
mftik stop <session>
```

- `check --against` asks `GET /environment` whether the node has declared extras (does not make check talk for the import itself).
- `push` copies `.py` and `strategy.yml` if present.
- `rm` defaults to `origin=private`; `--origin public` for a tree this node published. 409 if a live session is running it.
- `run --no-push` deploys `private::{Type}` without copying. `--no-follow` prints the session id and exits (CI). Ctrl-C drops the tail and does **not** stop the session.

## Env

```bash
mftik env list
mftik env deps
mftik env add <name>         # --version optional, --dist when it differs
mftik env approve <dist>
mftik env rm <name>
mftik env import <url>       # preview; --confirm installs
```

`requires` is checked against the stamp; undeclared extras are refused even if already on `sys.path`. Detail: [Write & publish](/publish).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | user-fixable |
| 2 | node did not answer |
| 130 | interrupted |

Errors are one line on stderr.
