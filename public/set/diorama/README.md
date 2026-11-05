# Pixel Set — Diorama backgrounds

The renderer now supports full-scene illustrated backgrounds instead of drawing the room as pixel art.
Crew sprites remain unchanged and interactive. Backgrounds are selected in this order:

1. Scene-specific artwork
2. Genre fallback artwork
3. Existing `/set/stage.jpg` legacy fallback

## Scene backgrounds

Place one or both formats in `public/set/diorama/scenes/`:

- `la-traicion.jpg` / `la-traicion.png`
- `el-reencuentro.jpg` / `el-reencuentro.png`
- `la-carta.jpg` / `la-carta.png`
- `bajo-la-lluvia.jpg` / `bajo-la-lluvia.png`
- `el-silencio.jpg` / `el-silencio.png`
- `ultima-toma.jpg` / `ultima-toma.png`

## Genre fallback backgrounds

Place artwork in `public/set/diorama/genres/`:

- `drama.jpg`, `comedia.jpg`, `romance.jpg`, `noir.jpg`
- `terror.jpg`, `ciencia-ficcion.jpg`, `fantasia.jpg`, `western.jpg`, `aventura.jpg`

PNG is also supported.

## Optional foreground depth plane

Transparent PNGs can be placed in `public/set/diorama/foreground/`:

- Scene-specific: same scene slug, e.g. `la-traicion.png`
- Genre fallback: same genre slug, e.g. `noir.png`

Foreground art is drawn over the crew and workstation layer to create a diorama effect (for example, a desk edge, plants, foreground furniture, or a doorway frame). Keep character interaction areas unobstructed.

## Art direction / technical specs

- Recommended canvas: 1920×1080 (16:9); 2560×1440 is also suitable.
- JPG for opaque room backgrounds; transparent PNG for foreground planes.
- Camera: fixed, slightly elevated three-quarter/isometric perspective, like a miniature theatrical set.
- Keep floor/walkable area visible in the lower 45–55% of the frame.
- Keep the main door near the lower-right region to match the current navigation anchor.
- Avoid baked-in characters, labels, UI, or readable text.
- Keep workstations and coffee area around the existing normalized crew anchors.
- The renderer uses smooth image scaling; the current crew PNGs and drag/drop simulation are preserved.

No new artwork is bundled by this code change yet. Until the new files are added, the existing stage image remains the fallback.
