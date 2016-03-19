#!/usr/bin/env python3

import requests
import sys
import math
import pickle
from time import time, sleep
import random
import bz2
import traceback
import queue

class Category(object):
    
    def __init__(self, path, name): 
        self.links_count = None
        self.subcategories = {}
        self.fullname = '/'.join((path, name))

    def __str__(self):
        return 'Category(links_count={},\n\tsubcategories={}\n\tfullname={}\n)'.format(self.links_count, self.subcategories, self.fullname)

    def __repr__(self):
        return 'Category(links_count={},\n\tsubcategories={}\n\tfullname={}\n)'.format(self.links_count, self.subcategories, self.fullname)

catalog = {}
for c in ['Entertainment', 'Media', 'Private_Life', 'Computers', 'Rest', 
        'Reference', 'Employment', 'Business', 'Sports', 'Society', 'Science', 
        'Automobiles', 'General', 'Culture', 'Business', ]:
    catalog[c] = Category('', c)

log = None

s = requests.Session()
last_request_time = 0
def get(url):
    global last_request_time
    r = None
    while True:
        diff = time() - last_request_time
        if diff < 3:
            sleep_time = random.uniform(max(0, 2 - diff), 3 - diff)
            #print('Sleeping', sleep_time, 'seconds before requesting', url)
            sleep(sleep_time)
        last_request_time = time()

        try:
            r = s.get(url)
            assert r.status_code == 200
            break
        except:
            traceback.print_exc()

    return r.text



def get_links_count(text):
    if 'Подождите, пожалуйста. Тут надо серьезно подумать...' in text:
        return 0
    i = text.find(' сайтов</h2>')
    if i == -1:
        i = text.find(' сайта</h2>')
    if i == -1:
        i = text.find(' сайт</h2>')
    assert i >= 0, text
    j = text.rfind('>', 0, i)
    assert j >= 0, text
    return int(text[j + 1:i])

def get_subcategories(text, category_name):
    category_prefix = ''.join(('/yca/cat', category_name, '/'))
    subcategories = set()
    i = text.find(category_prefix)
    while i >= 0:
        j = text.find('/', i + len(category_prefix))
        assert j > i + len(category_prefix)
        subcategory = text[i + len(category_prefix):j]

        if subcategory not in subcategories and subcategory[0].isupper():
            yield subcategory
            subcategories.add(subcategory)

        i = text.find(category_prefix, j)

site_url_prefix = '<h3 class="b-result__head">'
site_url_prefix_len = len(site_url_prefix)
all_links = set()
def get_links(category, links_count, sort=None, first_page=None):
    url = 'https://yaca.yandex.ru/yca/{}cat{}/synt2/Goods_and_Services/{}.html'.format('' if sort is None else (sort + '/'), category.fullname, '{}')
    if sort is None:
        log.write('{}\n'.format(category.fullname))
    for page in range(0, min(math.ceil(links_count / 10), 101)):
        if page > 0 or first_page is None:
            text = get(url.format(page))
        else:
            text = first_page
        i = text.find(site_url_prefix)
        i = -1 if i == -1 else text.find('"', i + site_url_prefix_len)
        while i >= 0:
            j = text.find('"', i + 1)
            assert j > i, (category.fullname, page)
            link = text[i + 1:j]
            if link not in all_links:
                all_links.add(link)
                yield link
                log.write('{}\n'.format(link))

            i = text.find(site_url_prefix, j)
            i = -1 if i == -1 else text.find('"', i + site_url_prefix_len)

        log.flush()


def process(category):
    #print('Processing', category.fullname)
    text = get('https://yaca.yandex.ru/yca/cat{}/synt2/Goods_and_Services/'.format(category.fullname))
    category.links_count = get_links_count(text)
    if category.links_count == 0:
        return

    subcategories_links_count = 0
    for sc in get_subcategories(text, category.fullname):
        category.subcategories[sc] = Category(category.fullname, sc)
        yield from process(category.subcategories[sc])
        subcategories_links_count += category.subcategories[sc].links_count

    if category.links_count > subcategories_links_count:
        yield from get_links(category, category.links_count, first_page=text)
        if category.links_count > 1010:
            yield from get_links(category, category.links_count, sort='time')
            yield from get_links(category, category.links_count, sort='alf')

    #print('Links in category', category.fullname, ':\n', list(category.links))


def crawl(queue):
    global log

    log = open('crawl.log.txt', 'w')

    for category in catalog.values():
        for link in process(category):
            queue.put(link)

    log.close()

if __name__ == '__main__':
    queue = queue.Queue()
    crawl(queue)
    with open('yaca-links.txt', 'w') as f:
        while not queue.empty():
            print(queue.get(), file=f)

