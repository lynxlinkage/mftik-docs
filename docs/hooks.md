# Hooks

After `hello`: subclass `Strategy`, override the hooks you care about. Subscribe in the deploy document (`md:`), one topic per instrument.

Universal tickers are `Venue_Category_SYMBOL` — see [Write & publish](/publish).

## Live feeds

| Hook | Topic | What it is |
|---|---|---|
| `on_best_quote` | `bestquote` | Touch with sizes, at book speed |
| `on_order_book` | `orderbook` | Full snapshot each time (no depth-diff sequencing) |
| `on_trade` | `trade` | One match, taker side |
| `on_agg_trade` | `aggtrade` | Same flow, venue-aggregated — cheaper, and `match_count` is in the print |
| `on_kline` | `kline_{interval}` | In-progress candle re-pushed; only `closed` is final |
| `on_ticker` | `ticker` | 24h stats + top of book |
| `on_liquidation` | `liquidation` | Other accounts being closed out — not your fill |

A subscribe the venue does not serve is **refused at attach**, not silently empty. Gate has no aggregated tape; paper has no candles; Bybit liquidations are a perp feed. The rest of the venue matrix lives on the product README (and a later Integrations page).

## Queries vs subscribe

`self.mds.fetch_klines` / `fetch_order_book` / `fetch_best_quote` ask once and answer once. Needing the book at one moment is a query; living on every change is a subscription — an OCO in the tree does the first, a chase does the second.

## Private events

Order updates, fills, rejects, balances, and positions (contracts only) arrive on `td.{api_id}.global`. That channel is account-wide — filter with `self.owns(cid)` before treating a fill as yours.

## Tape and accessors

The tape survives a restart so a later session can warm up on prints it was not running for — see [Architecture](/architecture#sessions-leases-tape).

Accessors the base class binds: `oms`, `ledger`, `tape`, `mds`, `symbols`, `timer`, `log`. Scaffold and import rules: [Write & publish](/publish).
