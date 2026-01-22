import React from 'react';

interface CodeBlockProps {
    code: string;
    language?: 'python' | 'javascript' | 'bash';
    maxHeight?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'python', maxHeight }) => {
    // Basic syntax highlighting for Python
    const highlightPython = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Comments
            if (line.trim().startsWith('#')) {
                return <span key={i} style={{ color: '#6272a4' }}>{line}{'\n'}</span>;
            }

            // Simple tokenization (very refreshing logic, not a full parser)
            const parts = line.split(/(\b(?:from|import|def|return|class|if|else|for|in|as)\b|"[^"]*"|'[^']*'|#.*)/g);

            return (
                <div key={i}>
                    {parts.map((part, j) => {
                        if (!part) return null;

                        // Keywords
                        if (/^(from|import|def|return|class|if|else|for|in|as)$/.test(part)) {
                            return <span key={j} style={{ color: '#ff79c6', fontWeight: 'bold' }}>{part}</span>;
                        }
                        // Strings
                        if (/^"[^"]*"|'[^']*'$/.test(part)) {
                            return <span key={j} style={{ color: '#f1fa8c' }}>{part}</span>;
                        }
                        // Comments inside line
                        if (part.startsWith('#')) {
                            return <span key={j} style={{ color: '#6272a4' }}>{part}</span>;
                        }
                        // Default
                        return <span key={j} style={{ color: '#f8f8f2' }}>{part}</span>;
                    })}
                </div>
            );
        });
    };

    return (
        <div style={{
            background: '#282a36', // Dracula-ish background
            padding: '1.5rem',
            borderRadius: '0px', // Remove radius to fit seamless if needed, or keep to match design. Let's keep 0 since parent has radius.
            // Actually parent has radius 1rem. CodeBlock should probably fill it.
            // Let's set height 100% and overflow auto.
            height: '100%',
            width: '100%',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: '0.85rem', // Slightly smaller font
            lineHeight: 1.5,
            overflow: 'auto', // Scroll logic
            boxSizing: 'border-box',
        }}>
            <pre style={{ margin: 0, padding: 0, fontFamily: 'inherit' }}>
                <code>
                    {language === 'python' ? highlightPython(code) : code}
                </code>
            </pre>
        </div>
    );
};

export default CodeBlock;
