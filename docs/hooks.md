# Hooks

Subclass `Strategy`, override the hooks you care about. Universal tickers are `Venue_Category_SYMBOL` — see [Write & publish](/publish).

## Lifecycle

Process and session state. Called in order around a run.

| Hook / method | What it is |
|---|---|
| `on_initialized(cls, params)` | Classmethod. Deserialize `strategy.yml` `sts.config` into runtime paras. Called once before the session starts. |
| `on_start` | Session starts strategy infrastructure |
| `on_ready` | After start, session is ready to run |
| `on_stop` | Session shutting down |
| `exit(reason=...)` | Natural end → `on_stop` → status `done` |
| `fail(reason)` | Same teardown, status `failed`, reason persisted for the UI |

`fail` does not unwind orders — cancel what must not outlive the session first.

## Market data

Public feeds and one-shot queries.

### Live feeds

Subscribe in the deploy document (`md:`), one topic per instrument.

| Hook | Topic | What it is |
|---|---|---|
| `on_best_quote` | `bestquote` | Touch with sizes, at book speed |
| `on_order_book` | `orderbook` | Full snapshot each time (no depth-diff sequencing) |
| `on_trade` | `trade` | One match, taker side |
| `on_agg_trade` | `aggtrade` | Venue-aggregated; `match_count` in the print |
| `on_kline` | `kline_{interval}` | In-progress candle re-pushed; only `closed` is final |
| `on_ticker` | `ticker` | 24h stats + top of book |
| `on_liquidation` | `liquidation` | Other accounts closed out — not your fill |

A subscribe the venue does not serve is refused at attach. Gate has no `aggtrade`; paper has no candles; Bybit liquidations are perp.

### Queries

`self.mds.fetch_klines` / `fetch_order_book` / `fetch_best_quote` return a `query_id` (or `None` if it never left). Answers arrive later:

| Hook | Notes |
|---|---|
| `on_fetch_klines` | Not the same as `on_kline` |
| `on_fetch_orderbook` | Not the same as `on_order_book` |
| `on_fetch_bestquote` | Not the same as `on_best_quote` |

They also fire on failure (`ok` False). Independent of `md_ids`. Interval is canonical (`1m`, `4h`, `1mo` — month is `1mo`, never `1M`).

## Private

From `td.{api_id}.global`, account-wide. Filter with `self.owns(cid)` before treating an event as yours.

| Hook | What it is |
|---|---|
| `on_order_update` | Order status from TD |
| `on_fill` | Fill / execution report |
| `on_order_reject` | Submit fail |
| `on_cancel_reject` | Cancel fail |
| `on_balance_update` | Balance change |
| `on_position_update` | Contract venues only; qty signed; close arrives as zero; spot never calls this |
| `on_recon_done` | OMS snapshot in `self.oms` after recon |

submit → `on_order_update` \| `on_order_reject`; cancel → `on_order_update` \| `on_cancel_reject`.

## Next

Tape warm-up and accessors (`oms`, `ledger`, `tape`, `mds`, `symbols`, `timer`, `log`): [Architecture](/architecture#sessions-leases-tape), [Write & publish](/publish).
