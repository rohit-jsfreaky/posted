# SHIP.md — everything between here and the submit button

**Deadline:** 24 Sep 2026, 23:59 UTC = 25 Sep, 05:29 IST. **Target submit: 23 Sep.**
Today is 20 Sep. Three days.

The game is finished and deployed. Everything below is either a rule we must not break, a real
hole somebody could fall into, or upside. They are in that order on purpose.

**The rule for the last three days: nothing goes in that cannot be finished and tested the same
day.** A half-built sixth job is worse than five polished ones, because "well presented,
functional" is a judging line and a broken thing in front of a judge costs more than a missing
thing they never knew about.

---

## A — Cannot slip. These are disqualifications.

| # | what | who | size |
|---|---|---|---|
| A1 | **Live URL into the README.** Deployed but the README still says _(deployed URL goes here)_ | Rohit sends the URL, I edit | 2 min |
| A2 | **Star `github.com/unlayer/react-image-editor`** — it is on the rules list | Rohit | 10 sec |
| A3 | **Demo video.** First shot is the bouncer disappearing | Rohit | — |
| A4 | **Google Form**, before the deadline | Rohit | — |
| A5 | **Screenshot of the judge's asset clarification**, saved here as `judge-asset-clarification.png` | Rohit | 2 min |
| A6 | **Name collision check** — "POSTED" on itch.io and Steam. Backups: CLEAN PLATE, SOURCE, UNSOURCED | me | 5 min |

**A5 is the one that is easy to forget and expensive to be wrong about.** The written rule still
says no Rockstar assets. The clarification was given verbally. If a different judge applies the
written rule we need it in hand, not remembered.

**Finish line for A:** the form is submitted and the live URL in the README opens the game.

---

## B — Play it. The Phase 5 finish line is still open.

**Nobody has played all five jobs start to finish.** Not once. I have driven jobs 1, 2, 4 and 5
by hand in the real editor, and job 3's three-flag solve has only ever been proved in the test
bench. That is not the same as a person sitting down and reaching the ending.

| # | what | who | size |
|---|---|---|---|
| B1 | **One full run, 1 to 5, no hints unless genuinely stuck.** Watch for: does job 1 teach itself, is the DM pacing right, does his turn in job 4 land | Rohit | 15 min |
| B2 | **Listen to it.** The sound has never been heard by anyone. It was written without a browser. Needs one listen before the video | Rohit | 2 min |
| B3 | **Drive job 3's three-flag solve in the real editor** — lab-only so far | me | 20 min |

**Finish line for B:** somebody reaches the ending without being told what to do, and the sound
is either kept or turned off on purpose rather than by accident.

---

## C — The sixth job: "This is from years ago"

The one piece of real upside left, and the reason is not "more content". It is that **most of the
image editor is still untouched**, and the pitch gets sharper if the game covers it.

All eight top-level tools are used across jobs 1–5. What is not used is everything *inside* them:

- **Filter presets** — Grayscale, Black & White, Sepia, Vintage, Polaroid, Kodachrome,
  Technicolor, Brownie, Invert, Emboss. None.
- **Saturation, Vibrance, Hue, Contrast, Gamma, Sharpen.** None.
- **Noise** — used once, and only to say that it *cannot* work there.
- **Crop's other half** — aspect ratio presets, Rotate, Flip, Straighten, corner radius. None.
- **Text effect styles** — Neon, Typewriter, Marker, Meme. None.

### The job

A client needs something buried. The photograph has to read as decades old, not last week.

**Three things have to be true:**

1. **The colour is gone.** A preset (Grayscale, Sepia, Vintage) or Saturation pulled down. This
   is the first time a preset is the answer to anything.
2. **It has grain.** Noise up. Old film is grainy and a clean digital frame is not — **and this
   is the fix for the dead end in job 4**, where the design asked for Noise and the editor could
   not deliver it. Here it applies to the photo layer, which is exactly what Noise does reach.
3. **The thing that dates it is gone.** Something in the frame did not exist back then. Crop it
   out or cover it.

**His tell:** *"nothing in that photo is from then except the photo."*

### Why this one and not a flip job or a rotate job

It passes the canvas test. "Which manipulation makes a photograph read as old" is a taste
question with several right answers at different costs — which is the same shape as job 3, the
best job in the game. "Flip the image" is one button and one answer.

### What it needs

| | |
|---|---|
| **Measurement** | Already there. `colour` and `grain` are computed per zone today. The flags are `colour` collapsing and `grain` rising — no new engine work |
| **Art** | Probably none. A period pass over an existing scene, the same way `nightPass` works. Reuse a scene the player already knows, so the change is legible |
| **Bench** | 3 new cases in `mutations.ts`: preset only, preset + noise, and the near-miss that must not fire |
| **Size** | Half a day if the period pass looks right first try. A day if the art fights back |

**Finish line for C:** the bench is green including the new cases, `npm run check:identity` is
still clean, and I have completed the job by hand in the real editor.

**Cut rule:** if C is not finished and tested by end of 22 Sep, it does not ship. Five jobs that
work beat six where one is rough.

---

## D — Real holes, worth closing if C lands early

| # | what | why it matters | size |
|---|---|---|---|
| D1 | **Flip is unhandled.** The aligner searches four rotations, not mirrors. A judge who presses Flip horizontal gets… something | Probably already safe: a mirrored photo should fail alignment and fall into the "what am I even looking at" path, which is a *fine* answer. **Verify rather than assume** — if it instead fires nonsense flags, that is a judge watching the game break | 10 min to check |
| D2 | **Suspicion is scored per post.** Splitting a job across several small posts costs less than doing it in one | Exploitable, but a judge will not find it in 15 minutes | 30 min |
| D3 | **Job 2 reuses job 3's figure** as its witness, and job 1's queue is the same man mirrored five times | Visible if you look. The queue is the more obvious one | art job |

---

## E — Explicitly not doing

- **The cold open** (an eight-second self-playing demo before the menu). It would be the best
  thing for a judge landing cold — but the demo video opens on exactly that shot, and the video
  is the thing judges watch first. Building it twice is not worth three days.
- Any new art beyond what the sixth job needs.
- Touching the diff engine thresholds. They are green against the real art across 21 cases.
  Nothing in C requires moving them.

---

## Order of work

```
now        A6 (name check), B3 (job 3 in the editor)      me
           A2, A5 (star, screenshot)                      Rohit
21 Sep     C — build the sixth job                        me
           B1, B2 (full playthrough, listen)              Rohit
22 Sep     C finished and benched, or cut                 me
           D1 (flip check)                                me
23 Sep     A1 (URL into README), A3, A4                   Rohit — submit
```

Rohit is handling the video and the form. Everything with "me" on it is mine.
