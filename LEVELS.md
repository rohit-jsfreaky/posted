# LEVELS — POSTED

Five levels. Each one: a goal, the state, the zones, the flags, the KEEPs, every valid solution
with its suspicion cost, and the tell the antagonist looks for.

**Rules that apply to all levels** (from `DESIGN.md` §10):
- max 6 state variables
- max 6 flags
- zones in fractions of width/height, never pixels
- every level has **KEEPs** — things that must stay visible, or nobody believes the post

---

## Level 1 — "Get me inside"

**Client:** *"Club Vantablack. I'm not on the list and I'm not going home. 1 hour. $200."*

**Goal:** get through the door.

### State

```js
{ time: 'day', bouncer: true, sign: 'PRIVATE', crowd: false, door: 'closed' }
```

### Zones

```js
bouncer: { x: 0.62, y: 0.40, w: 0.12, h: 0.35 }
sign:    { x: 0.28, y: 0.18, w: 0.30, h: 0.10 }
door:    { x: 0.40, y: 0.35, w: 0.18, h: 0.45 }
```

### Required flags

| flag | why |
|---|---|
| `bouncer_removed` | he is the actual obstacle |
| `night` | the club is shut in daylight — it has to be night for the door to be live |

### KEEPs

- the club **facade** must stay recognisable — crop it away and the post proves nothing
- the **sign** must still be readable as a sign (even if the text changed)

### Valid solutions

| approach | flags | suspicion | note |
|---|---|---|---|
| Crop the bouncer off the right edge + drop brightness | both | **low** | he stands near frame edge — this is the intended clean answer |
| Brightness down hard, bouncer lost in shadow | both | low–medium | works only if the drop is deep enough to trigger `night` |
| Sticker over the bouncer + brightness | both | medium | no shadow under the sticker — he may catch it |
| Paint over him with `draw` + brightness | both | **high** | edges never match. this is the trap |
| Crop him out but crop too hard | fails KEEP | — | facade gone, post is not believable |

### Tool taught

**Crop.** And its tell: a hard crop changes the image dimensions and breaks the straight line of
the building edge.

### The antagonist's tell

> *"why is this photo a different shape than every other pic of vantablack lol"*

Reverts `bouncer_removed`. Sets up Level 2.

---

## Level 2 — "The car was never there"

**Client:** *"There's a photo of my car outside a place I was never at. Fix it."*

**Goal:** remove the car, and survive the antagonist's new trick — he checks dimensions now.

### State

```js
{ time: 'night', car: true, plate_visible: true, witness: true, dims: 'original' }
```

### Required flags

- `car_removed`
- `dims_restored` ← **the new one**

### KEEPs

- the **street name sign** must stay readable (that is what dates the photo)

### Valid solutions

| approach | flags | suspicion |
|---|---|---|
| Crop the car out, then **Resize** back to original dimensions | both | **low** |
| Crop only | `car_removed` only | **fails** — he checks dimensions |
| Cover with a sticker sized to match | `car_removed` | medium |

### Tool taught

**Resize.** Its only real job: hide that you cropped.

### The antagonist's tell

> *"1440x1080? every cam on that street shoots 1920x1080. cropped."*

---

## Level 3 — "He can't be in the reflection"

**Client:** *"My brother wasn't at the marina that night."*

**Goal:** remove the brother — but he is also in the **window reflection** and the **water**.

This is the level the demo video shows. It is the one that makes people go *oh*.

### State

```js
{ subject: true, reflection: true, water_reflection: true, clock: '21:40', time: 'night' }
```

### Zones

```js
subject:    { x: 0.44, y: 0.38, w: 0.10, h: 0.40 }
reflection: { x: 0.70, y: 0.30, w: 0.14, h: 0.22 }   // the window
water:      { x: 0.40, y: 0.80, w: 0.16, h: 0.18 }
clock:      { x: 0.12, y: 0.22, w: 0.09, h: 0.09 }
```

### Required flags

- `subject_removed`
- `reflection_removed`
- `water_removed`

### KEEPs

- the **boat** and the **dock** must stay visible — they prove it is that marina

### Valid solutions for the reflection specifically

| approach | suspicion | why |
|---|---|---|
| **Brightness up** until the window blows out | **lowest** | real photos blow out windows all the time — but the light direction must match the rest of the scene |
| **Blur** the window | low | plausible depth of field — but only if other objects at that depth are also soft |
| **Shape** over the window, styled as glare | medium | must read as glare, not as a rectangle |
| **Sticker** over the window | medium | only if the object belongs in the scene |
| **Draw** over it | **high** | edges give it away immediately |
| Crop | **impossible** | the window is in the middle of the frame |

**This is the design thesis in one puzzle:** four different tools reach the same goal at four
different costs, and *crop — the field's favourite — simply cannot do it.*

### Tool taught

**Filter**, in depth: brightness, blur, pixelate.

### The antagonist's tell

> *"the window is the only soft thing in the shot. everything at that distance is sharp."*

---

## Level 4 — "Put him at the scene"

**Goal:** the inverse. **Add** something that was never there.

Removal is easy. Addition is hard, because added objects have no shadow, wrong light direction,
and clean edges against a grainy photo.

### Required flags

- `car_placed` (in the correct zone)
- `shadow_added`
- `grain_matched` ← **the real forensic move**

### The grain mechanic

A pasted sticker has clean, noiseless edges. A real photo has grain everywhere. The
**Filter → Noise** slider matches the pasted object's grain to the rest of the image.

This is a genuine forensic counter-technique, and it lives inside the editor already. No entry
in the field touches it.

### Valid solutions

| approach | suspicion |
|---|---|
| Sticker + a drawn soft shadow + Noise to match grain | **low** |
| Sticker + shadow, no noise | medium — he zooms and sees the clean edge |
| Sticker alone | **high** — floating object, obvious |

### Tool taught

**Stickers**, and **Noise** as the thing that makes them survive.

### The antagonist's tell

> *"the car has no shadow. everything else at 9pm has a shadow."*

---

## Level 5 — "Make it official"

**Client:** *"I need this to look like it came from a police archive, not a phone."*

**Goal:** change not the content but the **claimed source** of the image.

### Required flags

- `official` (a frame appeared)
- `sign_changed` (the case number / label)
- `face_hidden` (a witness must be redacted — because official photos redact)

### The twist

Here **Shapes** become the right answer, not the wrong one. An official document *is* redacted.
A black bar is no longer suspicious — its absence is.

Every previous level taught: hide what you did. This level teaches: sometimes the visible edit
is the lie.

### Tools taught

**Text**, **Shapes**, **Frame** — all three at once, because the whole level is about claiming a
source rather than changing a fact.

### The antagonist's tell

> *"VCPD case numbers have seven digits. that's six."*

And then the ending: he was right about all of it.

---

## Flag catalogue (implement once, reuse everywhere)

```
night              mean brightness of whole image dropped below 0.65x
<zone>_removed     mean abs pixel delta in zone > 0.25
<zone>_placed      new high-saturation solid content in zone > 0.04 of area
<zone>_changed     pixel delta in zone > 0.15
face_hidden        local variance in zone < 0.40x of before
dims_restored      saved dimensions == original dimensions
grain_matched      high-frequency energy in zone within 20% of image average
shadow_added       new dark low-saturation content directly below a placed object
official           outer 4% ring changed uniformly > 0.60
```

Nine checks total across all five levels. Each is 5–10 lines of canvas maths. Write them once in
`src/lib/flags.ts`, test each against a hand-made before/after pair, and never touch them again.
