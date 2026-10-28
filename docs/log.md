# Logging

`ctx.log` and `mftik.log` write a strategy's log lines to stderr, one JSON object per line. They were added in mftik 1.1.0. The runtime renders and writes each line in Rust. Python's `logging` module is not used (E06-D004, E06-D005).

## Two loggers

`ctx.log` is for code inside a hook. It returns a `Log` that writes the session's `session_id` on every line. The id is copied when `ctx.log` is read, including when it is empty, and the `Log` may be kept after the hook returns. Reading `ctx.log` outside the hook that received the `Context` raises `ContextError`, message `mftik.Context is only valid inside the hook that received it`. The log level does not change that.

`mftik.log` is the module-level `Log`. Use it outside a hook, for example at import or in the strategy's constructor. Its lines have no `session_id` key.

`Log` has four methods: `debug`, `info`, `warn`, and `error`. Each takes the message as a positional-only `str` and the fields as keyword arguments, and returns `None`. Python code does not construct a `Log`. `mftik.Log()` raises `TypeError`.

```python
import mftik
from mftik.strategy import Strategy

mftik.log.info("module loaded")


class Watch(Strategy):
    def on_init(self, ctx: mftik.Context) -> None:
        ctx.log.info("OnInit", ticker="Ex_Spot_ABC", every_s=30.0)

    def on_start(self, ctx: mftik.Context) -> None:
        ctx.log.debug("OnStart")

    def on_stop(self, ctx: mftik.Context) -> None:
        ctx.log.info("OnStop", trades=0)
```

At the default level, `on_start` writes nothing, because `debug` is below `info`. In a session whose id is `s1`, `on_init` writes this line:

```json
{"level":"info","time":"2026-01-01T00:00:00.5Z","component":"strategy","version":"","commit":"","sdk_version":"1.1.0+<40-hex sha>","session_id":"s1","ticker":"Ex_Spot_ABC","every_s":30,"message":"OnInit"}
```

The module-level line has the same keys without `session_id`:

```json
{"level":"info","time":"2026-01-01T00:00:00Z","component":"strategy","version":"","commit":"","sdk_version":"1.1.0+<40-hex sha>","message":"module loaded"}
```

## Fields

A field value has to be exactly one of the types below. A subclass is rejected, and so is a NumPy scalar. A proto enum such as `Side` is an `IntEnum`. Pass such values through `int(...)` or `float(...)`.

