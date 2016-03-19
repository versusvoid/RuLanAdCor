'''
There was a lot of code here once.
It's gone to js now.
'''
import sys
import re
import html
import html.parser
import enum

js_extractor = None
with open('js/text-extraction.js', 'r') as f:
    js_extractor = ''.join(f)

def extract_text_content(driver):
    return driver.driver.execute_script(js_extractor)

def extract_main_content(driver):
    text = extract_text_content(driver)

    text = text.replace('<p>', '\n')
    text = re.sub('[ \t]+', ' ', text)
    text = re.sub('\s{2,}', '\n', text)

    return text

