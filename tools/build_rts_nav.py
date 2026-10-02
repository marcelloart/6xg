"""Precompute walkable terrain for Benteng Bara's RTS pathfinding."""
from pathlib import Path
import json
import math
import argparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/js/rts-navigation.js'
CELL = 32
CURVES = [
    [(-1150,-380),(-850,-260),(-570,100),(-40,97)],
    [(-40,97),(90,90),(132,170),(196,209)],
    [(196,209),(288,261),(216,378),(302,438)],
    [(302,438),(450,522),(443,578),(642,616)],
    [(642,616),(793,645),(835,708),(1040,671)],
    [(1040,671),(1350,600),(1370,1080),(1690,1120)],
    [(1690,1120),(1950,1180),(1870,1350),(2130,1460)],
]

def build():
    water = []
    for curve in CURVES:
        for step in range(101):
            t = step / 100
            weights = [(1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3]
            water.append((1100+sum(p[0]*v for p,v in zip(curve,weights)),740+sum(p[1]*v for p,v in zip(curve,weights))))
    rows = []
    bridges = [(1407,1175),(2140,1411)]
    for y in range(math.ceil(2200/CELL)):
        row = ''
        for x in range(100):
            px, py = (x+.5)*CELL, (y+.5)*CELL
            lake = ((px-460)/215)**2+((py-1850)/130)**2 < 1
            river = any(math.hypot(px-rx,py-ry)<25 for rx,ry in water)
            bridge = any(math.hypot(px-bx,py-by)<65 for bx,by in bridges)
            row += '1' if lake or (river and not bridge) else '0'
        rows.append(row)
    return "'use strict';\n// Python-generated terrain grid. 1 = water; bridges remain walkable.\nglobalThis.BARA_NAV="+json.dumps(rows,separators=(',',':'))+';\n'

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    output=build()
    if args.check:
        assert OUTPUT.read_text(encoding='utf-8') == output, 'Navigation grid is outdated'
        print('RTS terrain navigation matches its Python source')
    else:
        OUTPUT.write_text(output,encoding='utf-8')
        print('Built RTS navigation: 100 × 69 terrain cells')