| Python | JSON |
| --- | --- |
| `str` | A string. `"`, `\`, control characters, and DEL are escaped. Other UTF-8 text is written as is |
| `int` | A number. An int outside the signed 64-bit range is written with all of its digits |
| `float` | A number, written the way zerolog writes a Go `float64`: `30.0` is `30`, `0.1 + 0.2` is `0.30000000000000004`, and `1e21` is `1e+21`. NaN and the infinities are the strings `"NaN"`, `"+Inf"`, and `"-Inf"` |
| `bool` | `true` or `false` |
| `None` | `null` |

Any other value raises `TypeError` with the message `log field NAME must be str, int, float, bool, or None`, where `NAME` is the keyword. The value is not turned into a string. A message that is not a `str` raises `TypeError` with the message `log message must be str`. Convert before the call, as the [examples](/examples) do:

```python
ctx.log.info("OnTrade", uid=ev.md.uid, side=int(trade.side))  # an enum is an int subclass
ctx.log.info("OnRecon", open=",".join(ids))  # a list is not a field value
ctx.log.warn("submit failed", reason=str(exc))  # nor is an exception
```

Fields are written in the order of the keyword arguments, after the SDK's keys and before `message`. Their names are not checked. A field named like one of the SDK's keys, such as `level`, is written as a second key with that name. A reader that keeps the last value, such as Python's `json`, then sees the field. Pick other names.

## Levels

`MFTIKO_LOG_LEVEL` is the lowest level that is written. The default is `info`.

| `MFTIKO_LOG_LEVEL` | Methods that write a line |
| --- | --- |
| `trace` or `debug` | `debug`, `info`, `warn`, `error` |
| `info`, empty, or not set | `info`, `warn`, `error` |
| `warn` | `warn`, `error` |
| `error` | `error` |
| `fatal`, `panic`, or `disabled` | None |

The value is trimmed and compared without case. A number from -128 to 127 is a zerolog level number: `-1` is `trace`, `0` to `5` are `debug` to `panic`, and `7` is `disabled`. A number below `-1` writes every level, and a number above `7` writes nothing. `6`, which is zerolog's "no level", and any other value mean `info`. mftiko's Go logger reads the variable the same way.

The SDK reads `MFTIKO_LOG_LEVEL`, `MFTIKO_LOG_FORMAT`, and `NO_COLOR` once per process, on first use. A later change to `os.environ` has no effect.

### A call below the level

A call below the level returns `None` at once. It checks neither the message nor the field types, converts nothing, and keeps the GIL (E06-D017). A wrong type therefore raises `TypeError` only for a line that is written. For that line the fields are converted while the GIL is held. The GIL is then released while the line is rendered and written.

Python binds the arguments before the method looks at the level. A missing message, a message passed as `message=`, or a second positional argument raises `TypeError` at every level. Reading `ctx.log` outside its hook raises `ContextError` at every level.

```python
# MFTIKO_LOG_LEVEL=warn
mftik.log.info("skipped", k=[1])  # below warn: returns None, checks and writes nothing
mftik.log.warn("written", k=1)  # written
mftik.log.warn("raises", k=[1])  # TypeError: log field k must be str, int, float, bool, or None
mftik.log.info()  # TypeError at every level: the message is missing
```

## Line format

A line is one JSON object and a newline. The keys come in this order:

| Key | Value |
| --- | --- |
| `level` | `debug`, `info`, `warn`, or `error` |
| `time` | UTC, RFC 3339 with nanoseconds and no trailing zeros, such as `2026-01-01T00:00:00.5Z`. A whole second has no fraction |
| `component` | `strategy` |
| `version` | The strategy's version from `run`, or empty |
| `commit` | The strategy's commit from `run`, or empty |
| `sdk_version` | mftik's package version, `+`, and the full sha of the commit it was built from: `1.1.0+<40-hex sha>` |
| `session_id` | Only on `ctx.log` lines. Written even when the id is empty |
| Fields | In call order |
| `message` | The message |

The key names are the ones mftiko's Go logger writes, plus `sdk_version`. That logger is `pkg/logger` and the Go SDK's `sdk/log.go` in mftiko v0.4.0. The order is not the same. zerolog adds `time` after the fields, just before `message`, so a Go strategy's line reads `level`, `component`, `version`, `commit`, `session_id`, the fields, `time`, `message`. Read lines by key, not by position.

## Console layout

`MFTIKO_LOG_FORMAT=console` selects zerolog's console layout, for reading by eye. The value is trimmed and compared without case. Any other value means JSON. A console line is the local time to the second, a three-letter level (`DBG`, `INF`, `WRN`, or `ERR`), the message, and then the other keys as `key=value`, sorted by name with `error` first. A value with a space, a quote, a backslash, or a character outside printable ASCII is quoted the way Go's `strconv.Quote` quotes it. ANSI colors are written, even when stderr is a file, unless `NO_COLOR` is set to a non-empty value. The `on_init` line above, in UTC and with `NO_COLOR=1`:

```text
2026-01-01T00:00:00Z INF OnInit commit= component=strategy every_s=30 sdk_version=1.1.0+<40-hex sha> session_id=s1 ticker=Ex_Spot_ABC version=
```

## Version fields

`sdk_version` is fixed when the wheel is built. `build.rs` takes the package version and the full 40-character git sha of the build (E06-D008).

`version` and `commit` describe the strategy. They are keyword-only `str` arguments of `run(strategy, release=None, *, version="", commit="")`, and another type raises `TypeError`. Both are written on every line, as empty strings when they are not set. They do not change `Hello.release`. `run` sets them when it starts, so a line written before that, at import for example, has them empty. See [Install and run](/install).

```python
import mftik
from watch import Watch

mftik.run(Watch(), version="0.1.0", commit="abc123")
```

A packed session cannot set them. Its entrypoint is `python -m mftik.run module:Class`, which calls `run(strategy)` and has no flag or environment variable for either value. Every line of a packed session therefore has `"version":""` and `"commit":""`. See [Pack and deploy](/pack).

## Where the lines go

Each line goes to stderr in one write before the method returns. Lines are not queued or sampled, and a failed write is ignored (E06-D007). The log module does not write to stdout. The runtime's gate line, `{"hook":"gate"}`, is still printed there, once, just before `on_start`. On the platform, `mftiko session logs` prints a session's stdout and stderr. See [Pack and deploy](/pack#deploy-a-session).

The runtime's own notes, such as `md payload rejected: ...`, use the same format. Each is an `info` line with the note as the message and no fields, so `MFTIKO_LOG_LEVEL=warn` hides them. Once the session id is known, a note carries `session_id` unless the id is empty. In mftik 1.0.0 these notes were plain text that started with `mftik sdk:`.

Do not put a secret in a message or a field. Log lines are stored with the session. See [Errors and exit codes](/errors).

## Source

This page describes mftik v1.1.0:

- [`crates/mftik-rt/src/log.rs`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/crates/mftik-rt/src/log.rs): rendering, levels, and the console layout
- [`crates/mftik-py/src/log.rs`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/crates/mftik-py/src/log.rs): `Log` and its type checks
- [`crates/mftik-py/src/context.rs`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/crates/mftik-py/src/context.rs#L342-L352): `ctx.log`
- [`python/mftik/run.py`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/python/mftik/run.py#L43-L61): `run`, and [the module entrypoint](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/python/mftik/run.py#L88-L102)
- [`crates/mftik-rt/build.rs`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/crates/mftik-rt/build.rs): `sdk_version`
- [`tests/python/test_log.py`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/tests/python/test_log.py): the Python tests
- [`docs/DECISIONS.md`](https://github.com/lynxlinkage/mftik/blob/876e1ae0354acf497c4b5a203d9f48c8da970069/docs/DECISIONS.md): E06-D004 to E06-D017
