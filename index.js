var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var codeBlocks = require('gfm-code-blocks');
var trim = require('lodash/trim');
const includes = require('lodash/includes');
const get = require('lodash/get');

const jsdoms = require('jsdom');
const JSDOM = jsdoms.jsdom;
 
var DEFAULT_SUMMARY = 'Click to expand and collapse code';
var DEFAULT_LANGUAGE = 'markup';
var DEFAULT_CODE_TAB_SEPERATOR = '::';
var MAP_LANGUAGES = {
    'py': 'python',
    'js': 'javascript',
    'rb': 'ruby',
    'cs': 'csharp',
    'sh': 'bash',
    'html': 'markup',
	'mysql': 'sql',
	'dockerfile': 'docker'
};

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

    let theme = getConfig(this, 'pluginsConfig.prism-fox.theme', null);
    let cssFolder = null;
    let cssNames = [];
    let cssName = null;
	
	let cssFiles = [];
	if(!!theme){
		cssFiles.push(theme);
	}else{
		cssFiles.push('prismjs/themes/prism.min.css');
	}

    cssFiles.forEach(function(cssFile) {
        let cssPath = require.resolve(cssFile);
		let index = cssPath.indexOf('prismjs');
        cssFolder = cssPath.substring(0,index);
        cssNames.push(cssPath.substring(index));
    });
	
    cssNames.push('code/code.css');
    cssNames.push('codetab/codetab.css');
	cssNames.push('prismjs/plugins/match-braces/prism-match-braces.min.css');
	cssNames.push('prismjs/plugins/line-numbers/prism-line-numbers.min.css');
	cssNames.push('prismjs/plugins/line-highlight/prism-line-highlight.min.css');
	
    return {
        assets: cssFolder,
        css: cssNames,
        js: ['code/code.js','codetab/codetab.js','prismjs/components/prism-core.min.js',
		'prismjs/plugins/autoloader/prism-autoloader.min.js',
		'prismjs/plugins/match-braces/prism-match-braces.min.js',
		'prismjs/plugins/line-numbers/prism-line-numbers.min.js',
		'prismjs/plugins/line-highlight/prism-line-highlight.min.js'
		]
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

function createTabHeader(title, i, isActive) {
    let configIndex = title.indexOf('{');
    if (configIndex > -1) {
        title = title.substring(0, configIndex);
    }
    return '<div class="tab' + (isActive ? ' active' : '') + '" data-codetab="' + i + '">' + title + '</div>';
}

function createTabBody(i, content) {
    let isActive = i == 0;
    return '<div class="tab' + (isActive ? ' active' : '') + '" data-codetab="' + i + '">' + content +'</div>';
}

function getCodeTabSeperator(block, context) {
    let codeTabSeperator = block.kwargs.codeTabSeperator || getConfig(context, 'pluginsConfig.prism-fox.codeTabSeperator', '') || DEFAULT_CODE_TAB_SEPERATOR;
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
		codetab: function(block){
			let hasDetails = ('codeTabDetails' in block.kwargs);
			let defaultSummary = getConfig(this, 'pluginsConfig.prism-fox.details-summary', null) || DEFAULT_SUMMARY;
			let detailsSummary = block.kwargs.codeTabDetails || defaultSummary;
			
			let codeTabSeperator = getCodeTabSeperator(block, this);
			let blocks = codeBlocks(block.body).map(e=>{
				let data = {};
			    let codeConfig = parseCodeConfig(e.lang, codeTabSeperator,this);	
				data['code'] = escapeString(trim(e.code));
				data['title'] = codeConfig['title'];
				data['language'] = codeConfig['language'];				
				if(!!codeConfig['data-line']){
					data['data-line'] = codeConfig['data-line'];
				}
				return data;
			});
			let result = '<div class="codetabs">';
			if(hasDetails){
				result = `<details><summary class="tab-code-expand-collapse"><i class="fa fa-code"></i>&nbsp;${detailsSummary}</summary>${result}`;
			}
			let tabsHeader = '';
            let tabsContent = '';
			blocks.forEach((b, i) => {
				let dataLineEle = '';
				let dataLine = b['data-line'];
				if(!!dataLine){
					dataLineEle =`data-line=${dataLine}`;
				}
				let content = `<pre class='lang-${b.language}' ${dataLineEle}><code class='lang-${b.language}'>${b.code}</code></pre>`;
				tabsHeader += createTabHeader(b.title, i, i == 0);
				tabsContent += createTabBody(i,content);
            });
			result += '<div class="codetabs-header">' + tabsHeader + '</div>';
            result += '<div class="codetabs-body">' + tabsContent + '</div>';
            result += '</div>';
			if(hasDetails){
				result += '</details>';
			}
			return result;
		}
    },
    hooks: {
		finish: function(){
			//Prism.highlightAll();
		},
        init: function() {
			
            var book = this;

            syncFile(book, 'code', 'code.js', './code/code.js');
            syncFile(book, 'code', 'code.css', './code/code.css');

            syncFile(book, 'codetab', 'codetab.js', './codetab/codetab.js');
            syncFile(book, 'codetab', 'codetab.css', './codetab/codetab.css');

            if (isEbook(book)) {
                syncFile(book, '', 'prism-ebook.css', './prism-ebook.css');
            }

        },
	    page: function(page) {			
            let highlighted = false;
			let book = this;
			let doc = JSDOM(page.content);
			let $ = doc.querySelectorAll.bind(doc);
			let defaultSummary = getConfig(this, 'pluginsConfig.prism-fox.details-summary', null) || DEFAULT_SUMMARY;
			$('pre').forEach((e,i) =>{
				let code = e.querySelector('code');
				let codeConfig = parseCodeConfig(code.className,null,book);
				let dataLine = codeConfig['data-line'];
				if(!!dataLine){
					e.setAttribute("data-line", dataLine);
				}			
				code.className='';
				code.classList.add("match-braces");
				code.classList.add("language-"+codeConfig['language']);
				let multipleLine = code.innerHTML.split('\n').length > 1;
				if(multipleLine){
				   e.classList.add("line-numbers");	
				}
				let details = codeConfig['details'];
				if(codeConfig.hasOwnProperty('details')){
					if(!details){
						details = defaultSummary;
					}
					e.setAttribute("data-details", details);
				}
				e.style.fontSize="13px";
				highlighted = true;
			});
			if(highlighted){
				let result = toHTML(doc);
			    page.content = result;	
			}
            return page;
        }
    }
};

