# Gullgraver Loen – notater for Claude Code

- Vanilla JS (ES-moduler) + Vite. Ingen rammeverk, ingen backend.
- Sidescroller: ute er sanntid med fysikk (`stepWorld`), gruvene er turbasert rute for rute med tyngdekraft (`mineStep`, `fall`).
- Hovedperson: Stian Lønvik fra Inderøy (`HERO` i `src/data.js`).
- All tekst i spillet er på norsk bokmål.
- Grafikk tegnes i kode i `src/draw.js` (16×16-ruter, helten er 16×24). Ikke legg til bilder fra originalspillet. Eksterne sprites (OpenGameArt) ligger i `assets-src/`; `scripts/prepare-assets.py` genererer `src/assets.js` (data-URI-er). Ikke rediger `src/assets.js` for hånd. Lisens i `CREDITS.md`.
- Lerretet har `RES` (2) skjermpiksler per logisk piksel; all spillogikk regner i logiske piksler.
- Verden genereres deterministisk fra `S.seed`; bare endringer lagres (utforsket kart, gravde gruver).
- Balanse (priser, forbruk, gullmengder) ligger i `src/data.js`, `pass()` og `veinYield()`.
- Kjør `npm test` etter endringer i `src/world.js`: alle viktige steder må kunne nås fra byen.
- Hvis lagringsformatet endres, bump `SAVE_KEY` i `src/main.js`.
