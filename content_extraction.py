'''
Functions in this module handle general processing
(load, extract links, compute full url) of page in 
selenium driver. 
Text content processing dvells in html_filtering.py.
'''

from logs import *
from html_filtering import *
import re
import sys
import urllib.parse
from time import time, sleep
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.support.wait import WebDriverWait
from urllib.error import URLError
from http.client import RemoteDisconnected

class DriverHolder(object):

    def __init__(self, driver):
        self.driver = driver


def renew_driver(old_driver=None):
    log('renewing driver')

    if old_driver:
        try:
            old_driver.driver.quit()
        except: pass

    new_driver = webdriver.PhantomJS(service_args=['--load-images=false', '--disk-cache=true'])
    new_driver.set_page_load_timeout(25)

    if old_driver:
        old_driver.driver = new_driver
    else:
        return DriverHolder(new_driver)

def extract_content(driver):
    content = extract_main_content(driver)

    if len(content) >= 200:
        return content
    else:
        return None

class PageLoadException(Exception):
    pass

def get_company_page(driver, url):
    """
    Does everything possible to load page at `url` with `driver`.
    Partially handles javascript redirections. Recovers from various
    phantomjs errors.
    """

    old_url = driver.driver.current_url
    if url == old_url: return

    try:
        if url.startswith('javascript'):
            assert not url.startswith('javascript:void(0)'), url
            i = url.find(':')
            if i != -1:
                log('Executing:', url[i + 1:])
                log('Current url:', old_url)
                driver.driver.execute_script(url[i + 1:])
                sleep(5)
                try:
                    WebDriverWait(driver.driver, 30).until(lambda d: d.execute_script('return document.readyState === "complete";'))
                except ConnectionResetError:
                    renew_driver(driver)
                    raise PageLoadException(url)
                log('New url:', driver.driver.current_url)
        else:
            for i in range(2):
                try:
                    log('Trying to get', url)
                    driver.driver.get(url)
                    log('Request sent, waiting')
                    WebDriverWait(driver.driver, 30).until(lambda d: d.execute_script('return document.readyState === "complete";'))
                    log('Tired waiting')
                    break
                except (TimeoutException, URLError, RemoteDisconnected, ConnectionResetError):
                    renew_driver(driver)
                    if i == 1:
                        raise
    except (TimeoutException, WebDriverException):
        raise PageLoadException(url)
    
    if old_url == driver.driver.current_url:
        raise PageLoadException(url)

def same_top_domain(domain1, domain2):
    if '.' not in domain1 or '.' not in domain2:
        return domain1 == domain2
    domain1 = domain1[:domain1.rfind('.')]
    domain2 = domain2[:domain2.rfind('.')]

    return domain1[domain1.rfind('.') + 1:].casefold() == domain2[domain2.rfind('.') + 1:].casefold()

def compute_child_url(url, child_str_url):
    child_url = urllib.parse.urlparse(child_str_url)
    if child_url.scheme == 'javascript': return child_url
    if child_url.scheme != '' and child_url.scheme.casefold() != url.scheme.casefold():
        return None

    new_domain = url.netloc
    if child_url.netloc != '':
        if not same_top_domain(child_url.netloc, url.netloc):
            return None
        new_domain = child_url.netloc
    
    new_path = ''
    if child_url.path.startswith('/'):
        new_path = child_url.path
    else:
        old_path = url.path
        if len(old_path) == 0:
            old_path = '/'
        assert '/' in old_path, url
            
        new_path = old_path[:old_path.rfind('/') + 1] + child_url.path

    if len(new_path) == 0:
        new_path = '/'

    qs = urllib.parse.parse_qs(child_url.query)
    qs = urllib.parse.urlencode(qs, doseq=True)

    return urllib.parse.ParseResult(url.scheme, new_domain, urllib.parse.quote(new_path, safe='/%'), child_url.params, qs, '')

js_links_extractor = None
with open('js/links-extraction.js', 'r') as f:
    js_links_extractor = ''.join(f)

def get_all_links(driver, stop_on_ru=False, prefixes=None):
    log('extracting links')
    if prefixes is None:
        return driver.driver.execute_script(js_links_extractor, stop_on_ru)
    else:
        return driver.driver.execute_script(js_links_extractor, stop_on_ru, prefixes)

def extract_from_child_page(driver, url, links):
    for href in links:
        new_url = compute_child_url(url, href)
        if url != new_url:
            wait_log('No text at base url, trying: ', new_url.geturl())
            get_company_page(driver, new_url.geturl())
            # TODO может не стоит останавливаться на одной возможности?
            return extract_content(driver)

    return None

def extract_from_about_page(driver):
    url = urllib.parse.urlparse(driver.driver.current_url)
    links = get_all_links(driver, prefixes=[url.path, '{}://{}{}'.format(url.scheme, url.netloc, url.path)])
    extracted_content = extract_content(driver)

    if extracted_content == None and url.path != '/':
        extracted_content = extract_from_child_page(driver, url, links)

    return extracted_content

def output_extracted_content(f, extracted_content, url):
    wait_log('extracted:', extracted_content, sep='\n'); 
    print(url.geturl(), file=f)
    print(extracted_content, file=f)
    print('samplesSeparator', file=f)

