#!/bin/sh
# Konverterer råfilene i audio-src/ til komprimert MP3 i public/audio/.
# Kjør på nytt hvis du bytter eller legger til lyd (krever ffmpeg):
#     scripts/prepare-audio.sh
#
# MP3 er valgt for at lyden skal spille i alle nettlesere (Safari støtter ikke Ogg Vorbis).
# Musikk beholder full lengde; korte effekter trimmes for stillhet i start/slutt.

set -e
cd "$(dirname "$0")/.."
SRC=audio-src
OUT=public/audio
mkdir -p "$OUT"

music() { # kilde mål
  ffmpeg -y -v error -i "$SRC/$1" -codec:a libmp3lame -b:a 128k -ar 44100 "$OUT/$2"
}
sfx() { # kilde mål
  ffmpeg -y -v error -i "$SRC/$1" -af "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:stop_duration=0.3" \
    -codec:a libmp3lame -b:a 96k -ar 44100 "$OUT/$2"
}

music cowboy-theme.mp3 music-town.mp3
music desert-theme.mp3 music-trail.mp3
music gameover-theme.mp3 music-gameover.mp3

sfx impactMining_000.ogg dig.mp3
sfx dynamite-with-sensor.wav blast.mp3
sfx handleCoins.ogg coin.mp3
sfx doorOpen_1.ogg door.mp3
sfx splash1.wav splash.mp3
sfx confirmation_001.ogg success.mp3
sfx click_001.ogg click.mp3
sfx error_001.ogg error.mp3
sfx impactPunch_medium_000.ogg hurt.mp3
sfx phaseJump1.ogg jump.mp3

echo "Skrev $(ls "$OUT" | wc -l) filer til $OUT/"
