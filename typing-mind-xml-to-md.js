// TypingMind XML to Markdown Extension
// Version 2.0
// Enhanced Claude Tag Support

// Configuration object for extension settings
const CONFIG = {
    debugMode: false,
    elementIds: {
        chatContainer: 'chat-container',
        messageContent: 'message-content'
    },
    // All supported Claude-specific and general XML tags
    knownXmlTags: [
        // Core Claude tags
        'thinking', 'instructions', 'context', 'output',
        'ASSISTANT_PROFILE', 'ROLE', 'PERSONA',
        'FILE_ATTACHMENT', 'FILE_NAME', 'FILE_CONTENT',
        'function_calls', 'invoke', 'parameter', 'function_results',
        // Analysis and processing tags
        'analysis', 'evaluation', 'reasoning', 'conclusion',
        'initial_analysis', 'intermediate_steps', 'final_conclusion',
        'confidence_level', 'alternative_approaches',
        // Document structure tags
        'document', 'section', 'content', 'toc',
        // Error and status tags
        'error', 'warning', 'validation_error', 'system_message',
        // Data organization tags
        'key_points', 'supporting_evidence', 'counter_arguments', 'references',
        // Progress indicators
        'progress_status', 'completion_percentage', 'time_estimate', 'processing_stage'
    ]
};

// Utility logger with timestamp
const logger = {
    log: (msg) => CONFIG.debugMode && console.log(`[XML-MD Extension ${new Date().toISOString()}]:`, msg),
    error: (msg) => CONFIG.debugMode && console.error(`[XML-MD Extension ${new Date().toISOString()}]:`, msg)
};

// Tag counter for unique IDs
const tagTracker = {
    counts: {},
    increment(type) {
        this.counts[type] = (this.counts[type] || 0) + 1;
        return this.counts[type];
    },
    reset() {
        this.counts = {};
    }
};

// Enhanced XML detection with Claude-specific patterns
function containsXML(text) {
    if (!text) return false;
    
    // Check for explicit XML markers
    if (text.includes('<?xml') || text.includes('<!DOCTYPE')) {
        return true;
    }

    // Check for Claude-specific tags
    const claudeTagPattern = /<(thinking|ASSISTANT_PROFILE|FILE_ATTACHMENT)[^>]*>/i;
    if (claudeTagPattern.test(text)) {
        return true;
    }

    // Check for known tag patterns
    const knownTagPattern = new RegExp(`<(/?)(${CONFIG.knownXmlTags.join('|')})(\\s|>|/>)`, 'i');
    if (knownTagPattern.test(text)) {
        return true;
    }

    // Check for well-formed XML structure
    const hasMatchingTags = /<([a-zA-Z][a-zA-Z0-9_]*)[^>]*>[\s\S]*?<\/\1>/g.test(text);
    if (hasMatchingTags) {
        return true;
    }

    return false;
}

// Comprehensive conversion rules for all supported tags
const conversionRules = [
    // Thinking process
    {
        pattern: /<thinking>([\s\S]*?)<\/thinking>/g,
        replacement: (match, content) => `
            <div class="claude-block thinking-block" id="thinking-${tagTracker.increment('thinking')}">
                <div class="block-header">
                    <span class="icon">💭</span>
                    <span class="title">Thought Process</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },
    
    // File attachments
    {
        pattern: /<FILE_ATTACHMENT>([\s\S]*?)<\/FILE_ATTACHMENT>/g,
        replacement: (match, content) => `
            <div class="claude-block file-block" id="file-${tagTracker.increment('file')}">
                <div class="block-header">
                    <span class="icon">📎</span>
                    <span class="title">File Attachment</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },

    // Assistant profile
    {
        pattern: /<ASSISTANT_PROFILE.*?>([\s\S]*?)<\/ASSISTANT_PROFILE>/g,
        replacement: (match, content) => `
            <div class="claude-block profile-block" id="profile-${tagTracker.increment('profile')}">
                <div class="block-header">
                    <span class="icon">🤖</span>
                    <span class="title">Assistant Profile</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },

    // Function calls
    {
        pattern: /<function_calls>([\s\S]*?)<\/function_calls>/g,
        replacement: (match, content) => `
            <div class="claude-block function-block" id="function-${tagTracker.increment('function')}">
                <div class="block-header">
                    <span class="icon">⚙️</span>
                    <span class="title">Function Execution</span>
                    <div class="block-controls">
                        <button class="copy-button">📋</button>
                        <button class="collapse-toggle">▼</button>
                    </div>
                </div>
                <div class="block-content">
                    <pre><code>${content.trim()}</code></pre>
                </div>
            </div>
        `
    },

    // Context blocks
    {
        pattern: /<context>([\s\S]*?)<\/context>/g,
        replacement: (match, content) => `
            <div class="claude-block context-block" id="context-${tagTracker.increment('context')}">
                <div class="block-header">
                    <span class="icon">🔍</span>
                    <span class="title">Context</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },

    // Instructions
    {
        pattern: /<instructions>([\s\S]*?)<\/instructions>/g,
        replacement: (match, content) => `
            <div class="claude-block instruction-block" id="instruction-${tagTracker.increment('instruction')}">
                <div class="block-header">
                    <span class="icon">📝</span>
                    <span class="title">Instructions</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },

    // Error messages
    {
        pattern: /<error>([\s\S]*?)<\/error>/g,
        replacement: (match, content) => `
            <div class="claude-block error-block" id="error-${tagTracker.increment('error')}">
                <div class="block-header">
                    <span class="icon">❌</span>
                    <span class="title">Error</span>
                    <button class="collapse-toggle">▼</button>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    }
];

