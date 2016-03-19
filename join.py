#!/usr/bin/env python3

from pathlib import Path
import bz2
import html

with bz2.open('corpus.xml.bz2', 'w') as of:
    of.write(b'<corpus>\n')
    for p in Path('data/output').glob('*-ads*.txt'):
        assert p.is_file()
        start = True
        with p.open('r') as f:
            for l in f:
                if start:
                    of.write('    <page source="{}">\n'.format(html.escape(l.strip())).encode('utf-8'))
                    start = False
                elif l.startswith('samplesSeparator'):
                    of.write(b'    </page>\n')
                    start = True
                else:
                    of.write(html.escape(l).encode('utf-8'))
