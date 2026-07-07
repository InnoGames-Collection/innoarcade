# New Games QA — Manual Smoke Scripts

Smoke-test each **new** title (not in `STABLE.md`). Run `npm run dev`, open the hub, and follow the steps. Pass = starts, core loop works, game over / win screen appears without console errors.

## Brain / LQ games

| Game | Smoke steps | Pass criteria |
|------|-------------|---------------|
| **water-sort** | Pour between tubes until sorted | All tubes single-color; round completes |
| **parking-jam** | Slide cars to free the exit car | Exit car drives out; next level loads |
| **laser-puzzle** | Rotate mirrors; fire laser | Laser hits target; level advances |
| **tile-connect** | Match pairs with ≤2 bends | Board clears; 3 levels finish |
| **hexa-block** | Drag hex pieces onto board | Lines clear; tray shows valid previews |
| **ball-sort** | Pour balls between tubes | Sorted tubes; win screen |
| **pipe-connect** | Tap pipes to rotate | Water path source→drain; 3 levels |
| **slide-puzzle** | Slide tiles into order | 4×4 solved; 3 rounds complete |
| **jewel-match** | Swap adjacent jewels | Matches clear; score increases |
| **rope-rescue** | Draw rope; tap **SWING** | Person reaches SAFE zone (not spikes) |

## Canvas arcade

| Game | Smoke steps | Pass criteria |
|------|-------------|---------------|
| **piano-tiles** | Tap black tiles | Miss = game over; score climbs |
| **stack-tower** | Tap to drop blocks | Misalign ends run; perfect = green flash |
| **crossy-road** | Swipe / tap to cross | Hit vehicle = over; score from distance |
| **block-blast** | Place polyominoes | Lines clear; board fills = over |
| **knife-hit** | Tap to throw knives | Collision ends run; knives stick on log |
| **helix-jump** | Rotate helix; fall through gaps | Hit segment = over |
| **hill-climb** | Gas / brake | Flip or run out of fuel = over |
| **tower-defense** | Place towers; start waves | Enemies leak lives; waves complete |
| **draw-bridge** | Draw line for vehicle | Vehicle crosses gap; fail on fall |
| **reflex-tap** | Tap when prompt appears | Wrong timing = over |
| **doodle-jump** | Left/right to land | Starts on platform; score from height |
| **zigzag** | Ball auto-runs; tap for bonus | No instant death; edge fall = over |
| **color-switch** | Tap through matching color | Wrong color = over |
| **ball-maze** | Tilt / steer ball | Fall in hole or timeout |
| **arrow-shot** | Aim and release | Miss target ends streak |
| **race-car** | Steer; avoid obstacles | Crash = over |

## Shared platform checks (Phase 1)

- [ ] `npm run build` passes
- [ ] `npm test` passes (solvable, pathCollision, levelGen)
- [ ] Juice visible on: knife-hit (stick/crash), stack-tower (perfect/miss), doodle-jump (land), zigzag (tap bonus)
- [ ] tile-connect / slide-puzzle / pipe-connect use `_lq/solvable` + `levelGen`
- [ ] No edits under stable game folders (`STABLE.md` list)

## Regression spot-check (post-change)

1. Open **tile-connect** — clear one pair; invalid path shows toast.
2. Open **slide-puzzle** — scramble is solvable; complete one board.
3. Open **pipe-connect** — rotate until connected; win sound.
4. Open **knife-hit** — 3 sticks + 1 intentional collision; particles + shake on crash.
5. Open **doodle-jump** — score starts at 0; land on green platform.

## Skipped (multiplayer)

- **ludo**, **pool** — not implemented by design.
