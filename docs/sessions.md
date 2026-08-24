# Sessions

After [`mftik run`](/quick-start), the unit of work is a **session** — one STS instance you deploy, watch, stop, or ack. Control is the node's API+UI plane (browser), not a separate app. The operator lives here: deploy, watch, stop, ack a failure, pull the log.

## Live / Attention / History

Deploy from the STS page in Control or `mftik run`. Live / Attention / History keep the rows you must stop or ack out of last month's `done`. A failed session keeps its reason until an operator acks it.

## Stop vs dropping the tail

Ctrl-C on `mftik run` drops the tail and does **not** stop the session. `mftik stop <session>` or the STS page does.

```bash
mftik ps
mftik logs -f <session>
mftik stop <session>
```

## Leases

Only the process that holds the attach may place an order. Heartbeats expire; a ghost session does not keep trading.

## Rebuild on boot

`STS_REBUILD_ON_BOOT` brings interrupted sessions back after the stack returns. A strategy that leaves resting orders must know it was away (`rebuildable`); the default is off because a restored instance that treats recon as a clean account will place alongside what it left at the venue.

## Event log vs `self.log`

There is an event log per session: every hook offered, and every order, cancel, and query sent — written whether or not the strategy handled the event. Separate from `self.log`, which is what you meant and what the UI tails.

The [tape](/architecture#sessions-leases-tape) survives a restart; that story is on Architecture.

## Next

Planes and Redis isolation: [Architecture](/architecture). From a clean machine: [Quick start](/quick-start). Authoring: [Write & publish](/publish).