function getConfig(context, property, defaultValue) {
    var config = context.config ? /* 3.x */ context.config : /* 2.x */ context.book.config;
    return config.get(property, defaultValue);
}

function getCodeTabSeperator(block, context) {
    let codeTabSeperator = block.kwargs.codeTabSeperator || getConfig(context, 'pluginsConfig.prism.codeTabSeperator', '') || DEFAULT_CODE_TAB_SEPERATOR;
    return codeTabSeperator;
}

function parseCodeConfig(configStr,codeTabSeperator,context) {
    let configIndex = configStr.indexOf('{');
	let result = {};
    if (configIndex == -1) {
        result['language'] = trim(configStr);
    }else{
        result['language'] = trim(configStr.substring(0,configIndex));		
		let codeConfig = JSON.parse(configStr.substring(configIndex));
		result['data-line'] = codeConfig['lines'];
		if(codeConfig.hasOwnProperty('details')){
			result['details'] = codeConfig['details'];
		}
	}
	let language = result['language'];
	if(language.indexOf('lang-')==0){
		language = language.substring(5);
	}
	if(!!codeTabSeperator){
	   let codeTabSeperatorIndex = language.indexOf(codeTabSeperator);
       if(codeTabSeperatorIndex> -1 ){
		   result['title'] = language.substring(codeTabSeperatorIndex + codeTabSeperator.length);
		   language = language.substring(0, codeTabSeperatorIndex);
	   }else{
		   result['title'] = language;
	   }
	}
	let userDefinedLang = getConfig(context, 'pluginsConfig.prism-fox.lang', {});
	language = userDefinedLang[language] || MAP_LANGUAGES[language] || language;
	result['language'] = language;
	return result;
}

function toHTML (fragment) {
  var out = [];
  var ch = fragment.children;
  for (var i = 0, m = ch.length; i < m; ++i) {
    out.push(ch.item(i).outerHTML);
  }
  return out.join('');
}

const AMP_REGEX = /&/g,
  NBSP_REGEX = /\u00a0/g,
  DOUBLE_QUOTE_REGEX = /"/g,
  LT_REGEX = /</g,
  GT_REGEX = />/g;

function escapeString(str, attrMode) {
    str = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');

    if (attrMode) {
        str = str.replace(DOUBLE_QUOTE_REGEX, '&quot;');
    } else {
        str = str.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
    }
    return str;
}