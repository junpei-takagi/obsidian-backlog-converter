// 変換ロジックを分離したモジュール
// Obsidian依存を除去してテスト可能にする

export interface BacklogConverterSettings {
    baseUrl: string;
    projectKey: string;
    enableAutoConversion: boolean;
    customRules: { pattern: string; replacement: string; }[];
    useTabsForIndent: boolean;
}

export const DEFAULT_SETTINGS: BacklogConverterSettings = {
    baseUrl: '',
    projectKey: '',
    enableAutoConversion: false,
    customRules: [],
    useTabsForIndent: true
};

export class BacklogConverter {
    private settings: BacklogConverterSettings;

    constructor(settings: BacklogConverterSettings = DEFAULT_SETTINGS) {
        this.settings = settings;
    }

    updateSettings(settings: Partial<BacklogConverterSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * MarkdownからBacklog記法への変換
     */
    convertToBacklog(content: string): string {
        let convertedContent = content;

        // 正しいBacklog記法への変換ルール（適用順序が重要）
        const conversionRules = [
            // 画像を最初に処理（リンクパターンと競合するため）
            {
                pattern: /!\[([^\]]*)\]\(([^)]+)\)/g,
                replacement: '#image($2)'
            },
            
            // 見出しを処理（*記号の競合を避けるため先に処理）
            {
                pattern: /^(#{1,6})\s+(.+)$/gm,
                replacement: (match: string, hashes: string, title: string) => {
                    const level = hashes.length;
                    return '*'.repeat(level) + ' ' + title;
                }
            },
            
            // 色指定（特定の重要語句）を太字より先に処理
            {
                pattern: /\*\*(重要|注意|警告|エラー|危険)\*\*/g,
                replacement: '&color(red) { $1 }'
            },
            
            {
                pattern: /\*\*(成功|完了|OK)\*\*/g,
                replacement: '&color(green) { $1 }'
            },
            
            {
                pattern: /\*\*(情報|参考|メモ)\*\*/g,
                replacement: '&color(blue) { $1 }'
            },
            
            // 太字を処理（色指定後に処理）
            {
                pattern: /\*\*([^*\n]+)\*\*/g,
                replacement: "''$1''"
            },
            
            // 斜体を処理（シンプルなアプローチ）
            {
                pattern: /\*([^*\n]+)\*/g,
                replacement: "'''$1'''"
            },
            
            // 打ち消し線: ~~text~~ → %%text%%
            {
                pattern: /~~([^~]+)~~/g,
                replacement: '%%$1%%'
            },
            
            // 箇条書きリスト: タブ・スペース混在インデントに対応
            {
                pattern: /^([\s\t]*)-\s+(.+)$/gm,
                replacement: (match: string, indent: string, content: string) => {
                    // インデントレベルを柔軟に計算
                    let level = 1; // デフォルトレベル
                    
                    if (indent.length > 0) {
                        // タブ文字をカウント（タブ = 1レベル）
                        const tabCount = (indent.match(/\t/g) || []).length;
                        // スペース文字をカウント（4スペース = 1レベル、2スペースも許容）
                        const spaceCount = (indent.match(/ /g) || []).length;
                        const spaceLevels = spaceCount >= 2 ? Math.floor(spaceCount / 2) : 0;
                        
                        level = 1 + tabCount + spaceLevels;
                    }
                    
                    // Backlogは最大6レベルまで対応、それ以上は6に制限
                    level = Math.min(level, 6);
                    return '-'.repeat(level) + ' ' + content;
                }
            },
            
            // 数字付きリスト: タブ・スペース混在インデントに対応
            {
                pattern: /^([\s\t]*)(\d+)\.\s+(.+)$/gm,
                replacement: (match: string, indent: string, num: string, content: string) => {
                    // インデントレベルを計算
                    let level = 0;
                    
                    if (indent.length > 0) {
                        const tabCount = (indent.match(/\t/g) || []).length;
                        const spaceCount = (indent.match(/ /g) || []).length;
                        const spaceLevels = spaceCount >= 2 ? Math.floor(spaceCount / 2) : 0;
                        level = tabCount + spaceLevels;
                    }
                    
                    // インデントを再構築（Backlogでは番号付きリストもインデントで階層表現）
                    const backlogIndent = '  '.repeat(level);
                    return backlogIndent + '+ ' + content;
                }
            },
            
            // コードブロック: ```code``` → {code}code{/code}
            {
                pattern: /```([a-zA-Z]*)\n([\s\S]*?)```/g,
                replacement: '{code}\n$2{/code}'
            },
            
            // URL: [text](url) → [[text>url]]
            {
                pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
                replacement: '[[$1>$2]]'
            },
            
            // 引用ブロック: > 複数行 → {quote}内容{/quote}
            {
                pattern: /^>\s*(.+)(?:\n^>\s*(.+))*/gm,
                replacement: (match: string) => {
                    const lines = match.split('\n').map(line => line.replace(/^>\s*/, '')).join('\n');
                    return `{quote}\n${lines}\n{/quote}`;
                }
            },
            
            // 目次
            {
                pattern: /^\[TOC\]$/gm,
                replacement: '#contents'
            }
        ];

        // 変換ルールを適用
        conversionRules.forEach(rule => {
            if (typeof rule.replacement === 'string') {
                convertedContent = convertedContent.replace(rule.pattern, rule.replacement);
            } else {
                convertedContent = convertedContent.replace(rule.pattern, rule.replacement);
            }
        });

        // カスタムルールを適用
        this.settings.customRules.forEach(rule => {
            try {
                const regex = new RegExp(rule.pattern, 'g');
                convertedContent = convertedContent.replace(regex, rule.replacement);
            } catch (error) {
                console.warn('Invalid custom rule pattern:', rule.pattern);
            }
        });

        return convertedContent;
    }

