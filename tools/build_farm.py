"""Generate reproducible farm scenery and fingerprint public website assets."""
import hashlib
import json
import math
from pathlib import Path
import random
import re
ROOT = Path(__file__).resolve().parents[1]
def main():
    rng = random.Random(6)
    trees = []
    for _ in range(430):
        x, y = rng.randrange(80, 3120), rng.randrange(90, 2110)
        river = 640 + 110 * math.sin(y / 270)
        if 1040 < x < 2190 and 630 < y < 1760 or abs(x - river) < 180:
            continue
        trees.append([x, y, rng.randrange(26, 49), rng.randrange(3)])
    flowers = [[rng.randrange(50, 3150), rng.randrange(80, 2120), rng.randrange(3)] for _ in range(230)]
    data = {'bounds': {'width': 3200, 'height': 2200, 'originX': 1100, 'originY': 740}, 'trees': trees, 'flowers': flowers}
    (ROOT / 'assets/js/farm-world.js').write_text("'use strict';\nconst WORLD_DATA=" + json.dumps(data, separators=(',', ':')) + ';\n', encoding='utf-8')
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    def fingerprint(match):
        target = ROOT / match[1][2:]
        return match[1] + '?v=' + hashlib.sha256(target.read_bytes()).hexdigest()[:10]
    html = re.sub(r'(\./assets/[^"?]+)\?v=[^"\s]+', fingerprint, html)
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    print(json.dumps({'trees': len(trees), 'flowers': len(flowers), 'assets': len(re.findall(r'\?v=', html))}))
if __name__ == '__main__':
    main()
