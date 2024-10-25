// TypingMind XML to Markdown Extension
// Version 2.1
// Enhanced Claude Tag Support with TypingMind-specific handling
console.log('=== XML-MD EXTENSION LOADING ===');
window.XMLMDLoaded = true;
const CONFIG = {
    debugMode: true,
    elementIds: {
        responseBlock: 'response-block',
        aiResponse: 'ai-response',
        chatContainer: 'chat-messages-container'
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

// Enhanced logger with timestamps and message types
const logger = {
    _log(type, msg, data = null) {
        if (!CONFIG.debugMode) return;
        const timestamp = new Date().toISOString();
        const logMessage = `[XML-MD ${type} ${timestamp}]: ${msg}`;
        if (data) {
            console.group(logMessage);
            console.log('Details:', data);
            console.groupEnd();
        } else {
            console.log(logMessage);
        }
    },
    info: (msg, data) => logger._log('INFO', msg, data),
    warn: (msg, data) => logger._log('WARN', msg, data),
    error: (msg, data) => logger._log('ERROR', msg, data),
    debug: (msg, data) => logger._log('DEBUG', msg, data)
};

// Tag tracking with enhanced debugging
const tagTracker = {
    counts: {},
    processed: new Set(),
    increment(type) {
        this.counts[type] = (this.counts[type] || 0) + 1;
        logger.debug(`Incrementing tag counter: ${type}`, this.counts);
        return this.counts[type];
    },
    markProcessed(elementId) {
        this.processed.add(elementId);
        logger.debug(`Marked as processed: ${elementId}`);
    },
    isProcessed(elementId) {
        return this.processed.has(elementId);
    },
    reset() {
        this.counts = {};
        this.processed.clear();
        logger.debug('Tag tracker reset');
    }
};

// Enhanced XML detection specifically for Claude's output
function containsXML(text) {
    if (!text) return false;
    
    // Check for explicit XML markers
    if (text.includes('<?xml') || text.includes('<!DOCTYPE')) {
        logger.debug('Found explicit XML markers');
        return true;
    }

    // Check for Claude-specific tags
    const claudeTagPattern = /<(thinking|ASSISTANT_PROFILE|FILE_ATTACHMENT)[^>]*>/i;
    if (claudeTagPattern.test(text)) {
        logger.debug('Found Claude-specific tags');
        return true;
    }

    // Check for known tag patterns
    const knownTagPattern = new RegExp(`<(/?)(${CONFIG.knownXmlTags.join('|')})(\\s|>|/>)`, 'i');
    if (knownTagPattern.test(text)) {
        logger.debug('Found known XML tags');
        return true;
    }

    return false;
}

// Conversion rules updated for TypingMind's prose formatting
const conversionRules = [
    // Thinking process with prose formatting
    {
        pattern: /<thinking>([\s\S]*?)<\/thinking>/g,
        replacement: (match, content) => `
            <div class="claude-block thinking-block prose" id="thinking-${tagTracker.increment('thinking')}">
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
    
    // Function calls with syntax highlighting
    {
        pattern: /<function_calls>([\s\S]*?)<\/function_calls>/g,
        replacement: (match, content) => `
            <div class="claude-block function-block prose" id="function-${tagTracker.increment('function')}">
                <div class="block-header">
                    <span class="icon">⚙️</span>
                    <span class="title">Function Execution</span>
                    <div class="block-controls">
                        <button class="copy-button">📋</button>
                        <button class="collapse-toggle">▼</button>
                    </div>
                </div>
                <div class="block-content">
                    <pre><code class="language-javascript">${content.trim()}</code></pre>
                </div>
            </div>
        `
    },

    // Error messages with highlighting
    {
        pattern: /<error>([\s\S]*?)<\/error>/g,
        replacement: (match, content) => `
            <div class="claude-block error-block prose" id="error-${tagTracker.increment('error')}">
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
    },

    // Context blocks with enhanced formatting
    {
        pattern: /<context>([\s\S]*?)<\/context>/g,
        replacement: (match, content) => `
            <div class="claude-block context-block prose" id="context-${tagTracker.increment('context')}">
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

    // File attachments with collapsible content
    {
        pattern: /<FILE_ATTACHMENT>([\s\S]*?)<\/FILE_ATTACHMENT>/g,
        replacement: (match, content) => `
            <div class="claude-block file-block prose" id="file-${tagTracker.increment('file')}">
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
    }
];

// Process messages with enhanced error handling and debugging
function processMessage(element) {
    try {
        // Generate unique ID for tracking
        const elementId = element.id || `msg-${Date.now()}`;
        
        // Check if already processed
        if (tagTracker.isProcessed(elementId)) {
            logger.debug(`Skipping already processed message: ${elementId}`);
            return;
        }

        const content = element.textContent;
        if (!content || !containsXML(content)) {
            logger.debug(`No XML content found in message: ${elementId}`);
            return;
        }

        logger.info(`Processing message: ${elementId}`, { contentLength: content.length });
        
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
            
            // Mark as processed
            tagTracker.markProcessed(elementId);
            
            logger.info(`Successfully converted message: ${elementId}`);
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, error);
    }
}

// Enhanced event handlers for interactive elements
function addBlockHandlers(container) {
    // Collapse toggle handlers
    container.querySelectorAll('.collapse-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const block = button.closest('.claude-block');
            const content = block.querySelector('.block-content');
            const isVisible = content.style.display !== 'none';
            
            content.style.display = isVisible ? 'none' : 'block';
            button.textContent = isVisible ? '▼' : '▲';
            
            logger.debug(`Toggle block visibility: ${block.id}`, { isVisible: !isVisible });
        });
    });

    // Copy button handlers
    container.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            const block = button.closest('.claude-block');
            const content = block.querySelector('.block-content').textContent;
            
            navigator.clipboard.writeText(content.trim())
                .then(() => {
                    button.textContent = '✓';
                    setTimeout(() => button.textContent = '📋', 2000);
                    logger.debug(`Copied content from block: ${block.id}`);
                })
                .catch(err => logger.error('Copy failed:', err));
        });
    });
}

// Add custom styles with TypingMind-specific adjustments
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

        .file-block {
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

        /* TypingMind-specific adjustments */
        .prose .claude-block {
            max-width: none;
        }

        .prose pre {
            margin: 0;
        }

        .prose .block-content {
            margin: 0;
        }
    `;
    document.head.appendChild(style);
    logger.info('Custom styles added');
}

// Enhanced observer setup for TypingMind
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Look for AI responses
            const aiResponses = document.querySelectorAll('[data-element-id="ai-response"]');
            aiResponses.forEach(response => {
                if (!tagTracker.isProcessed(response.id)) {
                    logger.debug('Found new AI response', { id: response.id });
                    processMessage(response);
                }
            });
        });
    });

    // Observe the chat container
    const chatContainer = document.querySelector(`.${CONFIG.elementIds.chatContainer}`);
    if (chatContainer) {
        observer.observe(chatContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
        logger.info('Observer setup complete', { target: chatContainer });
    } else {
        logger.error('Chat container not found');
    }
}

// Process all existing messages
function processAllMessages() {
    const messages = document.querySelectorAll('[data-element-id="ai-response"]');
    logger.info(`Processing ${messages.length} existing messages`);
    messages.forEach(processMessage);
}

// Initialize the extension
function initialize() {
    logger.info('Initializing XML to Markdown extension');
    addCustomStyles();
    setupObserver();
    processAllMessages();
}

// Start the extension
initialize();