// Process messages containing XML
function processMessage(element) {
    try {
        const content = element.textContent;
        if (!content || !containsXML(content)) return;

        logger.log('Processing message with XML content');
        
        // Reset tag counter for new message
        tagTracker.reset();
        
        // Apply conversion rules
        let processedContent = content;
        conversionRules.forEach(rule => {
            processedContent = processedContent.replace(rule.pattern, rule.replacement);
        });

        // Update content if changed
        if (processedContent !== content) {
            element.innerHTML = processedContent;
            
            // Add event listeners to new elements
            addBlockHandlers(element);
            
            logger.log('Message converted successfully');
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
    }
}

// Add event handlers to interactive elements
function addBlockHandlers(container) {
    // Collapse toggle handlers
    container.querySelectorAll('.collapse-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const content = button.closest('.claude-block').querySelector('.block-content');
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            button.textContent = isVisible ? '▼' : '▲';
        });
    });

    // Copy button handlers
    container.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            const content = button.closest('.claude-block').querySelector('.block-content').textContent;
            navigator.clipboard.writeText(content.trim())
                .then(() => {
                    button.textContent = '✓';
                    setTimeout(() => button.textContent = '📋', 2000);
                })
                .catch(err => logger.error('Copy failed:', err));
        });
    });
}

// Add custom styles
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .claude-block {
            margin: 1rem 0;
            border-radius: 8px;
            background: var(--block-bg, #ffffff);
            border: 1px solid var(--border-color, #e1e4e8);
            overflow: hidden;
        }

        .block-header {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: var(--header-bg, #f6f8fa);
            border-bottom: 1px solid var(--border-color, #e1e4e8);
        }

        .block-header .icon {
            margin-right: 8px;
        }

        .block-header .title {
            flex: 1;
            font-weight: 600;
        }

        .block-controls {
            display: flex;
            gap: 8px;
        }

        .block-content {
            padding: 12px;
            overflow-x: auto;
        }

        .collapse-toggle, .copy-button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0.7;
        }

        .collapse-toggle:hover, .copy-button:hover {
            opacity: 1;
            background: var(--button-hover-bg, rgba(0,0,0,0.1));
        }

        /* Block-specific styles */
        .thinking-block {
            border-left: 4px solid #0366d6;
        }

        .error-block {
            border-left: 4px solid #cb2431;
        }

        .function-block {
            border-left: 4px solid #28a745;
        }

        .profile-block {
            border-left: 4px solid #6f42c1;
        }

        .context-block {
            border-left: 4px solid #f6b73c;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .claude-block {
                --block-bg: #0d1117;
                --header-bg: #161b22;
                --border-color: #30363d;
                --button-hover-bg: rgba(255,255,255,0.1);
            }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .block-header {
                flex-wrap: wrap;
            }

            .block-controls {
                width: 100%;
                justify-content: flex-end;
                margin-top: 8px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Observe chat container for new messages
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                setTimeout(processAllMessages, 100);
            }
        });
    });

    const chatContainer = document.querySelector(`[data-element-id="${CONFIG.elementIds.chatContainer}"]`);
    if (chatContainer) {
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
        logger.log('Observer set up successfully');
    } else {
        logger.error('Chat container not found');
    }
}

// Process all existing messages
function processAllMessages() {
    const messages = document.querySelectorAll(`[data-element-id="${CONFIG.elementIds.messageContent}"]`);
    messages.forEach(processMessage);
}

// Initialize the extension
function initialize() {
    logger.log('Initializing XML to Markdown extension');
    addCustomStyles();
    setupObserver();
    processAllMessages();
}

// Start the extension
initialize();
