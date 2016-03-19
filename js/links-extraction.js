"use strict";

function isNative(func) {
    return /^\s*function[^{]+{\s*\[native code\]\s*}\s*$/.test(func);
}
if (typeof(String.prototype.trim) === "undefined" || !isNative(String.prototype.trim)) {

    String.prototype.trim = function() {
        return String(this).replace(/^\s+|\s+$/g, '');
    };

}

if (typeof(String.prototype.startsWith) === "undefined") {

    String.prototype.startsWith = function(prefix) {
        return String(this).substring(0, prefix.length) === prefix;
    };

}

if (typeof(Array.prototype.includes) === "undefined") {

    Array.prototype.includes = function (value) {
        var index = this.indexOf(value);
        return typeof(index) === 'number' && index !== -1;
    };
}

var stopOnRu = arguments.length > 0 ? arguments[0] : false;
if (stopOnRu.constructor !== Boolean) throw new Error('first argument is not a boolean');
var prefixes = arguments.length > 1 ? arguments[1] : null;
if (prefixes && prefixes.constructor !== Array) throw new Error('second argument is not an array');

var rus = ['ru', 'rus', 'рус', 'russian', 'русский'];


var elems = document.getElementsByTagName('a');
var max_about_links = 640; // enough for everybody
var links = [];
for(var i = 0; i < elems.length; ++i) {
    var elem = elems[i];

    if (!elem.hasAttribute('href')) continue;
    var href = elem.getAttribute('href');

    if (href.search(/^javascript:\s*void\(\s*0?\s*\)/i) !== -1 || href.search(/^javascript:\s*;?$/i) !== -1) {
        href = '';
    }

    var text = elem.textContent.trim();
    if (text.length === 0) {
        var imgs = elem.getElementsByTagName('img');
        if (imgs.length > 0 && imgs[0].hasAttribute('alt')) {
            text = imgs[0].getAttribute('alt').trim(); 
        }
    }


    if (stopOnRu && rus.includes(text.trim().toLowerCase()) && 
            (href.startsWith(window.location.origin) || href.startsWith('/'))) {
        return {href: href};
    }


    if (prefixes) {

        for (var j = 0; j < prefixes.length; ++j) {
            if (href.startsWith(prefixes[j])) {
                links.push(href);
                break;
            }
        }

    } else {
        
        var score = 0;
        if (href.search(/\babout\b/i) !== -1) {
             //score += max_about_links - i;
             score = 1;
        } else if (href.search(/\bcompany\b/) !== -1) {
             //score += (max_about_links - i)/2;
             score = 0.5;
        }

        var caseless_text = text.toLowerCase();

        if ('о компании' === caseless_text || 'о фирме' === caseless_text ||
                'наша компания' === caseless_text) {
            score += 1500;
        } else if (caseless_text.search(/(^|\s)о компании($|\s)/i) !== -1 || 
                caseless_text.search(/(^|\s)о фирме($|\s)/i) !== -1) {
            score += 1000;
        } else if ('о нас' === caseless_text) {
            score += 750;
        } else if (caseless_text.search(/(^|\s)о нас($|\s)/) !== -1) {
            score += 500;
        } else if (text.search(/(^|\s)Об?[  ]/) !== -1) {
            score += 250;
        } else if (text.search(/(^|\s)компани[яию]($|\s)/i) !== -1 || 
                   text.search(/(^|\s)фирм[аеу]($|\s)/i) !== -1) {
            score += 150;
        } else if (text.search(/(^|\s)об?[  ][а-яё]+($|\s)/i) !== -1) {
            score += 100;
        }

        if (score > 0) links.push({score: score, href: href, text: text});
    }
}

var hrefSet = {};
if (prefixes) {
    var allLinks = links;
    var links = [];
    allLinks.forEach(function(href) {
        if (!(href in hrefSet)) {
            hrefSet[href] = href;
            links.push(href);
        }
    }); 
}
else 
{
    for (var i = 0; i < links.length; ++i) {
        if (links[i].href.search(/\babout\b/i) !== -1) {
             links[i].score += links.length - i;
        } else if (href.search(/\bcompany\b/) !== -1) {
             links[i].score += (links.length - i)/2;
        }
    }

    links.sort(function(a, b) { return b.score - a.score; });
    var allLinks = links;
    var links = [];
    allLinks.forEach(function(link) {
        if (!(link.href in hrefSet)) {
            hrefSet[link.href] = link.href;
            links.push(link);
        }
    }); 

}

return links;
