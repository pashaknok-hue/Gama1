# Original NO RULES sprite prototype

Run `pnpm --filter @workspace/no-rules art:prototype` from the repository root.
The script authors `art/observer.json`, invokes the installed Pixelbolt 0.10.0 CLI
locally and keeps PNGs, the atlas, and contact metadata. Optional exported viewer
HTML/JS and engine-specific files are removed; the game uses its own isolated
React viewer at `/prototype`.

Ten original 24×32 frames implement idle (2), walk (4), sit (2), sleep (2).
Opaque sprite/support pixels reach row 29, so their base is y=30. Scaling and floor
placement account for the two transparent pixels below the support line.
`visuals.test.ts` decodes exported PNGs with Pixelbolt's decoder to verify this.

Pixelbolt is a deterministic rasterizer/exporter, not an autonomous character
illustrator. The poses, palette and movement were authored here. It has no paid
API or remote generation requirement. MIT license is retained alongside the art.
The main game scene uses a separate original SVG design; this experiment does not
replace it. More detailed anatomy, a larger motion library, NPC variation and
full in-game sprite animation remain later visual work.
