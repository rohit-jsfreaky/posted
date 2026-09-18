# ART — POSTED

Everything the game draws, where it comes from, and the rules that keep it consistent.

---

## The asset rule

The written challenge rule says *"No Rockstar assets."* **Rohit asked the judge directly and was
told official images and posters are acceptable.**

> ⚠️ Keep a screenshot of that reply. If a different judge applies the written rule, we need the
> clarification in hand.

**Allowed:** official published GTA VI promotional art, character art, key art, official posters.
**Not allowed, regardless:** leaked material, unauthorised builds, rips of unreleased footage.

Official place names are public and safe: **Vice City · Leonida Keys · Grassrivers ·
Port Gellhorn · Ambrosia · Mount Kalaga**.

## Why the art style is stylised, not photoreal

Three reasons, all practical:

1. **Cutouts.** The game needs transparent cutouts that can be toggled on and off. A stylised
   illustration cuts cleanly. A photo does not.
2. **The night composite.** A multiply layer over a stylised background reads as night. Over a
   photo it reads as a blue rectangle.
3. **Stickers.** Unlayer's bundled stickers are vector-flat. They only sit correctly in a scene
   that is also flat.

So: official art as **source and reference**, rendered into a consistent stylised treatment.

## Total asset count

```
5  backgrounds            one per level, day state only
25 transparent cutouts    ~5 per level, the removable/addable objects
4  overlays               neon, crowd, rain, glare
6  UI chrome              phone frame, feed card, composer, zoom reticle,
                          suspicion meter, post button
-----------------------------------------------------------------------
40 images, authored once, zero generated at runtime
```

Night is **not** a second background. It is a composite operation (`DESIGN.md` §4).

## Per level

### Level 1 — Club Vantablack
```
bg-club.png            the facade, day, empty
bouncer.png            cutout, stands right of the door
crowd.png              cutout, appears at night
neon-club.png          screen-blend layer, the sign lit
door-open.png          cutout, replaces the closed door
```

### Level 2 — The street
```
bg-street.png
car.png                the client's car
street-sign.png        stays visible — this is the KEEP
witness.png
```

### Level 3 — The marina  ← the demo level
```
bg-marina.png          night, boats, a lit window on the right
subject.png            the brother
subject-reflection.png the SAME cutout, flipped + 40% opacity, in the window
subject-water.png      the SAME cutout, flipped vertically + blurred, in the water
clock.png              reads 21:40
```

**The reflection is the same cutout, reused.** One drawing, three placements. That is why this
level costs almost nothing to build and is the most impressive thing in the game.

### Level 4 — The lot
```
bg-lot.png
target-car.png         the thing being added
shadow-soft.png        a soft ellipse, drawn under placed objects
```

### Level 5 — The archive
```
bg-archive.png         an interior, flatter and more clinical
witness-face.png
frame-official.png     the border that makes it "official"
```

## Production

Use **Nano Banana 2** for generation. It is currently the strongest at character consistency
across scenes, which matters because Level 3 needs the same person three times in one image and
Levels 1–5 need one coherent city.

Workflow:
1. Generate one **master style frame** first. Everything else references it.
2. Generate each background from that style frame.
3. Generate objects **separately on a flat background**, then cut out — never try to extract an
   object from a finished scene.
4. Fix errors with inpainting, not by re-rolling the whole prompt.

## Consistency rules

- **One palette across all five levels.** Pick it on day 5 before generating anything else.
- **One light direction per scene**, and the cutouts must match it. This matters mechanically:
  the antagonist's tells are about light and shadow, so the art has to be internally honest.
- **Every cutout has a matching shadow shape**, or Level 4's shadow mechanic has nothing to
  sit on.
- Keep every cutout at the **same resolution as its background**, positioned by fraction. Then
  `composite()` never has to scale anything.

## UI chrome

The whole game lives inside a fake Leonida phone. That container does three jobs at once: it
justifies the feed, it hides that the "world" is a flat canvas, and it is pure HTML/CSS — the
strongest ground we have.

```
phone-frame.png        the bezel
feed-card.png          post container styling (CSS, not an image, if possible)
composer.png           the post composer chrome
zoom-reticle.png       the circle the antagonist draws on your mistake
meter.png              suspicion
```

Prefer CSS over images for anything that is a rectangle with a border. Fewer assets, sharper at
every size, responsive for free.
