# Exchanges

Canonical names live in `apis.venue` and as the first segment of a universal ticker: `Venue_Category_SYMBOL`. A venue is **one connection with one credential**. Tickers and deploy YAML: [Write & publish](/publish). Feed hooks: [Hooks](/hooks).

Names are CamelCase with no underscore (`GateFutures`, never `gate_futures`). The middle segment is the category the venue actually trades (`Spot`, `Perp`, `Inverse`, `Future`). A name that is not in this registry is refused when the credential is stored — not later, at deploy.

## Registry

| Name | Label | Categories | Credential | Example |
|---|---|---|---|---|
| `Paper` | Paper | Spot | Simulated — no real money | `Paper_Spot_BTCUSDT` |
| `Gate` | Gate Spot | Spot | HMAC | `Gate_Spot_BTCUSDT` |
| `GateFutures` | Gate USD-M Futures | Perp | HMAC | `GateFutures_Perp_BTCUSDT` |
| `Binance` | Binance Spot | Spot | Ed25519 | `Binance_Spot_BTCUSDT` |
| `BinanceUM` | Binance USD-M Futures | Perp, Future | Ed25519 | `BinanceUM_Perp_BTCUSDT` |
| `BinanceCM` | Binance COIN-M Futures | Inverse, Future | Ed25519 | `BinanceCM_Inverse_BTCUSD` |
| `Bybit` | Bybit | Spot, Perp | HMAC | `Bybit_Perp_BTCUSDT` |
| `Okx` | OKX | Spot, Perp | HMAC + passphrase | `Okx_Perp_BTCUSDT` |
| `Bitget` | Bitget | Spot, Perp | HMAC + passphrase | `Bitget_Spot_BTCUSDT` |

Spelling is load-bearing: the code name is `Okx`, not `OKX` or `Okex`. There is no HTX, Deribit, or KuCoin venue.

## Classic vs unified

**Classic — one market per credential.** Gate spot and GateFutures are two venues: separate host, wallet, and API key. Binance spot, USD-M (`BinanceUM`), and COIN-M (`BinanceCM`) are three venues. Binance issues one key string for all three planes; uniqueness is `(venue, api_key)`. Store the key on the venue you will trade. This adapter signs Binance over WebSocket `session.logon` — Ed25519 only; HMAC is refused when the credential is stored.

**Unified — one credential, several books.** Bybit, Okx, and Bitget sign once. The category is the instrument's property: `Bybit_Spot_BTCUSDT` and `Bybit_Perp_BTCUSDT` are two tickers on one venue. Okx and Bitget need a passphrase. Bitget USDC-M is still `Perp` — the settle coin is in the symbol (`Bitget_Perp_BTCUSDC` ≠ `Bitget_Perp_BTCUSDT`). Classic per-market wallets on those brands are not modelled.

A unified venue has no default category. Name the book in the ticker.

## Market data

A subscribe the venue does not serve is refused at attach — the connector has no `stream_*`, or the method refuses that category. A query it cannot answer comes back `MD_VENUE_UNSUPPORTED_READ` on the `on_fetch_*` result (or `None` from `mds.fetch_*` if it never left).

Every live venue serves `ticker`, `trade`, and `orderbook`. `bestquote` and `kline_{interval}` are on every real venue; paper has neither.

| Topic | Who serves it |
|---|---|
| `aggtrade` | `Binance`, `BinanceUM`, `BinanceCM`. Gate, GateFutures, Bybit, Okx, Bitget, and Paper refuse. |
| `liquidation` | GateFutures; BinanceUM / BinanceCM (sampled — largest per symbol per second); Bybit / Okx / Bitget **perp**. Spot and paper refuse. |
| `funding_rate` | Perp books (`BinanceCM`: Inverse). Spot, paper, and dated `Future` refuse. |
| `open_interest` | GateFutures; Bybit / Okx / Bitget perp. **BinanceUM / BinanceCM have no stream** — use `mds.fetch_open_interest`. Spot and paper refuse. |

`funding_rate` is the still-moving prediction for the next settlement, not a locked period constant. `open_interest.qty` is one side, in base on every linear book; BinanceCM reports **contracts**, like the rest of that venue's public sizes.

On Bybit, GateFutures, and Bitget, funding and OI ride the ticker wire. A late joiner is silent until the next rate- or size-bearing delta — the pump is not REST-filled.

### Queries

| `mds` call | Who answers |
|---|---|
| `fetch_klines` / `fetch_order_book` / `fetch_best_quote` | Every real venue. Paper has no fetch reader. |
| `fetch_funding_history` | Same books as the live funding feed. Settled rows, oldest first. Spot, paper, and dated `Future` refuse. |
| `fetch_open_interest` | Contract venues **including** BinanceUM / BinanceCM. Snapshot of *now*, not a bucketed series. Spot and paper refuse. |

Which candle windows a venue serves is the venue's business. An interval it does not have comes back `MD_INTERVAL_NOT_SUPPORTED` on the result. Interval spelling stays canonical (`1m`, `4h`, `1mo`).

## Other caveats

- **Paper** — same ticker shape and OMS path, no real money. No candles, no `aggtrade`, no funding/OI, no `mds.fetch_*`.
- **Gate** — no aggregated tape on spot or futures. GateFutures sizes are converted to base via `contract_size`.
- **BinanceUM / BinanceCM** — no raw tape: `trade` and `aggtrade` both read `@aggTrade` (ids are aggregate ids on both). Liquidations are a sample, not a full record. OI is fetch-only; a series there is a timer plus `fetch_open_interest`, not a subscribe.
- **BinanceCM** — inverse perpetual is `BinanceCM_Inverse_BTCUSD`, never `…_Perp_BTCUSD`. Book, tape, liquidations, and OI `qty` stay in contracts. Example symbol is `BTCUSD`, not `BTCUSDT`.
- **Bybit** — liquidations and funding are perp. OI is perp (this venue does not list `Future` or options).
- **Okx / Bitget** — passphrase required. Funding, OI, and liquidations are perp; spot refuses those topics at attach.

Private TD events (`on_position_update`, …) are account-wide on the attached `api_id`. Contract venues report positions; spot never calls `on_position_update`. Filter with `self.owns(cid)`: [Hooks](/hooks#private).

## Next

Strategy hooks: [Hooks](/hooks). Authoring a deploy: [Write & publish](/publish).
