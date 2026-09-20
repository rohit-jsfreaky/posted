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

## ~~C~~ — The sixth job: "This is from years ago" — **DONE**

It plays fourth, between the marina and the car park: by then he has said "same hand on all
three", and this is the one that makes him go public. The lot job had to stay where it is,
because that is where he stops commentating and becomes the job.

**What it uses that nothing else did:** the filter panel's presets, and `Noise` — which is the
point. Job five asked for Noise and could not have it, because filters reach the photo layer and
never an object pasted on top of it. Here the grain belongs on the photograph, which is exactly
what that slider does reach, and it is load-bearing: drain the colour without adding grain and he
says *"thats not an old photo, thats a new one with a filter on it."*

**Verified in the real editor, all three branches:**

| what was done | what happened |
|---|---|
| Grayscale alone | `colour_gone`, then the no-grain tell takes it back |
| Grayscale + Noise, car still in frame | grain holds, the dated tell takes the colour back — *"nothing in that photo is from then except the photo"* |
| Grayscale + Noise + crop the car off | all three, solved |

**Noise only needs to reach 3 on the slider**, so the photograph still looks like a photograph.
At 38 it is destroyed, which is worth knowing and is not required.

Bench is **29/29** including four new level-6 cases and three near-misses that must not fire:
untouched, brightness-only, and grayscale-plus-crop-without-grain. That last one exists because
`grain` is an absolute noise floor, so the only honest way to know the threshold clears the art's
own JPEG noise is to run it against the art.

Two things it broke on the way in, both fixed:

- The bench resolved levels by array index, so reordering ran every level-4 case against the
  wrong scene. It resolves by id now.
- The jobs screen numbered by level id, so the fourth job read "JOB 06". Both screens number by
  play order now.

---

## ~~C2~~ — The seventh job: "Off the gantry camera" — **DONE**

Plays fifth. Rohit asked for coverage of the tools the first six skipped, so this one is built
around the three nothing else touches: **Contrast**, **Sharpen**, and the crop panel's **4:3
preset**. Nothing in the photograph changes — what changes is the fingerprint the device left on
it, which is a different kind of lie again: not what is there, not when, but what took it.

It needed one new measurement. `detail` is a standard deviation, so it describes contrast across
a zone and barely moves when a picture is sharpened — the first bench run had "sharpen only"
firing nothing. The engine now also reads the *top* of the high-frequency distribution against
the original's, which is what an unsharp mask actually changes, divided by the photometric gain
so that pushing contrast cannot fake it. That second part was also caught by the bench: before
it, "crush the contrast only" fired the sharpening flag too.

The camera pass took two goes. `saturation` as a blend mode *sets* saturation rather than
scaling it, so filling with a low-but-nonzero value pushed grey concrete up to it and turned the
loading bay purple; and a `multiply` with grey is gloom, not contrast. Mostly-grey at partial
alpha, then the picture composited over itself with `overlay`, gives the real thing.

Played it in the real editor: contrast 55, sharpen 55, the 4:3 preset, post — all three, solved,
and the world came back as a camera still with CAM 04 in the corner.

Bench **34/34**.

---

## ~~C3~~ — The third side job: "The sign was red" — **DONE**

Hue, which is the last control in the editor that could carry a job at all. A slider that turns
every colour by the same amount is normally useless for lying — move a red car toward blue and
the sky goes with it — so the scene is a street at night lit by one neon sign, where every
surface genuinely is that colour and turning the whole photograph is turning the one light in it.

That makes it a **window**, not a threshold: short of it the sign is still the pink bar, past it
the tungsten lamps hanging inside go a colour a filament cannot produce. Verified in the real
editor at three points — hue 5 "thats barely moved", hue 15 solved, hue 70 "the lamps inside are
green now".

**One flag was designed and then cut.** The job originally also asked for Vibrance, so the sign
read as switched on. `colour` is a mean saturation difference, and CSS hue rotation is a fixed
matrix rather than a rotation in HSL, so a long turn moves saturation about as much as a real
saturation boost does. At 0.09 a pure turn cleared the flag; at 0.16 a real boost did not. No
threshold separated them, so the requirement went rather than shipping a coin toss — the same
call as `grain_matched` in the car park job.

**And it turned up a hole in every level.** Tells only run on a post that earned a flag, so
overshooting — the one failure this job is built around — was answered with "bro what did you
even do". Levels can now carry a `nearMiss` that reads the same measurements and says what
actually went wrong.

Bench **39/39**. New art: bg-neon.jpg. The engine reads hue now, as a circular mean weighted by
saturation, because grey pixels have no hue and 350 to 10 is a turn of 20 rather than -340.

---

## D — Real holes, worth closing if C lands early

| # | what | why it matters | size |
|---|---|---|---|
| ~~D1~~ | ~~**Flip is unhandled.**~~ **Done, and it was a real bug.** Pressing Flip horizontal fired `bouncer_removed` — a free flag for one button, because every zone landed on the wrong half of the frame. The aligner now searches all eight orientations and a flipped post is rejected: *"every sign in this reads backwards lol"*. Bench case added, 22/22 | — |
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
