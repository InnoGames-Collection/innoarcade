# Stable game releases

Games tagged `stable` in `src/platform/catalog.ts` are **frozen**. Treat them as production reference implementations.

## EthioRunner (`temple-dash`) — stable v2

**Status:** Locked. Do not modify unless explicitly requested.

**Scope (frozen):**

- `src/games/temple-dash/**`
- `games/temple-dash/**`
- `scripts/process-ethio-f-skins.mjs`
- `src/games/temple-dash/skins/ethio_f/**`

**Includes:** 6-frame `ethio_f` run cycle (walk/slide/jump poses), foot-anchored draw, single-skin menu (Ethio Star), inline tournament panel (`#runnerTourney`), entry flow, game-over rank/leaderboard overlay.

**v2 changelog (vs v1):** per-pose skin pipeline, seamless rear-view run animation, skin shop removed, tournament/wallet entry UX aligned with shared hub modules.

**Other games** (e.g. Memory Match weekly, Fruit Slice monthly) should **copy patterns** from EthioRunner via new shared modules or game-specific code — not by editing EthioRunner.
