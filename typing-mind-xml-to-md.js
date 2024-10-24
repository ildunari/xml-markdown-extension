// TypingMind XML to Markdown Extension
// Version 1.1
// Author: [Your Name]
// Last Updated: 2024-10-24

const CONFIG = {
    elementIds: {
        chatContainer: 'chat-container',
        messageContent: 'message-content'
    },
    debugMode: false,
    // Define known XML structures we want to specifically handle
    knownXmlTags: [
        // Common document structure tags
        'document', 'section', 'content',
        // Specific use case tags
        'endnote_library', 'text_with_citations', 'converted_text',
        'unmatched_citations', 'notes',
        // Generic content tags
        'output', 'result', 'response', 'data',
        // Specialized tags
        'code', 'example', 'summary', 'details',
        // Analysis tags
        'analysis', 'evaluation', 'recommendation',
        // Error and status tags
        'error', 'warning', 'status', 'message'
    ]
};

// Utility logger
const logger = {
    log: (msg) => CONFIG.debugMode && console.log('[XML-MD Extension]:', msg),
    error: (msg) => CONFIG.debugMode && console.error('[XML-MD Extension]:', msg)
};

// Enhanced XML detection
function containsXML(text) {
    if (!text) return false;
    
    // Helper function to count XML-like structures
    function countXMLStructures(text) {
        const openingTags = (text.match(/<[a-zA-Z][a-zA-Z0-9_]*[^>]*>/g) || []).length;
        const closingTags = (text.match(/<\/[a-zA-Z][a-zA-Z0-9_]*>/g) || []).length;
        return { openingTags, closingTags };
    }

    // 1. Check for explicit XML markers
    if (text.includes('<?xml') || text.includes('<!DOCTYPE')) {
        return true;
    }

    // 2. Check for known XML tag patterns
    const knownTagPattern = new RegExp(`<(/?)(${CONFIG.knownXmlTags.join('|')})(\\s|>|/>)`, 'i');
    if (knownTagPattern.test(text)) {
        return true;
    }

    // 3. Check for well-formed XML-like structure
    const counts = countXMLStructures(text);
    if (counts.openingTags >= 2 && counts.openingTags === counts.closingTags) {
        // Look for nested structure
        const hasNestedTags = /<[a-zA-Z][a-zA-Z0-9_]*[^>]*>[^<]*<[a-zA-Z][a-zA-Z0-9_]*[^>]*>/g.test(text);
        if (hasNestedTags) {
            return true;
        }
    }

    // 4. Check for specific patterns that indicate structured XML output
    const structuredPatterns = [
        /<\w+>[\s\S]*<\/\w+>/m,  // Basic XML structure
        /<\w+\s+[^>]*>[\s\S]*<\/\w+>/m,  // XML with attributes
        /<([a-z_]+)>[\s\S]*<\/\1>/im,  // Matching opening/closing tags
    ];
    
    if (structuredPatterns.some(pattern => pattern.test(text))) {
        // Additional validation to ensure it's not just HTML or markdown
        const potentialXML = text.match(/<[^>]+>/g) || [];
        const looksLikeStructuredData = potentialXML.some(tag => {
            // Check if tags follow XML naming conventions
            return /^<[a-z_][a-z0-9_]*(_[a-z0-9_]+)*>$/i.test(tag) ||
                   /^<\/[a-z_][a-z0-9_]*(_[a-z0-9_]+)*>$/i.test(tag);
        });
        return looksLikeStructuredData;
    }

    // 5. Exclude common false positives
    const falsePositives = [
        /^```/m,  // Code blocks
        /^>\s/m,  // Blockquotes
        /<http/,  // URLs
        /<mailto:/,  // Email links
        /$$[^$$]+\]$$[^$$]+\)/  // Markdown links
    ];
    
    if (falsePositives.some(pattern => pattern.test(text))) {
        return false;
    }

    return false;
}

// Conversion rules
const conversionRules = [
    // Headers
    { pattern: /<h1>(.*?)<\/h1>/g, replacement: '# $1\n' },
    { pattern: /<h2>(.*?)<\/h2>/g, replacement: '## $1\n' },
    { pattern: /<h3>(.*?)<\/h3>/g, replacement: '### $1\n' },
    { pattern: /<h4>(.*?)<\/h4>/g, replacement: '#### $1\n' },
    
    // Text formatting
    { pattern: /<strong>(.*?)<\/strong>/g, replacement: '**$1**' },
    { pattern: /<b>(.*?)<\/b>/g, replacement: '**$1**' },
    { pattern: /<em>(.*?)<\/em>/g, replacement: '*$1*' },
    { pattern: /<i>(.*?)<\/i>/g, replacement: '*$1*' },
    { pattern: /<code>(.*?)<\/code>/g, replacement: '`$1`' },
    
    // Lists
    { pattern: /<ul>(.*?)<\/ul>/gs, replacement: '$1\n' },
    { pattern: /<ol>(.*?)<\/ol>/gs, replacement: '$1\n' },
    { pattern: /<li>(.*?)<\/li>/g, replacement: '- $1\n' },
    
    // Links and images
    { pattern: /<a href="(.*?)">(.*?)<\/a>/g, replacement: '[$2]($1)' },
    { pattern: /<img src="(.*?)".*?alt="(.*?)".*?>/g, replacement: '![$2]($1)' },
    
    // Paragraphs and breaks
    { pattern: /<p>(.*?)<\/p>/g, replacement: '$1\n\n' },
    { pattern: /<br\s*\/?>/g, replacement: '\n' },
    
    // Code blocks
    { pattern: /<pre><code>(.*?)<\/code><\/pre>/gs, replacement: '```\n$1\n```\n' },
    
    // Tables
    { pattern: /<table>(.*?)<\/table>/gs, replacement: '$1\n' },
    { pattern: /<tr>(.*?)<\/tr>/g, replacement: '$1|\n' },
    { pattern: /<th>(.*?)<\/th>/g, replacement: '| $1 ' },
    { pattern: /<td>(.*?)<\/td>/g, replacement: '| $1 ' },
    
    // Blockquotes
    { pattern: /<blockquote>(.*?)<\/blockquote>/gs, replacement: '> $1\n' }
];

// Enhanced XML to Markdown conversion
function xmlToMarkdown(xmlString) {
    try {
        // Pre-processing
        let markdown = xmlString;
        
        // Handle special cases first
        const specialTags = {
            'converted_text': '### Converted Text\n\n',
            'unmatched_citations': '### Unmatched Citations\n\n',
            'notes': '### Notes\n\n',
            'endnote_library': '### Endnote Library\n\n',
            'text_with_citations': '### Original Text\n\n'
        };

        // Replace special tags with headers
        Object.entries(specialTags).forEach(([tag, header]) => {
            markdown = markdown.replace(
                new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, 'gi'),
                (match, content) => `${header}${content.trim()}\n\n`
            );
        });

        // Apply standard conversion rules
        conversionRules.forEach(rule => {
            markdown = markdown.replace(rule.pattern, rule.replacement);
        });

        // Post-processing
        markdown = markdown
            // Clean up excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Ensure proper spacing around headers
            .replace(/###/g, '\n###')
            // Clean up any remaining XML-like tags
            .replace(/<[^>]+>/g, '')
            // Trim whitespace
            .trim();

        return markdown;
    } catch (error) {
        logger.error(`Conversion error: ${error.message}`);
        return xmlString;
    }
}

// Process the messages containing XML
function processMessage(element) {
    try {
        const content = element.textContent;
        if (!content || !containsXML(content)) return;

        logger.log('Processing message with XML content');
        const markdown = xmlToMarkdown(content);
        
        if (markdown !== content) {
            const markdownDiv = document.createElement('div');
            markdownDiv.className = 'converted-markdown';
            markdownDiv.textContent = markdown;
            element.innerHTML = '';
            element.appendChild(markdownDiv);
            logger.log('Message converted successfully');
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
    }
}

// Observe the chat container for new messages
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

// Initial scanning of messages
function processAllMessages() {
    const messages = document.querySelectorAll(`[data-element-id="${CONFIG.elementIds.messageContent}"]`);
    messages.forEach(processMessage);
}

// Add custom styles for rendered markdown
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .converted-markdown {
            font-family: inherit;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        .converted-markdown code {
            background-color: rgba(0,0,0,0.1);
            padding: 2px 4px;
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);
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
