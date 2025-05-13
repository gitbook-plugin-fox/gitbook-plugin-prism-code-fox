require(['gitbook', 'jQuery'], function(gitbook, $) {

    const TERMINAL_HOOK = '**[terminal]'

    var pluginConfig = {};
    var timeouts = {};

    function addCopyButton(wrapper) {
        wrapper.append(
            $('<i class="fa fa-clone t-copy"></i>')
            .click(function() {
                copyCommand($(this));
            })
        );
    }

    function addCopyTextarea() {

        /* Add also the text area that will allow to copy */
        $('body').append('<textarea id="code-textarea" />');
    }

    function copyCommand(button) {
        pre = button.parent();
        textarea = $('#code-textarea');
        textarea.val(pre.text());
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        pre.focus();
        updateCopyButton(button);
    }

    function initializePlugin(config) {
        pluginConfig = config.code;
    }

    function format_code_block(block) {
        /*
         * Add line numbers for multiline blocks.
         */
        code = block.children('code');
        let codeConfig = parseCodeConfig(code);
        let highlightLines = [];
        if (!!codeConfig) {
            highlightLines = processHightLineRange(codeConfig['data-line']);
        }

        lines = code.html().split('\n');
        if (lines[lines.length - 1] == '') {
            lines.splice(-1, 1);
        }

        if (lines.length > 1) {
            lines = lines.map((line, index) => {
                let pos = index + 1;
                let highlight = '';
                if (!!highlightLines && highlightLines.some(e => pos >= e.start && pos <= e.end)) {
                    highlight = 'highlight-line';
                }
                let result = `<span class="code-line ${highlight}">${line}</span>`;
                return result;
            });
            code.html(lines.join('\n'));
        }

        // Add wrapper to pre element
        wrapper = block.wrap('<div class="code-wrapper"></div>');

        addCopyButton(wrapper);
    }

    function updateCopyButton(button) {
        id = button.attr('data-command');
        button.removeClass('fa-clone').addClass('fa-check');

        // Clear timeout
        if (id in timeouts) {
            clearTimeout(timeouts[id]);
        }
        timeouts[id] = window.setTimeout(function() {
            button.removeClass('fa-check').addClass('fa-clone');
        }, 1000);
    }

    gitbook.events.bind('start', function(e, config) {
        initializePlugin(config);

        addCopyTextarea();
    });

    gitbook.events.bind('page.change', function() {
        $('pre').each(function() {
            format_code_block($(this));
        });
    });

});

function processHightLineRange(rangeStr) {
    if (!rangeStr) {
        return null;
    }
    let lineRanges = [];
    let ranges = rangeStr.replace(/\s+/g, '').split(',').filter(Boolean);
    ranges.forEach(curRange => {
        let range = curRange.split('-');
        let start = Number(range[0]);
        let end = Number(range[1]) || start;
        if (!Number.isInteger(start) && !Number.isInteger(end)) {
            return;
        }

        if (end < start) {
            return;
        }
        lineRanges.push({
            'start': start,
            'end': end
        });
    });
    return lineRanges;
}

function parseCodeConfig(code) {
    let codeConfig = null;
    let className = code.attr('class');
    let classIndex = className.indexOf('{')
    let dataRange = [];
    if (classIndex > -1) {
        codeConfig = JSON.parse(className.substring(classIndex));
    }
    return codeConfig;
}