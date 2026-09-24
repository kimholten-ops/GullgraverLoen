"""Gjør grafikken i assets-src/ klar for spillet og skriver src/assets.js.

Kjør på nytt hver gang du legger til eller bytter grafikk:
    python3 scripts/prepare-assets.py

Alle bilder skaleres til nøyaktig skjermstørrelse (spillet tegner med 2 skjermpiksler
per logisk piksel), så nettleseren aldri trenger å skalere dem selv.
"""
import base64, io, json, pathlib
from PIL import Image, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src'
R = 2  # skjermpiksler per logisk piksel

def uri(im):
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def to_height(im, logical_h):
    h = logical_h * R
    w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS)

def rocky(im):
    # Rødere og mørkere variant til fjellfoten.
    r, g, b, a = im.split()
    rgb = Image.merge('RGB', (r, g, b))
    rgb = ImageEnhance.Color(rgb).enhance(0.75)
    rgb = ImageEnhance.Brightness(rgb).enhance(0.82)
    r2, g2, b2 = rgb.split()
    r2 = r2.point(lambda v: min(255, int(v * 1.06)))
    b2 = b2.point(lambda v: int(v * 0.95))
    return Image.merge('RGBA', (r2, g2, b2, a))

out = {}

# Bakkefliser: 16x16 logisk.
for n in [1, 2, 3, 4, 5, 6]:
    im = Image.open(SRC / 'desert/tiles' / f'{n}.png').convert('RGBA').resize((16 * R, 16 * R), Image.LANCZOS)
    out[f'tile{n}'] = uri(im)
    out[f'rock{n}'] = uri(rocky(im))

# Gjenstander: logisk høyde i piksler.
objects = {
    'cactus1': ('Cactus (1)', 40), 'cactus3': ('Cactus (3)', 34), 'stone': ('Stone', 13),
    'bush1': ('Bush (1)', 20), 'bush2': ('Bush (2)', 17), 'grass1': ('Grass (1)', 10),
    'grass2': ('Grass (2)', 10), 'skull': ('Skeleton', 9), 'crate': ('Crate', 15), 'signArrow': ('SignArrow', 26),
}
for key, (name, h) in objects.items():
    out[key] = uri(to_height(Image.open(SRC / 'desert/objects' / f'{name}.png').convert('RGBA'), h))

# Cowboyen: pikselkunst, beholdes uskalert (50x55 skjermpiksler per ramme).
frames = {'idle': 'idle without gun', 'walk': 'walk without gun'}
for key, name in frames.items():
    for i in range(4):
        out[f'hero_{key}{i}'] = uri(Image.open(SRC / 'cowboy' / f'Cowboy4_{name}_{i}.png').convert('RGBA'))
out['hero_jump0'] = uri(Image.open(SRC / 'cowboy' / 'Cowboy4_jump without gun_0.png').convert('RGBA'))

js = '// Generert av scripts/prepare-assets.py. Ikke rediger for hånd.\n'
js += '// Kilder og lisenser: se CREDITS.md.\n'
js += f'export const RES = {R};\n'
js += 'export const ASSETS = ' + json.dumps(out, indent=1) + ';\n'
(ROOT / 'src/assets.js').write_text(js)
print(f'Skrev src/assets.js med {len(out)} bilder ({len(js) // 1024} kB)')
