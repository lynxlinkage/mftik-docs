# STS SDK

Subclass `Strategy`, override the hooks you care about, trade through the accessors the base class binds. One instance runs per STS session.

```python
from mftik.strategy import Strategy

class MyStrategy(Strategy):
    name = "my_strategy"

    async def on_best_quote(self, quote) -> None:
        await self.log(f"{quote.universal_ticker} {quote.bid}/{quote.ask}")
```

## Not a candle loop

Most platforms start at `on_kline` and stay there. MFTIK treats klines as one feed among several. A strategy can sit on the touch, read every print, warm up on tape recorded before it started, watch liquidations on a perp, or query a book once because that is all the question needed.

**Subscriptions** live for the session. **Queries** answer once. Needing the book at one moment is a query (`self.mds.fetch_*`). Living on every change is a subscription (`md:` in the deploy document).

A subscribe the venue does not serve is **refused at attach**, not silently empty. See the matrix on [Symbol](/symbol).

## Live feed hooks

Subscribe in the deploy document (`md:`), one topic per instrument (`topic.UniversalTicker`):

| Hook | Topic | What it is |
|---|---|---|
| `on_best_quote` | `bestquote` | Touch with sizes, at book speed |
| `on_order_book` | `orderbook` | Full snapshot each time (no depth-diff sequencing) |
| `on_trade` | `trade` | One match, taker side |
| `on_agg_trade` | `aggtrade` | Venue-aggregated tape; `match_count` is in the print |
| `on_kline` | `kline_{interval}` | In-progress candle re-pushed; only `closed` is final |
| `on_ticker` | `ticker` | 24h stats + top of book |
| `on_liquidation` | `liquidation` | Other accounts being closed out — not your fill |

## Private events and process hooks

Private events arrive from the account (`td.{api_id}.global`), not from a candle. Filter with `self.owns(cid)` before you treat a fill as yours — the channel is account-wide.

| Hook | When |
|---|---|
| `on_order_update` / `on_fill` | Order status and fills |
| `on_order_reject` / `on_cancel_reject` | Submit or cancel refused |
| `on_balance_update` | Balance changes |
| `on_position_update` | Contract venues only — spot has no positions |
| `on_recon_done` | TD recon finished; OMS is in `self.oms` |
| `on_start` / `on_ready` / `on_stop` | Session lifecycle |
| `on_fetch_klines` / `on_fetch_orderbook` / `on_fetch_bestquote` | Answers to `self.mds.fetch_*` |
| `exit(reason)` / `fail(reason)` | End the session (`done` vs `failed`) |

`rebuildable` on the class gates whether a session may be restored after STS restarts. Default is off until the strategy implements rebuild correctly.

## Accessors

| Accessor | Job |
|---|---|
| `self.oms` | Place and cancel (`submit_order` / `cancel_order`); read OMS snapshots |
| `self.ledger` | Read balances (available / free / prelock); `ensure_leverage` on perps |
| `self.tape` | `read(...)` — recorded `trade` / `aggtrade` from before this session, plus coverage |
| `self.mds` | `fetch_klines` / `fetch_order_book` / `fetch_best_quote` — one-shot history or snapshot |
| `self.symbols` | Tick / step / min notional — see [Symbol](/symbol) |
| `self.timer` | `token().register(first_ms, interval_ms, func, label=...)`; `token.cancel()` |
| `self.log` | What you meant — reaches the UI tail. Separate from the session event log. |

The event log records every hook the strategy was offered and every order, cancel, and query it sent — whether or not the strategy handled the event. It is audit, not a substitute for `self.log`.

## Deploy document

`strategy.yml` is the attach list and runtime config. Strategy **type** is chosen at deploy time (`POST /sts/deploy/{type}` or the STS page / CLI), not inside the file.

```yaml
td:
  - paper trader
md:
  - bestquote.Paper_Spot_BTCUSDT
restart: always   # or never
sts:
  # strategy-specific parameters → on_initialized
  gap_bps: 10
```

| Key | Meaning |
|---|---|
| `td:` | Account names resolved to API ids at deploy |
| `md:` | Feed keys — `topic.UniversalTicker` |
| `restart:` | `always` (default) or `never` — whether this run wants restore after STS restart |
| `sts:` | Flat parameters for the strategy class (`on_initialized`) |

CLI: `mftik init` / `check` / `run` — see [Write & publish](/publish).

## Import rules

A strategy may import:

- the standard library
- `mftik` (and the SDK surface the gate already allows)
- files in its own tree
- third-party names it **declares** and the node has applied

Declare extras on the class; apply them on the node:

```python
class Signal(Strategy):
    name = "ml_signal"
    requires = ("numpy", "sklearn")
```

```bash
mftik env add numpy
```

`mftik check` tells you before you push. A name you did not declare is refused even if it is already on the node's `sys.path`. A peer connect compares applied extra **names**; a missing package is a refused connect, not a surprise `ImportError` after the copy. The registry still copies source, not a venv — extras live on the node's data volume.
