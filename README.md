# Gullgraver Loen

Arizona, 1891. Stian Lønvik fra Inderøy leter etter Hollenderens tapte gullgruve i Superstitionfjellene.

Et sideskrollende nostalgisk nettleserspill inspirert av klassikeren *Lost Dutchman Mine* (1989). All kode og grafikk er laget fra bunnen av; spillet bruker ingen filer fra originalen og er ikke tilknyttet den.

## Spille

- **Gå:** ◀ ▶ (piltaster/AD). **▲** (pil opp/W/mellomrom) hopper, eller går inn dører og gruver når du står foran dem.
- Stien går fra byen Tørrbekk i vest, gjennom ørkenen, til fjellfoten i øst. Hopp over kaktuser og klapperslanger.
- **I gruvene** er alt i tverrsnitt: gå inn i en vegg for å hakke, ▼ graver nedover og ▲ klatrer i stiger. Faller du mer enn tre favner, gjør det vondt.
- **V** vask gull (stå i en bekk) · **F** fyll vann · **X** dynamitt (i gruver) · **L** slå leir · **M** kart
- Selg gullet på analysekontoret og sett pengene i banken før natta. Banditter rir i mørket.
- Rykter i saloonen forteller hvor Hollenderens gruve ligger i forhold til Nåla.

Spillet lagres automatisk i nettleseren (localStorage).

## Kjøre lokalt

```bash
npm install
npm run dev      # utviklingsserver på http://localhost:5173
npm test         # tester verdensgenereringen
npm run build    # bygger til dist/
```

## Publisere på GitHub Pages

1. Lag et nytt repo på GitHub, for eksempel `gullgraver-loen`.
2. Push koden:
   ```bash
   git init && git add . && git commit -m "Første prototype"
   git branch -M main
   git remote add origin git@github.com:<brukernavn>/gullgraver-loen.git
   git push -u origin main
   ```
3. På GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Workflowen i `.github/workflows/deploy.yml` tester, bygger og publiserer ved hver push til `main`.
   Spillet ligger da på `https://<brukernavn>.github.io/gullgraver-loen/`.

## Struktur

```
index.html              HTML-skall, HUD, kontroller og paneler
src/main.js             spilltilstand, handlinger, bygninger, lagring, input
src/world.js            prosedyregenerering av kart og gruver
src/draw.js             pikselgrafikk (tegnet i kode) og rendering
src/data.js             konstanter, priser, tekster — juster balansen her
src/rng.js              deterministisk tilfeldighet (frø → samme verden)
src/audio.js            musikk og lydeffekter
src/style.css           stil, lys/mørk modus
test/world.test.js      sjekker at alt kan nås på 200 tilfeldige kart
```

## Grafikk

Stian, bakken, kaktusene og pynten kommer fra OpenGameArt (CC0, se `CREDITS.md`). Resten er tegnet i kode i `src/draw.js`.

Slik bytter eller legger du til grafikk:

1. Legg PNG-filen i `assets-src/`.
2. Legg den inn i `scripts/prepare-assets.py` med ønsket høyde i logiske piksler (en rute er 16).
3. Kjør `python3 scripts/prepare-assets.py` (krever Pillow). Det skriver `src/assets.js`.
4. Tegn den i `src/draw.js` med `this.put(this.img.navn, x, bunn, 1 / RES)`.
5. Før opp kilde og lisens i `CREDITS.md`.

Lerretet tegnes med 2 skjermpiksler per logisk piksel (`RES`), så grafikken blir skarp.

## Lyd

Musikk (by, sti/ørken, game over) og lydeffekter kommer fra OpenGameArt og Kenney.nl (CC0, se `CREDITS.md`). Det spilles av med vanlige `<audio>`-elementer via `src/audio.js` — ingen synteselyd. Byen og stien/ørkenen har hvert sitt musikkspor; det er stille i gruvene. En høyttalerknapp øverst til høyre slår lyd av/på (husket i nettleseren).

Slik bytter eller legger du til lyd:

1. Legg lydfilen i `audio-src/`.
2. Legg den inn i `scripts/prepare-audio.sh` (musikk beholder full lengde, effekter trimmes for stillhet).
3. Kjør `scripts/prepare-audio.sh` (krever ffmpeg). Det skriver til `public/audio/`.
4. Spill den av fra `src/audio.js` med `playSfx('navn')` eller `setMusicZone('sone')`.
5. Før opp kilde og lisens i `CREDITS.md`.

## Veikart

- [ ] Bæreevne: muldyret bærer mer malm og utstyr
- [ ] Flere hendelser: sheriff, saloonslagsmål, flom i bekkene, sandstorm
- [ ] Doktor i byen, forgiftning fra slangebitt
- [ ] Fyrstikker og lampeolje som går tom
- [ ] Høyscore og statistikk
- [ ] PWA: spill offline og installer på hjemskjermen
- [ ] TypeScript når kodebasen vokser
