"use strict";

function isNative(func) {
    return /^\s*function[^{]+{\s*\[native code\]\s*}\s*$/.test(func);
}

if (typeof(Array.prototype.setLast) === "undefined") {

    Array.prototype.last = function () {
        if (this.length === 0) throw new Error('Array underflow in "last()"');
        return this[this.length - 1];
    };

    Array.prototype.setLast = function (value) {
        if (this.length === 0) throw new Error('Array underflow in "setLast()"');
        this[this.length - 1] = value;
    };


    String.prototype.last = function () {
        var str = String(this);
        return str[str.length - 1];
    };

    /*
    String.prototype.trim = function() {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
    */

    String.prototype.findall = function(what) {
        return String(this).match(what) || [];
    };

    String.prototype.contains = function(pattern) {
        return String(this).search(pattern) !== -1;
    };

}


if (typeof(Array.prototype.includes) === "undefined") {

    Array.prototype.includes = function (value) {
        var index = this.indexOf(value);
        return typeof(index) === 'number' && index !== -1;
    };
}


if (typeof(String.prototype.includes) === "undefined") {

    String.prototype.includes = function(substring) {
        var index = String(this).indexOf(substring);
        return typeof(index) === 'number' && index !== -1;
    };
}


var paragraphSentenceTextNumSentences = 0;
var paragraphSentenceText = '';

var sentenceTextNumSentences = 0;
var sentenceText = '';

var paragraphText = '';

var allUpperFirstWordRuRegexp = /^["(«]?[А-ЯЁ]{2,5}[")»]?[,;]?$/;
var allUpperFirstWordEnRegexp = /^["(«]?[A-Z]{2,5}[")»]?[,;]?$/;
var sentenceFirstWordRuRegexp = /^["(«]?[А-ЯЁ][а-яё]*([֊־‐‑‒–—―﹣－-][А-ЯЁ]?[а-яё]+)?[")»]?[,;]?$/;
var sentenceFirstWordEnRegexp = /^["(«]?[A-Z][a-z]*([֊־‐‑‒–—―﹣－-][A-Z]?[a-z]+)?$/;
var allUpperMiddleWordRuRegexp = /^["(«]?[А-ЯЁ]{2,5}[")»]?[,;:.!?]?$/;
var allUpperMiddleWordEnRegexp = /^["(«]?[A-Z]{2,5}[")»]?[,;:.!?]?$/;
var middleWordRuRegexp = /^["(«]?([А-ЯЁ][а-яё]*|[а-яё]+)([֊־‐‑‒–—―﹣－-][А-ЯЁ]?[а-яё]+)?[")»]?[,;:.!?]?$/;
var middleWordEnRegexp = /^["(«]?([A-Z][a-z]*|[a-z]+)([֊־‐‑‒–—―﹣－-][A-Z]?[a-z]+)?[")»]?[,;:.!?]?$/;
var standalonePunctuationRegexp = /^[֊־‐‑‒–—―﹣－-]$/;
var standaloneNumberRegexp = /^[0-9]+([,.][0-9]+)?%?$/;

