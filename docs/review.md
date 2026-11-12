# Repository review

The core architecture is appropriate for this assignment: the mock server owns the wallet,
validates stakes and round IDs, draws outcomes, and settles payouts. `StepAction` waits for
its reply before animating. React and Pixi communicate through a small typed bridge, and
import-boundary checks enforce that separation.

## Changes made

- Serialize mock requests through asynchronous handlers so a step or cash-out cannot overtake
  an unfinished round commitment. Failed requests leave the queue usable.
- Capture request values before simulated latency, matching a serialized request rather than
  reading a mutable caller object later.
- Shift+click the next glowing manhole to request a safe step. The mock server applies the
  override and still computes the multiplier and payout. Hold Shift for each click to clear
  the whole board, or cash out after any safe step. Ordinary clicks retain normal outcomes.
- Mark settlements that used the override as `assisted`; these do not display the fair badge.
  The seed remains available, but its outcome no longer explains an assisted round.
- Add server regression tests to `make check` (`make test` also runs them independently).

## Recommended next changes, in priority order

1. **High, before adding a network backend: recover ambiguous requests.**
   `PlaceBetAction`, `StepAction`, and `CashOutAction` treat all failures as rejections and
   restore the previous playable phase. A real request can succeed on the server while its
   response is lost. Retrying a step could advance twice; a lost opening response leaves the
   client without the active round ID. Add idempotency keys, expected step numbers, cached
   mutation replies, and a session/resume endpoint returning the active round or its latest
   settlement. Reconcile state before enabling input again.
2. **High for deployment: isolate authority and disable demo commands server-side.**
   An in-page mock is inspectable and mutable regardless of TypeScript `private`. The current
   implementation demonstrates the boundary but cannot protect money. Use an authenticated
   remote server, atomic wallet/round transactions, and persistent settlements. The production
   server must reject `demoWin` and wallet refills; hiding the input shortcut is insufficient.
3. **Medium: distinguish commitment verification from full fairness.**
   `SettleAction` verifies the hash and derived hit lane but does not validate the observed
   steps or settlement arithmetic against the reveal. A server could return safe for its
   committed hit lane and later return a seed that passes the current check. Validate the
   transcript, payout, and terminal lane before awarding the badge. For stronger fairness,
   include a client seed/nonce: a server-only commitment does not prevent seed selection
   before commitment. Replace the current 32-bit seeded generator for a production protocol.
4. **Medium: handle unexpected action failures.**
   `GameMediator.run` releases its lock in `finally`, but an animation or verification failure
   propagates through a fire-and-forget promise and may leave the model busy. Add an explicit
   recoverable error state and reconcile with the server; do not undo an accepted settlement.
5. **Medium: validate actual wire responses.**
   TypeScript interfaces do not validate JSON from a remote server. Add runtime schemas for
   replies and structured error decoding in the eventual HTTP adapter. Exercise disconnects,
   delayed/duplicated replies, reload/resume, and invalid response bodies in integration tests.

The mock uses wall-clock latency to represent an external service; it may finish while the
render ticker is paused. Board animations still run through GSAP and the shared ticker.
