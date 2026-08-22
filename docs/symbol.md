# Symbol

The **SYM** plane holds the golden record for every instrument the desk knows: tick size, lot step, min notional, and how the venue spells the name. It is independent of any strategy session — there are no leases and no attach — so you can round an order before anything is live.

Unlike TD, MD, or STS, SYM starts, keeps `symbol_ticker` / `symbol_filter` current, answers queries, and closes. A strategy asking "what is the tick size" must get an answer whether or not anything is currently trading. The plane refreshes venue listings on an interval (hourly by default); listings are near-static, so that cycle is slow on purpose.

See [Architecture](/architecture) for how SYM sits among the other planes.

## Control Symbol page

In the UI, **Symbol** is the operator browse of that plane. The table is keyed by the platform ticker; expand a row for the full filter set the venue published.

Columns you will see on the slim list:

| Column | Meaning |
|---|---|
| **Ticker** | Universal ticker — `Venue_Category_SYMBOL` |
| **Venue / Category / Pair** | Parsed identity and `base`/`quote` |
| **Venue ticker** | `exch_ticker` — what goes on the wire |
| **Price tick / Qty step / Min qty / Min notional** | Browse filters (`price_tick`, `qty_step`, `min_qty`, `min_notional`) |
| **Status** | `active` or `delisted` (rows are never deleted) |

`—` means the venue does not publish that restriction at all; `none` means it publishes the key with no bound. Refresh reloads the page from the plane; include-delisted and search are operator filters, not a second source of truth.

## Universal ticker

Instruments are **universal tickers**: `Venue_Category_SYMBOL`.

Examples: `Gate_Spot_BTCUSDT`, `BinanceFuture_Perp_BTCUSDT`, `Bybit_Spot_ETHUSDT`, `Paper_Spot_…`. The middle part is the book (Spot / Perp / …), not a nickname. On a unified-account venue the bare symbol `BTCUSDT` can name both spot and perp — they have different ticks, so the plane is always keyed by the full ticker.

Strategy deploy documents subscribe with `topic.UniversalTicker` (e.g. `bestquote.Gate_Spot_ETHUSDT`), not the venue's own spelling. See [Write & publish](/publish) and [STS SDK](/sts-sdk).

## How a strategy uses `self.symbols`

TD does not validate orders against the plane. Rounding price and size to `price_tick` / `qty_step` and clearing `min_notional` is the strategy's job.

```python
from decimal import Decimal
from mftik.exchange.tickers import UniversalTicker

info = await self.symbols.get(
    UniversalTicker.parse("Gate_Spot_BTCUSDT")
)
tick = info.filter("price_tick")
price = (price / tick).quantize(Decimal(1)) * tick
```

Methods on `self.symbols` (the session-bound recording view):

| Method | Job |
|---|---|
| `get(ticker)` | One instrument, or `SymbolNotFoundError` |
| `list(venue, category=…)` | Every instrument on one venue and category |
| `exch_ticker(ticker)` | Universal → the venue's spelling |
| `symbol_for(venue, exch_ticker, category=…)` | Venue spelling → universal ticker |
| `filter(ticker, name)` | One restriction, e.g. `price_tick` or `min_notional` |
| `venues()` | What the plane currently tracks |
| `refresh(venue=None)` | Ask the plane to re-pull (an action, not a read) |

## Venue coverage

A venue here is **one connection with one credential**. Binance spot and Binance USD-M are two venues. Feed matrix (subscribe or query of that kind is refused where marked `—`, not faked):

| Venue | Markets | ticker | trade | book | quote | kline | aggtrade | liq |
|---|---|---|---|---|---|---|---|---|
| **Paper** | Spot (sim) | yes | yes | yes | — | — | — | — |
| **Gate** | Spot | yes | yes | yes | yes | yes | — | — |
| **GateFutures** | USD-M perp | yes | yes | yes | yes | yes | — | yes |
| **Binance** | Spot | yes | yes | yes | yes | yes | yes | — |
| **BinanceFuture** | USD-M perp | yes | yes | yes | yes | yes | yes | yes |
| **Bybit** | Spot + perp | yes | yes | yes | yes | yes | — | perp |

History reads (`fetch_klines`, `fetch_order_book`, `fetch_best_quote`) are on both Gate planes, both Binance planes, and Bybit. Paper answers ticker and book only.
