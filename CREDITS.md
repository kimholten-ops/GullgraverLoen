# Kreditering

Gullgraver Loen bruker grafikk og lyd fra OpenGameArt og Kenney.nl. Alt er CC0 (fri bruk, kreditering ikke påkrevd), men vi krediterer likevel.

## Grafikk

| Hva | Pakke | Opphav | Lisens |
|---|---|---|---|
| Stian (gå, stå, hopp) | [Cowboy](https://opengameart.org/content/cowboy) | software_atelier | CC0 |
| Bakkefliser, kaktuser, steiner, busker, gress, hodeskalle, kasse, skilt | [Free Desert Platformer Tileset](https://opengameart.org/content/free-desert-platformer-tileset) | gameart2d.com | CC0 |

Originalfilene som brukes ligger i `assets-src/`. `scripts/prepare-assets.py` skalerer dem og skriver `src/assets.js`.

Bygninger, gruver, muldyret Brunsi, slanger, Nåla og fjellene i bakgrunnen er tegnet i kode for dette prosjektet.

## Lyd

| Hva | Fil(er) | Pakke | Opphav | Lisens |
|---|---|---|---|---|
| Musikk i byen | `music-town.mp3` | [Wild West Music](https://opengameart.org/content/wild-west-music) (Cowboy Theme) | Umplix | CC0 |
| Musikk på stien/i ørkenen | `music-trail.mp3` | [Wild West Music](https://opengameart.org/content/wild-west-music) (Desert Theme) | Umplix | CC0 |
| Musikk ved game over | `music-gameover.mp3` | [Wild West Music](https://opengameart.org/content/wild-west-music) (Game Over Theme) | Umplix | CC0 |
| Hakking i gruva | `dig.mp3` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| Rik gullåre / gode funn | `success.mp3` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 |
| Dynamitt | `blast.mp3` | [Dynamite sound effect](https://opengameart.org/content/dynamite-sound-effect) | Listener | CC0 |
| Kjøp, salg, bank | `coin.mp3` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |
| Gå inn i en bygning | `door.mp3` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 |
| Vaske gull, fylle vann, drikke | `splash.mp3` | [Water Splash and sand footsteps](https://opengameart.org/content/water-splash-and-sand-footsteps) | Peludo | CC0 |
| Knapper og paneler | `click.mp3` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 |
| Har ikke råd | `error.mp3` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 |
| Skade (slange, kaktus, fall, ras) | `hurt.mp3` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 |
| Hopp | `jump.mp3` | [Digital Audio](https://kenney.nl/assets/digital-audio) | Kenney | CC0 |

Originalfilene ligger i `audio-src/`. `scripts/prepare-audio.sh` konverterer dem (trimmer stillhet, komprimerer til MP3) og skriver til `public/audio/`, som spilles av fra `src/audio.js`.
