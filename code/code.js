require(['gitbook', 'jQuery'], function(gitbook, $) {

    const TERMINAL_HOOK = '**[terminal]'
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

    function formatCodeBlock(block) {
        wrapper = block.wrap('<div class="code-wrapper"></div>');

        addCopyButton(wrapper);
        enableCodeExpandCollapse(block);
    }

    function updateCopyButton(button) {
        var id = button.attr('data-command');
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
        addCopyTextarea();
    });

    gitbook.events.bind('page.change', function() {
		if (typeof Prism !== 'undefined') {
           Prism.highlightAll();
        }
        $('pre').each(function(index,pre) {
            formatCodeBlock($(pre));
        });
    });

});

function enableCodeExpandCollapse(block){
	let detailsAttr = block.attr("data-details");
	if(!detailsAttr){
		return;
	}
	let hasCodeTab = block.closest(".codetabs-body").length > 0;
	if(hasCodeTab){
		return;
	}
	let codeBlock = block.parents("div.code-wrapper");
	codeBlock.wrap('<details></details>');
	codeBlock.parent().prepend(`<summary class='code-expand-collapse'><i class="fa fa-code"></i>&nbsp;${detailsAttr}</summary>`);
}