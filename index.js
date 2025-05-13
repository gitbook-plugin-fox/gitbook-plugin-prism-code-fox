var Prism = require('prismjs');
var languages = require('prismjs').languages;
var path = require('path');
var fs = require('fs');
var cheerio = require('cheerio');
var mkdirp = require('mkdirp');
var codeBlocks = require('gfm-code-blocks');
var trim = require('lodash/trim');
const includes = require('lodash/includes');
const get = require('lodash/get');

var DEFAULT_LANGUAGE = 'markup';
var DEFAULT_CODE_TAB_SEPERATOR = '::';
var MAP_LANGUAGES = {
    'py': 'python',
    'js': 'javascript',
    'rb': 'ruby',
    'cs': 'csharp',
    'sh': 'bash',
    'html': 'markup'
};

// Base languages syntaxes (as of prism@1.6.0), extended by other syntaxes.
// They need to be required before the others.
var PRELUDE = [
    'markup-templating', 'clike', 'javascript', 'markup', 'c', 'ruby', 'css',
    // The following depends on previous ones
    'java', 'php'
];
PRELUDE.map(requireSyntax);

/**
 * Load the syntax definition for a language id
 */
function requireSyntax(lang) {
    require('prismjs/components/prism-' + lang + '.js');
}

function getConfig(context, property, defaultValue) {
    var config = context.config ? /* 3.x */ context.config : /* 2.x */ context.book.config;
    return config.get(property, defaultValue);
}

function isEbook(book) {
    // 2.x
    if (book.options && book.options.generator) {
        return book.options.generator === 'ebook';
    }

    // 3.x
    return book.output.name === 'ebook';
}

function getAssets() {

    var cssFiles = getConfig(this, 'pluginsConfig.prism.css', []);
    var cssFolder = null;
    var cssNames = [];
    var cssName = null;

    if (cssFiles.length === 0) {
        cssFiles.push('prismjs/themes/prism.css');
    }

    cssFiles.forEach(function(cssFile) {
        var cssPath = require.resolve(cssFile);
        cssFolder = path.dirname(cssPath);
        cssName = path.basename(cssPath);
        cssNames.push(cssName);
    });

    cssNames.push('code/code.css');
    cssNames.push('codetab/codetab.css');
    return {
        assets: cssFolder,
        css: cssNames,
        js: ['code/code.js','codetab/codetab.js']
    };
}

function syncFile(book, outputDirectory, outputFile, inputFile) {
    outputDirectory = path.join(book.output.root(), '/gitbook/gitbook-plugin-prism-code-fox/' + outputDirectory);
    outputFile = path.resolve(outputDirectory, outputFile);
    inputFile = path.resolve(__dirname, inputFile);
    mkdirp.sync(outputDirectory);

    try {
        fs.writeFileSync(outputFile, fs.readFileSync(inputFile));
    } catch (e) {
        console.warn('Failed to write ' + inputFile);
        console.warn(e);
    }

}

function processCode(language, block, context) {

    let highlighted = '';
    let userDefined = getConfig(context, 'pluginsConfig.prism.lang', {});
    let userIgnored = getConfig(context, 'pluginsConfig.prism.ignore', []);

    let lang = language || block.language || block.kwargs.language || DEFAULT_LANGUAGE;
    // Normalize language id
    lang = userDefined[lang] || MAP_LANGUAGES[lang] || lang;

    // Check to see if the lang is ignored
    if (userIgnored.indexOf(lang) > -1) {
        return block.body;
    }

    // Try and find the language definition in components folder
    if (!languages[lang]) {
        try {
            requireSyntax(lang);
        } catch (e) {
            console.warn('Failed to load prism syntax: ' + lang);
            console.warn(e);
        }
    }

    if (!languages[lang]) lang = DEFAULT_LANGUAGE;

    // Check against html, prism "markup" works for this
    if (lang === 'html') {
        lang = 'markup';
    }

    try {
        // The process can fail (failed to parse)
        highlighted = Prism.highlight(block.body, languages[lang]);
    } catch (e) {
        console.warn('Failed to highlight:');
        console.warn(e);
        highlighted = block.body;
    }
    return highlighted;
}

