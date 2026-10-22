"""
Dump a PDF's text, images and drawings as JSON, or crop page regions to PNG. Dev-only, run by Claude while preparing
a paper (scripts/papers/prepare.mjs): `python -I scripts/papers/pdf_dump.py dump <pdf> <out.json>` and
`python -I scripts/papers/pdf_dump.py crop <pdf> <crops.json> <outdir> [--dpi 200]`.
"""
import argparse
import json
import os

import pymupdf

BOLD = 16  # span flag
NEAR = 2.0  # drawings closer than this (pt) are merged into one region


def r(x):
    return round(x, 1)


def box(rect):
    return [r(rect[0]), r(rect[1]), r(rect[2]), r(rect[3])]


def merge(rects):
    """Union rectangles that overlap or nearly touch, until none do."""
    rects = [list(x) for x in rects]
    changed = True
    while changed:
        changed = False
        out = []
        for a in rects:
            for b in out:
                if a[0] <= b[2] + NEAR and b[0] <= a[2] + NEAR and a[1] <= b[3] + NEAR and b[1] <= a[3] + NEAR:
                    b[0], b[1], b[2], b[3] = min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])
                    changed = True
                    break
            else:
                out.append(a)
        rects = out
    return rects


def dump_page(page):
    w, h = page.rect.width, page.rect.height
    blocks = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        lines = []
        for line in b['lines']:
            spans = [s for s in line['spans'] if s['text'].strip()]
            if not spans:
                continue
            text = ''.join(s['text'] for s in line['spans']).strip()
            size = max(s['size'] for s in spans)
            bold = all(s['flags'] & BOLD or 'Bold' in s['font'] for s in spans)
            lines.append({'text': text, 'size': r(size), 'bold': bool(bold)})
        if lines:
            blocks.append({'bbox': box(b['bbox']), 'lines': lines})
    images = [box(i['bbox']) for i in page.get_image_info() if i['bbox'][2] > i['bbox'][0]]
    drawn = []
    for d in page.get_drawings():
        x0, y0, x1, y1 = d['rect']
        if (x1 - x0) * (y1 - y0) >= 0.9 * w * h:  # a page background, not a figure
            continue
        drawn.append([x0, y0, x1, y1])
    return {'w': r(w), 'h': r(h), 'blocks': blocks, 'images': images, 'drawings': [box(x) for x in merge(drawn)]}


def dump(pdf, out):
    with pymupdf.open(pdf) as doc:
        pages = [{'n': i + 1, **dump_page(page)} for i, page in enumerate(doc)]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'pages': pages}, f, ensure_ascii=False)


def crop(pdf, crops_json, outdir, dpi):
    with open(crops_json, encoding='utf-8') as f:
        crops = json.load(f)
    os.makedirs(outdir, exist_ok=True)
    with pymupdf.open(pdf) as doc:
        for c in crops:
            page = doc[c['page'] - 1]
            clip = pymupdf.Rect(c['bbox']) & page.rect
            page.get_pixmap(clip=clip, dpi=dpi).save(os.path.join(outdir, c['id'] + '.png'))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('dump')
    d.add_argument('pdf')
    d.add_argument('out')
    c = sub.add_parser('crop')
    c.add_argument('pdf')
    c.add_argument('crops')
    c.add_argument('outdir')
    c.add_argument('--dpi', type=int, default=200)
    a = p.parse_args()
    if a.cmd == 'dump':
        dump(a.pdf, a.out)
    else:
        crop(a.pdf, a.crops, a.outdir, a.dpi)


if __name__ == '__main__':
    main()