    /**
     * Backlog記法からMarkdownへの変換
     */
    convertToMarkdown(content: string): string {
        let convertedContent = content;

        // Backlog記法から標準Markdownへの逆変換ルール
        const conversionRules = [
            // 見出し: * → #
            {
                pattern: /^(\*{1,6})\s+(.+)$/gm,
                replacement: (match: string, stars: string, title: string) => {
                    const level = stars.length;
                    return '#'.repeat(level) + ' ' + title;
                }
            },
            
            // 斜体を先に処理（三重クォート）: '''text''' → *text*
            {
                pattern: /'''([^']+)'''/g,
                replacement: '*$1*'
            },
            
            // 太字を後に処理（二重クォート）: ''text'' → **text**
            {
                pattern: /''([^']+)''/g,
                replacement: '**$1**'
            },
            
            // 打ち消し線: %%text%% → ~~text~~
            {
                pattern: /%%([^%]+)%%/g,
                replacement: '~~$1~~'
            },
            
            // 箇条書きリスト: - -- --- → タブ/スペースインデント付き-
            {
                pattern: /^(-{1,6})\s+(.+)$/gm,
                replacement: (match: string, dashes: string, content: string) => {
                    // ダッシュの数から階層レベルを計算
                    const level = dashes.length - 1;
                    
                    // 設定に応じてタブまたはスペースを使用
                    const indent = this.settings.useTabsForIndent 
                        ? '\t'.repeat(level)           // タブインデント
                        : '  '.repeat(level);          // 2スペースインデント
                    
                    return indent + '- ' + content;
                }
            },
            
            // 数字付きリスト: + → タブ/スペースインデント付き1.
            {
                pattern: /^(\s*)\+\s+(.+)$/gm,
                replacement: (match: string, indent: string, content: string) => {
                    // スペースインデントからタブ/スペースインデントに変換
                    if (this.settings.useTabsForIndent && indent.length > 0) {
                        // スペース数をタブ数に変換（2スペース = 1タブ）
                        const tabCount = Math.floor(indent.length / 2);
                        const newIndent = '\t'.repeat(tabCount);
                        return newIndent + '1. ' + content;
                    } else {
                        // スペースインデントのまま使用
                        return indent + '1. ' + content;
                    }
                }
            },
            
            // コードブロック: {code}code{/code} → ```code```
            {
                pattern: /\{code\}\n?([\s\S]*?)\{\/code\}/g,
                replacement: (match: string, code: string) => {
                    return '```\n' + code.trim() + '\n```';
                }
            },
            
            // URL: [[text>url]] → [text](url)
            {
                pattern: /\[\[([^>\]]+)>([^\]]+)\]\]/g,
                replacement: '[$1]($2)'
            },
            
            // URL: [[text:url]] → [text](url)
            {
                pattern: /\[\[([^:\]]+):([^\]]+)\]\]/g,
                replacement: '[$1]($2)'
            },
            
            // 画像: #image(url) → ![](url)
            {
                pattern: /#image\(([^)]+)\)/g,
                replacement: '![]($1)'
            },
            
            // 引用ブロック: {quote}内容{/quote} → > 内容
            {
                pattern: /\{quote\}\n?([\s\S]*?)\{\/quote\}/g,
                replacement: (match: string, content: string) => {
                    const lines = content.trim().split('\n');
                    return lines.map(line => '> ' + line).join('\n');
                }
            },
            
            // 目次: #contents → [TOC]
            {
                pattern: /#contents/g,
                replacement: '[TOC]'
            },
            
            // 色指定の逆変換: &color(色) { テキスト } → **テキスト**
            {
                pattern: /&color\((red|green|blue)\)\s*\{\s*([^}]+?)\s*\}/g,
                replacement: (match: string, color: string, text: string) => {
                    return '**' + text.trim() + '**';
                }
            }
        ];

        // 変換ルールを適用
        conversionRules.forEach(rule => {
            if (typeof rule.replacement === 'string') {
                convertedContent = convertedContent.replace(rule.pattern, rule.replacement);
            } else {
                convertedContent = convertedContent.replace(rule.pattern, rule.replacement);
            }
        });

        return convertedContent;
    }
}