var skipTags = ['NAV', 'SCRIPT'];
var segregateWithNewlinesTags = ['BR', 'DT', 'DD', 'LI'];
var ignoreTags = ['B', 'U', 'A', 'I', 'UL', 'OL', 'FONT', 'DT', 'DL', 'BIG', 'HEADER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'EM', 'STRONG', 'BLOCKQUOTE', 'SPAN', 'WBR'];
var skipWhenLinkOnlyTextTags = ['UL', 'OL'];


var SentenceDetectionState = {
    BeforeFirstWord: 1,
    Unknown: 2,
    MiddleSentence: 3
};

var countSentences = function(text) {
    var tokens = text.split(/ +/g);
    //console.log(tokens);
    var detectionState = SentenceDetectionState.BeforeFirstWord;
    var sentenceLength = 0;
    var numSentences = 0;
    for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i];
        if (detectionState === SentenceDetectionState.BeforeFirstWord) {
            if (sentenceFirstWordRuRegexp.test(token) ||
                    sentenceFirstWordRuRegexp.test(token) ||
                    allUpperFirstWordRuRegexp.test(token) ||
                    allUpperFirstWordEnRegexp.test(token)) {

                detectionState = SentenceDetectionState.MiddleSentence;
                sentenceLength = 1;

            } else {

                detectionState = SentenceDetectionState.Unknown;

            }
        } else if (detectionState === SentenceDetectionState.MiddleSentence) {
            if (middleWordRuRegexp.test(token) ||
                    middleWordEnRegexp.test(token) ||
                    allUpperMiddleWordRuRegexp.test(token) ||
                    allUpperMiddleWordEnRegexp.test(token)) {

                if (".!?".includes(token.last())) {
                    //print('Sentence:', ' '.join(tokens[i - sentenceLength:i + 1]))
                    if (sentenceLength + 1 > 4)
                        numSentences += 1;
                    detectionState = SentenceDetectionState.BeforeFirstWord;
                }

                sentenceLength += 1;
            } else if (standalonePunctuationRegexp.test(token) ||
                       standaloneNumberRegexp.test(token)) {

                sentenceLength += 1;
            } else {
                detectionState = SentenceDetectionState.Unknown;
            }
        }

        if (detectionState === SentenceDetectionState.Unknown) {
            if (['<p>', '\n'].includes(token) || ('.!?'.includes(token.last()) &&
                    ( middleWordRuRegexp.test(token) || middleWordEnRegexp.test(token) )) ) {
                detectionState = SentenceDetectionState.BeforeFirstWord;
            }
        }
    }


    return numSentences;
};

var textsStack = [{texts: [], nonLinkTextPresent: false}];

var updateTexts = function (tagName, texts, nonLinkTextPresent) {
    if (!nonLinkTextPresent && skipWhenLinkOnlyTextTags.includes(tagName)) {
        //console.log('Skipping', texts, "'cos links only");
        return;
    }
    
    var text = texts.join('');
    //console.log(tagName);
    if (segregateWithNewlinesTags.includes(tagName)) {
        //console.log('Segregating with newlines');
        textsStack.last().texts.push("\n");
        textsStack.last().texts.push(text);
        textsStack.last().texts.push("\n");
        return;
    }
    if (ignoreTags.includes(tagName)) {
        //console.log('Skipping');
        textsStack.last().texts.push("\t");
        textsStack.last().texts.push(text);
        textsStack.last().texts.push("\t");
        return;
    }
    if ('P' === tagName) {
        textsStack.last().texts.push(" <p> ");
        textsStack.last().texts.push(text);
        textsStack.last().texts.push("\n");
        return;
    }

    text = text.replace(/[  \t]+/g, ' ').replace(/(\n[  \t]?)+/g, " \n ").trim();
    
    if (text.length === 0 || text.contains(/\b404\b/)) return;
    if (text.findall(/[a-z]/gi).length > text.findall(/[а-яё]/gi).length) return;
    
    //console.log('-------------------------------\nTrying: \n', text, "\n");

    var paragraph = text.includes('<p>');
    var numSentences = countSentences(text);
    //console.log(numSentences, 'sentences');


    if (paragraph && (numSentences > paragraphSentenceTextNumSentences || 
                      (numSentences === paragraphSentenceTextNumSentences && 
                       text.length > paragraphSentenceText.length))) { 
        /*
        if (paragraphSentenceText.length / text.length >= 2.0) {
            console.error(['New paragraphSentenceText two times short:\nOld (' + paragraphSentenceTextNumSentences.toString() + '):', paragraphSentenceText, 
                                                                       'New (' + numSentences.toString() + '):', text].join('\n\n'));
        }
        */
        paragraphSentenceText = text;
        paragraphSentenceTextNumSentences = numSentences;
    }

    if (numSentences > sentenceTextNumSentences || 
            (numSentences === sentenceTextNumSentences && 
             text.length > sentenceText.length)) {
        /*
        if (sentenceText.length / text.length >= 2.0 && text.length > 200) {
            console.error(['New sentenceText two times short:\nOld (' + sentenceTextNumSentences.toString() + '):', paragraphSentenceText, 
                                                              'New (' + numSentences.toString() + '):', text].join('\n\n'));
        }
        */
        sentenceText = text;
        sentenceTextNumSentences = numSentences;
    }

    if (paragraph && text.length > paragraphText.length) {
        paragraphText = text;
    }

};

