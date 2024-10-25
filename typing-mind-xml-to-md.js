// TypingMind XML to Markdown Extension
// Version 3.0 - Simplified Direct Approach

// Add styles first
const style = document.createElement('style');
style.textContent = `
    .xml-block {
        margin: 10px 0;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #e1e4e8);
        background: var(--bg-color, #f6f8fa);
    }

    .xml-block .block-header {
        display: flex;
        align-items: center;
        font-weight: bold;
        margin-bottom: 8px;
        gap: 8px;
    }

    .xml-block .block-content {
        padding: 8px;
        background: var(--content-bg, #ffffff);
        border-radius: 4px;
    }

    /* Block types */
    .thinking-block {
        border-left: 4px solid #0366d6;
    }

    .function-block {
        border-left: 4px solid #28a745;
    }

    .error-block {
        border-left: 4px solid #cb2431;
    }

    .context-block {
        border-left: 4px solid #f6b73c;
    }

    .file-block {
        border-left: 4px solid #6f42c1;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
        .xml-block {
            --bg-color: #161b22;
            --content-bg: #0d1117;
            --border-color: #30363d;
        }
    }

    /* Collapsible functionality */
    .xml-block .collapse-toggle {
        cursor: pointer;
        opacity: 0.7;
    }

    .xml-block .collapse-toggle:hover {
        opacity: 1;
    }

    .xml-block.collapsed .block-content {
        display: none;
    }
`;
document.head.appendChild(style);

// Tag transformation functions
const transformations = {
    thinking: (content) => `
        <div class="xml-block thinking-block">
            <div class="block-header">
                <span>💭</span>
                <span>Thinking Process</span>
                <span class="collapse-toggle">▼</span>
            </div>
            <div class="block-content">${content}</div>
        </div>
    `,

    function_calls: (content) => `
        <div class="xml-block function-block">
            <div class="block-header">
                <span>⚙️</span>
                <span>Function Execution</span>
                <span class="collapse-toggle">▼</span>
            </div>
            <div class="block-content">
                <pre><code>${content}</code></pre>
            </div>
        </div>
    `,

    error: (content) => `
        <div class="xml-block error-block">
            <div class="block-header">
                <span>❌</span>
                <span>Error</span>
                <span class="collapse-toggle">▼</span>
            </div>
            <div class="block-content">${content}</div>
        </div>
    `,

    context: (content) => `
        <div class="xml-block context-block">
            <div class="block-header">
                <span>🔍</span>
                <span>Context</span>
                <span class="collapse-toggle">▼</span>
            </div>
            <div class="block-content">${content}</div>
        </div>
    `,

    file_attachment: (content) => `
        <div class="xml-block file-block">
            <div class="block-header">
                <span>📎</span>
                <span>File Attachment</span>
                <span class="collapse-toggle">▼</span>
            </div>
            <div class="block-content">${content}</div>
        </div>
    `
};

// Process XML tags in a message
function processMessage(element) {
    // Skip if already processed
    if (element.hasAttribute('data-xml-processed')) return;

    let content = element.innerHTML;
    let hasChanges = false;

    // Process each tag type
    Object.entries(transformations).forEach(([tag, transform]) => {
        const regex = new RegExp(`<${tag}>([\\\s\\\S]*?)<\/${tag}>`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, (_, match) => transform(match.trim()));
            hasChanges = true;
        }
    });

    // Update content if changes were made
    if (hasChanges) {
        element.innerHTML = content;
        element.setAttribute('data-xml-processed', 'true');
        
        // Add click handlers for collapse toggles
        element.querySelectorAll('.collapse-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const block = e.target.closest('.xml-block');
                block.classList.toggle('collapsed');
                e.target.textContent = block.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
    }
}

// Process all messages
function processAllMessages() {
    document.querySelectorAll('[data-element-id="ai-response"]').forEach(processMessage);
}

// Set up observer for new messages
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.matches('[data-element-id="ai-response"]')) {
                        processMessage(node);
                    } else {
                        node.querySelectorAll('[data-element-id="ai-response"]').forEach(processMessage);
                    }
                }
            });
        }
    });
});

// Start observing
const chatSpace = document.querySelector('[data-element-id="chat-space-middle-part"]');
if (chatSpace) {
    observer.observe(chatSpace, {
        childList: true,
        subtree: true
    });
    console.log('XML-MD Extension: Observer started');
    processAllMessages();
} else {
    console.error('XML-MD Extension: Chat space not found');
}

// Process existing messages on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAllMessages);
} else {
    processAllMessages();
}

// Log successful initialization
console.log('XML-MD Extension: Initialized');
