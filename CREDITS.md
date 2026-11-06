# CREDITS.md — dependencies, licenses and sources

Everything Fovea ships with, and everything it borrows. The core logic (rules engine,
color math, scoring, simulations, UI) is original code written for this project.

## Runtime dependencies

| Package | Version | License | Use |
|---|---|---|---|
| express | ^4.21.2 | MIT | HTTP server + static file serving |

That is the entire runtime dependency list. No API clients, no AI SDKs, no trackers.

## Development dependencies

| Package | Version | License | Use |
|---|---|---|---|
| @playwright/test | 1.57.0 | Apache-2.0 | End-to-end tests + the headless corpus crawler |

Node.js (runtime, ≥20) is used under its own licenses; tests additionally rely on the
built-in `node:test` runner.

## Scientific sources (cited, not copied)

- **WCAG 2.2 / WCAG 2.x contrast math** — relative luminance and contrast ratio formulas
  from the W3C Web Content Accessibility Guidelines; implemented from the published
  formulas in `src/engine/color.js` and unit-tested against known boundary values
  (#767676 passes AA at 4.54:1, #777777 fails at 4.48:1).
- **Color-vision deficiency simulation** — linear RGB transformation matrices from
  Machado, Oliveira & Fernandes, "A Physiologically-based Model for Simulation of Color
  Vision Deficiency", IEEE Transactions on Visualization and Computer Graphics, 2009
  (severity 1.0 matrices in `src/engine/sim.js`).
- **Accessibility rule ideas** — informed by public knowledge of the WCAG success
  criteria themselves (W3C). All detection logic, snapshot model, scoring model and
  fix suggestions are original implementations.
- **Statistics quoted in the README/Devpost** — WebAIM Million 2026
  (https://webaim.org/projects/million/), WHO disability fact sheet
  (https://www.who.int/news-room/fact-sheets/detail/disability-and-health),
  UsableNet 2024 year-end digital accessibility lawsuit report
  (https://www.usablenet.com/ada-web-accessibility-lawsuit-report).

## Built-in assets

- The NovaMart demo shop (`demo/novamart.html`) uses only hand-written inline SVG
  illustrations and invented brands/people — no third-party assets, no real logos,
  no photography, no fonts beyond system stacks.
- Fovea's UI uses system font stacks and inline SVG icons drawn for this project.

## Fonts, images, sounds

None bundled beyond system font stacks and inline SVG. The demo video contains no
music or third-party assets.
