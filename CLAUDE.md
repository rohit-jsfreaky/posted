# CLAUDE.md — POSTED (read this first, every session)

**In Leonida, whatever you post becomes true. Edit the photo, post it, watch the street change.**

Built for the **Unlayer "Build With React Image Editor" Challenge**.
**Deadline: 24 Sep 2026, 23:59 UTC** = **25 Sep, 05:29 IST**. Target submit: **23 Sep**.

---

## The one thing this project is about

Every other entry uses the image editor as a **paint brush**. We use it as a **control panel
for reality**.

Rockstar's own character page gives us the premise. Cal Hampton's official headline is literally:

> **"What if everything on the internet was true?"**

We built the game of that sentence.

## The test that decides every design choice

> **"Could a plain HTML canvas do this?"**
> If yes, it is not load-bearing. Cut it.

This killed the two strongest competitors before we started:

| entry | what it does | canvas could do it? |
|---|---|---|
| `breakwater-run` | draw a line, extract path, replay a rider | **yes** — 30 lines |
| `klustor` | paint a texture, map it to a 3D car | **yes** |
| `vice-trace` | edit for flavour, then pick an answer from a list | reads nothing at all |
| **POSTED** | which *manipulation* solves this? blur vs brightness vs crop vs sticker | **no** — you would have to rebuild the whole editor |

`draw` is deliberately **not** a core verb here. It is the field's tool, not ours.

## The core loop

```
game composites the scene from state   ->  hands the player a flat image
player edits it in Unlayer             ->  saves
game diffs saved vs original           ->  FLAGS
flags mutate world STATE               ->  game re-composites
the street is different                ->  next problem
```

**The player's pixels are thrown away after the diff.** They only communicate intent. The world
is always re-rendered from authored art. That is the magic: a scrappy edit comes back as clean,
believable reality.

## Each tool is a different world-verb

| tool | what it changes in the world |
|---|---|
| **Filter** (brightness / hue / presets) | time of day and weather — who is around, what is open |
| **Crop** | the thing at the edge is now gone, permanently |
| **Text** | signs, prices, names — the world accepts the new writing |
| **Stickers** | objects appear: a car, a boat, clouds (= rain) |
| **Shapes** | board up a window, block a door |
| **Blur / Pixelate** | a face stops being recognisable |
| **Frame** | "this is an official photo" — the police believe it |
| **Resize** | restore dimensions so nobody notices the crop |

`draw` is available but is always the **crude, high-suspicion** option. Never the best answer.

## Hard requirements (a DQ is the dumbest way to lose)

- [ ] **React Image Editor is a core interactive part** — not decoration
- [ ] User can edit/customise at least one visual with it
- [ ] **Public GitHub repo**, complete source, clear README
- [ ] README must have: what you built · the idea · **how React Image Editor is used** ·
      screenshots or GIF · technical notes
- [ ] **Deployed, publicly accessible live URL** — judges will interact with it
- [ ] Submitted through the Google Form before the deadline
- [ ] **Star** `github.com/unlayer/react-image-editor`
- [ ] Optional but do it: share with `#BuiltWithImageEditor`, tag Unlayer

## Assets — the rule changed

The written rule says *"No Rockstar assets."* **Rohit asked the judge directly and was told
official images and posters are acceptable.** So we use official GTA VI promotional art as
source material.

> ⚠️ **Keep a screenshot of that judge reply.** The written rule still says otherwise. If a
> different judge applies the written rule we need the clarification in hand.

Still true: no leaked material, no unauthorised builds, no trailer rips of unreleased footage.
Official published promo art only.

## How it is judged (verbatim)

1. **Creativity** — "How original and interesting is the GTA VI-inspired concept?"
2. **Visual execution** — "Is the experience polished, visually engaging, thoughtfully designed?"
3. **Use of React Image Editor** — "Is the editor meaningfully integrated into the experience?"
4. **Experience** — "Is the project enjoyable and interesting to explore or interact with?"
5. **Overall execution** — "well presented, functional, documented, easy to understand"

And the line that is the whole strategy:

> **"Technical complexity alone will not determine the winner."**

This is a **taste** contest, not an engineering contest. Unlayer also clarified publicly that you
do **not** need to build an actual in-game experience — "present the experience in the format you
are most comfortable with." So: do not over-scope. Polish beats scale.

## Folder map

Everything below `CLAUDE.md` is **local only** — gitignored on purpose. The repo's front page is
for somebody who wants to play the game or read the source, not for the plan, the level spec, the
art brief or the running log. They still exist on this machine and in git history; they are just
not in `git ls-files` any more. Keep updating them exactly as before.

| file | what | in the repo? |
|---|---|---|
| `README.md` | what judges read | yes |
| `CLAUDE.md` | this — the operating contract | yes |
| `AGENTS.md` | written by `next dev`, leave it alone | yes |
| `MASTER-PLAN.md` | phases, each with a finish line | no |
| `DESIGN.md` | the game, the state model, the diff engine, the antagonist | no |
| `LEVELS.md` | every level: zones, flags, layers, solutions | no |
| `ART.md` | the asset list and how each is produced | no |
| `PROGRESS.md` | **live state — read first, update last** | no |
| `SHIP.md` | what is left before the submit button | no |

## Working rules

1. **Read `PROGRESS.md` first.** Update it before ending the session.
2. **Phases in order.** A phase is DONE only when its finish line in `MASTER-PLAN.md` passes.
3. **Phase 1 is the risk.** Prove the diff→flags→re-render loop on ONE level with grey boxes
   before any art exists. If it is not fun with grey boxes, we change shape on day 2, not day 6.
4. **Run the canvas test on every feature.** "Could plain canvas do this?" Yes → cut it.
5. **No runtime AI.** Zero image generation while the game runs. Everything composites from
   authored layers. AI is allowed to *produce assets before the build*, not during play.
6. **Deterministic.** Same edit → same flags → same world. No vibes, no fuzzy matching.
7. **Never run git commit/push, never create repos.** Rohit does all git himself. Hand him a
   one-line commit message when work finishes, unprompted.
8. **Talk to Rohit in simple English or Hinglish.** Short sentences. No buzzwords.
9. **No fabrication.** Numbers on screen come from real runs. Open live docs with Playwright,
   never WebSearch, never memory.

## Canonical lines

- One-liner: **In Leonida, whatever you post becomes true.**
- The premise, from Rockstar: **"What if everything on the internet was true?"** — Cal Hampton
- Against the field: **Everyone else built a paint brush. We built a control panel for reality.**
- The demo's first shot: **crop the bouncer out, post it, and he is gone from the street.**
