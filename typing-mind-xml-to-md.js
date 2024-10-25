// TypingMind XML to Markdown Extension
// Version 2.3
// Enhanced with correct DOM targeting and streaming support

// Performance monitoring
const perfMonitor = {
    startTime: null,
    start() {
        this.startTime = performance.now();
    },
    end(operation) {
        const duration = performance.now() - this.startTime;
        console.log(`${operation} took ${duration.toFixed(2)}ms`);
    }
};

// Configuration based on TypingMind's DOM structure
const CONFIG = {
    debugMode: true,
    elementIds: {
        chatSpace: 'chat-space-middle-part',
        chatItem: 'custom-chat-item',
        messageInput: 'message-input',
        background: 'chat-space-background'
    },
    attributes: {
        streaming: 'data-streaming'
    },
    classes: {
        preserve: [
            'px-4', 'py-2', 'flex', 'items-center',
            'text-sm', 'font-medium', 'dark:bg-gray-950',
            'text-gray-900'
        ]
    },
    // XML tags to transform
    knownXmlTags: [
        'thinking', 'streaming', 'function_calls',
        'error', 'context', 'assistant_profile',
        'file_attachment'
    ]
};

// Make extension globally accessible
window.XMLMDExtension = {
    CONFIG,
    initialized: false
};

// Enhanced logger
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

// HTML Encoder/Decoder
const decoder = {
    decode(encodedString) {
        if (!encodedString) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = encodedString;
        return textarea.value;
    },
    encode(decodedString) {
        if (!decodedString) return '';
        const textarea = document.createElement('textarea');
        textarea.textContent = decodedString;
        return textarea.innerHTML;
    }
};

// Tag tracking with streaming support
const tagTracker = {
    counts: {},
    processed: new Set(),
    streaming: new Set(),
    
    increment(type) {
        this.counts[type] = (this.counts[type] || 0) + 1;
        return this.counts[type];
    },
    
    markProcessed(elementId, isStreaming = false) {
        this.processed.add(elementId);
        if (isStreaming) {
            this.streaming.add(elementId);
        } else {
            this.streaming.delete(elementId);
        }
        logger.debug(`Marked ${isStreaming ? 'streaming' : 'completed'}: ${elementId}`);
    },
    
    isProcessed(elementId) {
        return this.processed.has(elementId);
    },
    
    isStreaming(elementId) {
        return this.streaming.has(elementId);
    },
    
    reset() {
        this.counts = {};
        this.processed.clear();
        this.streaming.clear();
    }
};

// Enhanced XML detection
function containsXML(text) {
    if (!text) return false;
    
    const decodedText = decoder.decode(text);
    
    // Check for streaming state
    if (decodedText.includes('<streaming>')) {
        return true;
    }
    
    // Check for Claude-specific tags
    const tagPattern = new RegExp(`<(/?)(${CONFIG.knownXmlTags.join('|')})(\\s|>|/>)`, 'i');
    if (tagPattern.test(decodedText)) {
        return true;
    }
    
    return false;
}

// Conversion rules with streaming support
const conversionRules = [
    // Streaming indicator
    {
        pattern: /<streaming>([\s\S]*?)<\/streaming>/g,
        replacement: (match, content) => `
            <div class="claude-block streaming-block prose" id="streaming-${tagTracker.increment('streaming')}">
                <div class="block-header">
                    <span class="icon">⌛</span>
                    <span class="title">Streaming Response</span>
                </div>
                <div class="block-content">
                    ${content.trim()}
                </div>
            </div>
        `
    },
    
    // Thinking process
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
    
    // Function calls
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
    
    // Error messages
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
    }
];

// Process messages with streaming support
function processMessage(element) {
    try {
        perfMonitor.start();
        
        const elementId = element.id || `msg-${Date.now()}`;
        const isStreaming = element.getAttribute(CONFIG.attributes.streaming) === 'true';
        
        // Skip if already processed and streaming state hasn't changed
        if (tagTracker.isProcessed(elementId) && tagTracker.isStreaming(elementId) === isStreaming) {
            return;
        }
        
        // Decode content
        const encodedContent = element.innerHTML;
        const decodedContent = decoder.decode(encodedContent);
        
        if (!decodedContent || !containsXML(decodedContent)) {
            return;
        }
        
        logger.info(`Processing message: ${elementId}`, {
            streaming: isStreaming,
            contentLength: decodedContent.length
        });
        
        // Apply conversion rules
        let processedContent = decodedContent;
        conversionRules.forEach(rule => {
            processedContent = processedContent.replace(rule.pattern, rule.replacement);
        });
        
        // Update content if changed
        if (processedContent !== decodedContent) {
            element.innerHTML = decoder.encode(processedContent);
            addBlockHandlers(element);
            tagTracker.markProcessed(elementId, isStreaming);
        }
        
        perfMonitor.end(`Process message ${elementId}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, error);
    }
}

// Add event handlers
function addBlockHandlers(container) {
    // Collapse toggle handlers
    container.querySelectorAll('.collapse-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const block = button.closest('.claude-block');
            const content = block.querySelector('.block-content');
            const isVisible = content.style.display !== 'none';
            
            content.style.display = isVisible ? 'none' : 'block';
            button.textContent = isVisible ? '▼' : '▲';
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

        .streaming-block {
            border-left: 4px solid #6f42c1;
            opacity: 0.8;
        }

        .error-block {
            border-left: 4px solid #cb2431;
        }

        .function-block {
            border-left: 4px solid #28a745;
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
    logger.info('Custom styles added');
}

// Setup mutation observer
function setupObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const chatItems = document.querySelectorAll(`[data-element-id="${CONFIG.elementIds.chatItem}"]`);
                chatItems.forEach(item => processMessage(item));
            }
        });
    });

    // Observe the chat space
    const chatSpace = document.querySelector(`[data-element-id="${CONFIG.elementIds.chatSpace}"]`);
    if (chatSpace) {
        observer.observe(chatSpace, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [CONFIG.attributes.streaming]
        });
        logger.info('Observer setup complete', { target: chatSpace });
    } else {
        logger.error('Chat space not found');
    }
}

// Process existing messages
function processAllMessages() {
    const chatItems = document.querySelectorAll(`[data-element-id="${CONFIG.elementIds.chatItem}"]`);
    logger.info(`Processing ${chatItems.length} existing messages`);
    chatItems.forEach(processMessage);
}

// Initialize the extension
function initialize() {
    console.log('=== XML-MD EXTENSION LOADING ===');
    window.XMLMDExtension.initialized = true;
    
    logger.info('Initializing XML to Markdown extension');
    perfMonitor.start();
    
    addCustomStyles();
    setupObserver();
    processAllMessages();
    
    perfMonitor.end('Extension initialization');
}

// Start the extension
initialize();
