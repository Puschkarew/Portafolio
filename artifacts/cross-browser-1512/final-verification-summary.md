# Cross-browser verification summary (1512)

## Acceptance checks
- Chromium: header/menu CTA keep blur and readable blend contrast.
- Firefox: visual behavior matches Chromium baseline without regression.
- Safari/WebKit: visual intent matches (header + tag blur visible, CTA readable).
- Header remains pinned during scroll (`top` remained `0` in Chromium/Firefox/WebKit runtime check).

## Screenshot evidence
- Final home:
  - `artifacts/cross-browser-1512/final/chromium-home-1512.png`
  - `artifacts/cross-browser-1512/final/firefox-home-1512.png`
  - `artifacts/cross-browser-1512/final/webkit-home-1512.png`
- Final cards (header + tags in one frame):
  - `artifacts/cross-browser-1512/final/chromium-cards-1512.png`
  - `artifacts/cross-browser-1512/final/firefox-cards-1512.png`
  - `artifacts/cross-browser-1512/final/webkit-cards-1512.png`

## Automation status
- Updated Playwright config runs smoke tests for Chromium + Firefox projects.
- CI installs Chromium + Firefox for smoke.
- `smoke:visual` and `smoke:a11y` pass on both engines.
- `smoke:token-semantic` currently fails on pre-existing hero letter-spacing contract mismatch (`.hero__description`/`.hero__caption`), unrelated to header blend fix.