function createTabHeader(title, i, isActive) {
    return '<div class="tab' + (isActive ? ' active' : '') + '" data-codetab="' + i + '">' + title + '</div>';
}

function createTabBody(i, language, data) {
    let isActive = i == 0;
    return '<div class="tab' + (isActive ? ' active' : '') + '" data-codetab="' + i + '"><pre><code class="lang-' + language + '">' +
        data +
        '</code></pre></div>';
}

function getCodeTabSeperator(block, context) {
    let codeTabSeperator = block.kwargs.codeTabSeperator || getConfig(context, 'pluginsConfig.prism.codeTabSeperator', '') || DEFAULT_CODE_TAB_SEPERATOR;
    return codeTabSeperator;
}

function getCodeTabInfo(lang, tabNameSeperator) {
    if (includes(lang, tabNameSeperator)) {
        let data = lang.split(tabNameSeperator);
        return [trim(get(data, '[0]', lang)), trim(get(data, '[1]', lang))];
    }
    return [lang, lang];
}

module.exports = {
    book: getAssets,
    ebook: function() {

        // Adding prism-ebook.css to the CSS collection forces Gitbook
        // reference to it in the html markup that is converted into a PDF.
        var assets = getAssets.call(this);
        assets.css.push('prism-ebook.css');
        return assets;
    },
    blocks: {
        code: function(block) {
            return processCode(null, block, this);
        },
        codetab: function(content) {
            let codeTabSeperator = getCodeTabSeperator(content, this);
            let blocks = codeBlocks(content.body).map(({
                lang,
                code
            }) => ({
                language: trim(lang),
                body: trim(code)
            }));
            let result = '<div class="codetabs">';
            let tabsHeader = '';
            let tabsContent = '';
            blocks.forEach((block, i) => {
                let tabInfo = getCodeTabInfo(block.language, codeTabSeperator);
                let data = processCode(tabInfo[0], block, this);
                tabsHeader += createTabHeader(tabInfo[1], i, i == 0);
                tabsContent += createTabBody(i, tabInfo[0], data);
            });
            result += '<div class="codetabs-header">' + tabsHeader + '</div>';
            result += '<div class="codetabs-body">' + tabsContent + '</div>';
            result += '</div>';
            return result;
        }
    },
    hooks: {

        // Manually copy prism-ebook.css into the temporary directory that Gitbook uses for inlining
        // styles from this plugin. The getAssets() (above) function can't be leveraged because
        // ebook-prism.css lives outside the folder referenced by this plugin's config.
        //
        // @Inspiration https://github.com/GitbookIO/plugin-styles-less/blob/master/index.js#L8
        init: function() {

            var book = this;
			
			syncFile(book, 'code', 'code.js', './code/code.js');
            syncFile(book, 'code', 'code.css', './code/code.css');

            syncFile(book, 'codetab', 'codetab.js', './codetab/codetab.js');
            syncFile(book, 'codetab', 'codetab.css', './codetab/codetab.css');

            // If failed to write prism-ebook.css. See https://git.io/v1LHY for side effects.
            if (isEbook(book)) {
                syncFile(book, '', 'prism-ebook.css', './prism-ebook.css');
            }

        },
        page: function(page) {

            var highlighted = false;
            var $ = cheerio.load(page.content);

            // Prism css styles target the <code> and <pre> blocks using
            // a substring CSS selector:
            //
            //    code[class*="language-"], pre[class*="language-"]
            //
            // Adding "language-" to <pre> element should be sufficient to trigger
            // correct color theme.
            //console.log(page.content);
            $('pre').each(function() {
                highlighted = true;
                const $this = $(this);
                $this.addClass('language-');
            });

            if (highlighted) {
                page.content = $.html();
            }

            return page;
        }
    }
};