var isVisible = function(element) {

    //if (element.offsetWidth <= 0 || element.offsetHeight <= 0) return false;
    if (element.style.opacity === '0') return false;
    if (element.style.visibility === 'hidden') return false;
    if (element.style.visibility === 'collapsed') return false;
    if (element.style.display === 'none') return false;

    var style = window.getComputedStyle(element);

    if (style.opacity === '0') return false;
    if (style.visibility === 'hidden') return false;
    if (style.visibility === 'collapsed') return false;
    if (style.display === 'none') return false;

    return true;
};


var element = document.body;
if (!element) return '';
var pathStack = [{childIdx:-1, isLink:false}];
var isLinkText = false;

while (pathStack.length > 0) {

    pathStack.last().childIdx += 1;
    if (pathStack.last().childIdx == element.childNodes.length) {
        var text = textsStack.pop();
        var propogateNonLinkFlag = updateTexts(element.tagName.toUpperCase(), text.texts, text.nonLinkTextPresent);
        if (textsStack.length > 0) {
            textsStack.last().nonLinkTextPresent = text.nonLinkTextPresent;
        }
        pathStack.pop();
        element = element.parentNode;
        continue;
    }

    
    if (element.childNodes[pathStack.last().childIdx].nodeType === 3) {
        
        var text = element.childNodes[pathStack.last().childIdx].data;
        textsStack.last().texts.push(text)
        if (!pathStack.last().isLink && !textsStack.last().nonLinkTextPresent && text.search(/^\s+$/m) === -1) {
            //console.log('First non link text:', textsStack.last().texts.last());
            textsStack.last().nonLinkTextPresent = true;
        }

    } else if (element.childNodes[pathStack.last().childIdx].nodeType === 1 
               && !skipTags.includes(element.childNodes[pathStack.last().childIdx].tagName.toUpperCase())
               && isVisible(element.childNodes[pathStack.last().childIdx]) ) {

        element = element.childNodes[pathStack.last().childIdx];
        var isLink = pathStack.last().isLink || element.tagName.toUpperCase() === 'A';
        pathStack.push({childIdx:-1, isLink: isLink});
        textsStack.push({texts: [], nonLinkTextPresent: false});
        
    } 
    /* * /
    else {
        //console.log('Skipping element',element.childNodes[pathStack.last().childIdx].nodeType, element.childNodes[pathStack.last().childIdx].tagName, 'with text:\n', element.childNodes[pathStack.last().childIdx].textContent);
        console.log(skipTags.includes('NAV'), skipTags.includes('DIV'));
        console.log(skipTags.indexOf('DIV'));
        console.log(element.childNodes[pathStack.last().childIdx].nodeType === 1, 
                    !skipTags.includes(element.childNodes[pathStack.last().childIdx].tagName.toUpperCase()), 
                    isVisible(element.childNodes[pathStack.last().childIdx]));
        console.log('Skipping element', element.childNodes[pathStack.last().childIdx].nodeType, element.childNodes[pathStack.last().childIdx].tagName);
    }/ * */
       
}

if (sentenceTextNumSentences > paragraphSentenceTextNumSentences && 
    sentenceText.length > paragraphSentenceText.length) return sentenceText;
else if (paragraphSentenceText.length > 0) return paragraphSentenceText;
else if (sentenceText.length > 0) return sentenceText;
else return paragraphText;
