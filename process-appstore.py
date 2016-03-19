#!/usr/bin/env python3

import os
import time
import requests
import itertools
import traceback
import random
import html
import subprocess

types = [ 'topfreeapplications'
        , 'topfreeipadapplications'
        , 'topgrossingapplications'
        , 'topgrossingipadapplications'
        , 'toppaidapplications'
        , 'toppaidipadapplications'
        ]
genres = list(range(24))
url_templ = 'https://itunes.apple.com/ru/rss/{type}/limit=200/genre=60{genre:02}/xml'

os.makedirs('data/output', exist_ok=True)
of = open('data/output/appstore-ads.txt', 'w')


s = requests.Session()
last_request_time = 0
titles = set()
for feed_type, genre in itertools.product(types, genres):
    print(feed_type, genre)
    r = None
    while True:
        diff = time.time() - last_request_time
        if diff < 3:
            sleep_time = random.uniform(max(0, 2 - diff), 3 - diff)
            #print('Sleeping', sleep_time, 'seconds before requesting', url)
            time.sleep(sleep_time)
        last_request_time = time.time()

        try:
            r = s.get(url_templ.format(type=feed_type, genre=genre))
            assert r.status_code == 200
            break
        except:
            traceback.print_exc()

    text = r.text
    assert text.count('<title>') == text.count('<entry>') + 1
    assert text.count('<summary>') == text.count('<entry>')
    i = text.find('<entry>')
    while i >= 0:
        i = text.find('https://itunes.apple.com/ru/', i)
        assert i >= 0
        j = text.find('<', i)
        assert j > i
        url = text[i:j]

        i = text.find('<title>', j)
        assert i >= 0
        j = text.find('</title>', i)
        assert j > i
        title = html.unescape(text[i + len('<title>'):j])

        i = text.find('<summary>', j)
        assert i >= 0
        j = text.find('</summary>', i)
        assert j > i
        summary = html.unescape(text[i + len('<summary>'):j])

        i = text.find('<entry>', j)

        if title in titles: continue
        titles.add(title)
        
        codes = list(map(ord, summary.lower()))
        assert len(codes) > 0
        num_russian_letters = sum(map(lambda c: 1 if (c >= ord('а') and c <= ord('я')) or c == ord('ё') else 0, codes))
        if num_russian_letters / len(codes) > 0.5:
            print(url, file=of)
            print(summary, file=of)
            print('samplesSeparator', file=of)


of.close()
