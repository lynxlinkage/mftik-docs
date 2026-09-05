# Write & publish

Subclass `Strategy`, override the hooks you care about, trade through the accessors the base class binds. Live feed topics and private events: [Hooks](/hooks).

```python
from mftik.strategy import Strategy

class MyStrategy(Strategy):
    name = "my_strategy"

    async def on_best_quote(self, quote) -> None:
        await self.log(f"{quote.universal_ticker} {quote.bid}/{quote.ask}")
        # self.oms / self.ledger / self.tape / self.mds / self.symbols / self.timer
```

Instruments are **universal tickers**: `Venue_Category_SYMBOL` — e.g. `Gate_Spot_BTCUSDT`, `BinanceUM_Perp_BTCUSDT`, `Paper_Spot_…`. Canonical venue names: [Exchanges](/exchanges).

## Init, check, run

```bash
mftik init ./hello          # fills account + feed from the node you claimed
mftik check ./hello         # import gate + on_initialized, offline
mftik run ./hello           # push, deploy, tail the session log
```

`run` copies the tree into the node's **private** registry, deploys it, and tails. Ctrl-C drops the tail and does **not** stop the session.

```bash
mftik ps
mftik logs -f <session>
mftik stop <session>
```

## Private registry vs publish for peers

| Action | Meaning |
|---|---|
| **`run` / private push** | Your tree on **this** node — deploy, watch, stop. |
| **Publish** | What **another** node may pull. |

A peer connects with a **registry** key (read-only peer routes). It cannot mint keys or deploy. Connecting compares the extras each node has applied; a missing package is a refused connect, not a surprise `ImportError` after the copy.

## Import rules

A strategy may import:

- the standard library
- `mftik`
- files in its own tree
- third-party names it **declares** and the node has applied (`mftik env add numpy`, then `requires = ["numpy"]` on the class)

`mftik check` tells you before you push. A name you did not declare is refused even if it is already on the node's `sys.path`.
