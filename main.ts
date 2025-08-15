import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu } from 'obsidian';

interface BacklogConverterSettings {
    baseUrl: string;
    projectKey: string;
    enableAutoConversion: boolean;
    customRules: { pattern: string; replacement: string; }[];
    useTabsForIndent: boolean;  // タブインデントを使用するか
}

const DEFAULT_SETTINGS: BacklogConverterSettings = {
    baseUrl: '',
    projectKey: '',
    enableAutoConversion: false,
    customRules: [],
    useTabsForIndent: true  // デフォルトでタブを使用
}

export default class BacklogConverterPlugin extends Plugin {
    settings: BacklogConverterSettings;

    async onload() {
        await this.loadSettings();

        // リボンアイコン（サイドバーのボタン）を追加
        this.addRibbonIcon('bold', 'Backlog変換', (evt: MouseEvent) => {
            this.showConversionMenu(evt);
        });

        // ステータスバーにボタンを追加
        const statusBarItem = this.addStatusBarItem();
        statusBarItem.setText('Backlog変換');
        statusBarItem.addClass('plugin-backlog-converter');
        statusBarItem.onclick = () => {
            this.showQuickConversion();
        };

        // MarkdownからBacklog記法への変換コマンド
        this.addCommand({
            id: 'convert-to-backlog',
            name: 'Markdown → Backlog記法に変換',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.convertToBacklogFormat(editor);
            }
        });

        // Backlog記法からMarkdownへの変換コマンド
        this.addCommand({
            id: 'convert-from-backlog',
            name: 'Backlog記法から標準Markdownに変換',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.convertFromBacklogFormat(editor);
            }
        });

        // プレビューモードでの変換確認
        this.addCommand({
            id: 'preview-backlog-conversion',
            name: 'Backlog変換のプレビュー',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.previewConversion(editor);
            }
        });

        // 設定タブを追加
        this.addSettingTab(new BacklogConverterSettingTab(this.app, this));
    }

    onunload() {
        // クリーンアップ処理
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    convertToBacklogFormat(editor: Editor) {
        const content = editor.getValue();
        const convertedContent = this.applyBacklogConversion(content);
        
        editor.setValue(convertedContent);
        new Notice('Backlog記法への変換が完了しました');
    }

    convertFromBacklogFormat(editor: Editor) {
        const content = editor.getValue();
        const convertedContent = this.applyMarkdownConversion(content);
        
        editor.setValue(convertedContent);
        new Notice('標準Markdownへの変換が完了しました');
    }

    previewConversion(editor: Editor) {
        const content = editor.getValue();
        const convertedContent = this.applyBacklogConversion(content);
        
        new ConversionPreviewModal(this.app, content, convertedContent).open();
    }

    /**
     * リボンアイコンクリック時のメニュー表示
     */
    showConversionMenu(evt: MouseEvent) {
        const menu = new Menu();
        
        menu.addItem((item) =>
            item
                .setTitle('Markdown → Backlog記法に変換')
                .setIcon('arrow-right')
                .onClick(() => {
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView) {
                        this.convertToBacklogFormat(activeView.editor);
                    } else {
                        new Notice('アクティブなMarkdownファイルがありません');
                    }
                })
        );

        menu.addItem((item) =>
            item
                .setTitle('Backlog記法 → Markdownに変換')
                .setIcon('arrow-left')
                .onClick(() => {
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView) {
                        this.convertFromBacklogFormat(activeView.editor);
                    } else {
                        new Notice('アクティブなMarkdownファイルがありません');
                    }
                })
        );

        menu.addSeparator();

        menu.addItem((item) =>
            item
                .setTitle('変換プレビュー')
                .setIcon('eye')
                .onClick(() => {
                    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (activeView) {
                        this.previewConversion(activeView.editor);
                    } else {
                        new Notice('アクティブなMarkdownファイルがありません');
                    }
                })
        );

        menu.addItem((item) =>
            item
                .setTitle('設定を開く')
                .setIcon('settings')
                .onClick(() => {
                    // @ts-ignore
                    this.app.setting.open();
                    // @ts-ignore
                    this.app.setting.openTabById(this.manifest.id);
                })
        );

        menu.showAtMouseEvent(evt);
    }

    /**
     * ステータスバーボタンクリック時のクイック変換
     */
    showQuickConversion() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('アクティブなMarkdownファイルがありません');
            return;
        }

        // クイック変換のモーダルを表示
        new QuickConversionModal(this.app, this, activeView.editor).open();
    }

    applyBacklogConversion(content: string): string {
        let convertedContent = content;

        // 正しいBacklog記法への変換ルール（適用順序が重要）
        const conversionRules = [
            // 最初に見出しを処理（他のルールと競合を避けるため）
            {
                pattern: /^(#{1,6})\s+(.+)$/gm,
                replacement: (match: string, hashes: string, title: string) => {
                    const level = hashes.length;
                    return '*'.repeat(level) + ' ' + title;
                }
            },
            
            // 太字を先に処理（見出しの*記号と競合を避けるため）
            {
                pattern: /(?<!^[\*\s]*)\*\*([^*]+)\*\*/gm,
                replacement: "''$1''"
            },
            
            // 斜体は太字処理後に実行（見出しの*記号と競合を回避）
            {
                pattern: /(?<!^[\*\s]*)\*([^*]+)\*(?!\*)/gm,
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
            
            // 引用: > → >（そのまま）
            
            // インラインコード: `code` → Backlogでは特殊対応なし（そのまま？）
            
            // コードブロック: ```code``` → {code}code{/code}
            {
                pattern: /```([a-zA-Z]*)\n([\s\S]*?)```/g,
                replacement: '{code}\n$2{/code}'
            },
            
            // URL: [text](url) → [[text>url]] または [[text:url]]
            {
                pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
                replacement: '[[$1>$2]]'
            },
            
            // 課題参照: #123 → BLG-123 (プロジェクトキー設定時)
            {
                pattern: /#(\d+)/g,
                replacement: this.settings.projectKey ? `${this.settings.projectKey}-$1` : '#$1'
            },
            
            // Wikiページ: [[WikiPageName]] → そのまま
            
            // テーブル: Markdown形式 → Backlog形式
            {
                pattern: /^\|(.+)\|$/gm,
                replacement: (match: string, content: string) => {
                    // ヘッダー区切り行は削除
                    if (content.match(/^[\s\-\|:]+$/)) {
                        return '';
                    }
                    return '|' + content + '|';
                }
            },
            
            // 画像: ![alt](url) → #image(url)
            {
                pattern: /!\[([^\]]*)\]\(([^)]+)\)/g,
                replacement: '#image($2)'
            },
            
            // Backlog独自機能
            // 色指定（特定の重要語句）
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
            
            // 引用ブロック: > 複数行 → {quote}内容{/quote}
            {
                pattern: /^>\s*(.+)(?:\n^>\s*(.+))*/gm,
                replacement: (match: string) => {
                    const lines = match.split('\n').map(line => line.replace(/^>\s*/, '')).join('\n');
                    return `{quote}\n${lines}\n{/quote}`;
                }
            },
            
            // リビジョンリンク
            {
                pattern: /#rev\((\d+)\)/g,
                replacement: '#rev($1)'
            },
            
            {
                pattern: /#rev\(([^:]+):([^)]+)\)/g,
                replacement: '#rev($1:$2)'
            },
            
            // 目次
            {
                pattern: /^\[TOC\]$/gm,
                replacement: '#contents'
            },
            
            // 改行処理（&br;は不要なので削除）
            // Backlogでは通常の改行がそのまま使用されるため、&br;変換は行わない
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

    applyMarkdownConversion(content: string): string {
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
            
            // 太字: ''text'' → **text**
            {
                pattern: /''([^']+)''/g,
                replacement: '**$1**'
            },
            
            // 斜体: '''text''' → *text*
            {
                pattern: /'''([^']+)'''/g,
                replacement: '*$1*'
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
                replacement: '```\n$1\n```'
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
            
            // 課題参照: BLG-123 → #123 (プロジェクトキーを削除)
            {
                pattern: new RegExp(`\\b${this.settings.projectKey || '[A-Z]+'}-(\\d+)\\b`, 'g'),
                replacement: '#$1'
            },
            
            // 画像: #image(url) → ![](url)
            {
                pattern: /#image\(([^)]+)\)/g,
                replacement: '![]($1)'
            },
            
            // 改行処理（&br;は使用しないため、この変換も削除）
            
            // Backlog独自機能の逆変換
            // 色指定: &color(色) { テキスト } → **テキスト**
            {
                pattern: /&color\([^)]+\)\s*\{\s*([^}]+)\s*\}/g,
                replacement: '**$1**'
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

class ConversionPreviewModal extends Modal {
    originalContent: string;
    convertedContent: string;

    constructor(app: App, originalContent: string, convertedContent: string) {
        super(app);
        this.originalContent = originalContent;
        this.convertedContent = convertedContent;
    }

    onOpen() {
        const { contentEl } = this;
        
        // ヘッダー部分
        const header = contentEl.createDiv({ cls: 'conversion-preview-header' });
        header.createEl('h2', { text: 'Backlog変換プレビュー' });
        
        const indicator = header.createSpan({ 
            cls: 'conversion-type-indicator markdown-to-backlog',
            text: 'MD → Backlog'
        });

        // 変換前後の内容を表示
        const container = contentEl.createDiv({ cls: 'conversion-preview-container' });
        
        const originalSection = container.createDiv({ cls: 'preview-section' });
        originalSection.createEl('h3', { text: '変換前（Markdown）' });
        const originalPre = originalSection.createEl('pre');
        originalPre.createEl('code', { text: this.originalContent });

        const convertedSection = container.createDiv({ cls: 'preview-section backlog-output' });
        convertedSection.createEl('h3', { text: '変換後（Backlog記法）' });
        
        // Backlog記法のリッチプレビューを生成
        const backlogPreview = convertedSection.createDiv({ cls: 'backlog-preview' });
        this.renderBacklogPreview(backlogPreview, this.convertedContent);
        
        // 生テキストも表示（コピー用）
        const detailsEl = convertedSection.createEl('details');
        detailsEl.createEl('summary', { text: '生テキストを表示' });
        const convertedPre = detailsEl.createEl('pre');
        convertedPre.createEl('code', { text: this.convertedContent });

        // ボタンエリア
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        const applyButton = buttonContainer.createEl('button', { 
            text: '変換を適用',
            cls: 'mod-cta'
        });
        applyButton.onclick = () => {
            // アクティブなエディタに変換内容を適用
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                activeView.editor.setValue(this.convertedContent);
                new Notice('変換が適用されました');
            }
            this.close();
        };

        const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
        cancelButton.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Backlog記法をリッチプレビューでレンダリング
     */
    renderBacklogPreview(container: HTMLElement, content: string) {
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.trim() === '') {
                container.createEl('br');
                continue;
            }

            // 見出し処理
            const headingMatch = line.match(/^(\*{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = Math.min(headingMatch[1].length, 6);
                const text = headingMatch[2];
                const headingTag = `h${level}` as keyof HTMLElementTagNameMap;
                const heading = container.createEl(headingTag, { 
                    text: text,
                    cls: 'backlog-heading'
                });
                continue;
            }

            // リスト処理（階層レベル対応）
            const listMatch = line.match(/^(-{1,6})\s+(.+)$/);
            if (listMatch) {
                const dashes = listMatch[1];
                const content = listMatch[2];
                const level = dashes.length;
                
                const listItem = container.createDiv({ 
                    cls: `backlog-list-item backlog-list-level-${level}`
                });
                listItem.textContent = content;
                continue;
            }

            // 数字付きリスト
            const numberedListMatch = line.match(/^(\s*)\+\s+(.+)$/);
            if (numberedListMatch) {
                const indent = numberedListMatch[1];
                const content = numberedListMatch[2];
                const level = Math.floor(indent.length / 2) + 1;
                
                const listItem = container.createDiv({ 
                    cls: `backlog-list-item backlog-list-level-${level}`
                });
                listItem.textContent = `+ ${content}`;
                continue;
            }

            // その他のテキスト
            const textEl = container.createDiv();
            textEl.innerHTML = this.formatBacklogText(line);
        }
    }

    /**
     * Backlog記法のテキスト装飾を適用
     */
    formatBacklogText(text: string): string {
        let formatted = text;
        
        // 太字: ''text'' → <span class="backlog-bold">text</span>
        formatted = formatted.replace(/''([^']+)''/g, '<span class="backlog-bold">$1</span>');
        
        // 斜体: '''text''' → <span class="backlog-italic">text</span>
        formatted = formatted.replace(/'''([^']+)'''/g, '<span class="backlog-italic">$1</span>');
        
        // 打ち消し線: %%text%% → <span class="backlog-strike">text</span>
        formatted = formatted.replace(/%%([^%]+)%%/g, '<span class="backlog-strike">$1</span>');
        
        // 色指定: &color(red) { text } → <span class="backlog-color-red">text</span>
        formatted = formatted.replace(/&color\((red|green|blue)\)\s*\{\s*([^}]+)\s*\}/g, 
            '<span class="backlog-color-$1">$2</span>');
        
        // リンク: [[text>url]] → <span class="backlog-link">text</span>
        formatted = formatted.replace(/\[\[([^>]+)>([^\]]+)\]\]/g, 
            '<span class="backlog-link">$1</span>');
        
        // 画像: #image(url) → <span class="backlog-image">画像</span>
        formatted = formatted.replace(/#image\([^)]+\)/g, 
            '<span class="backlog-image">📷 画像</span>');
        
        // タスク参照: PROJ-123 → <span class="backlog-task-ref">PROJ-123</span>
        formatted = formatted.replace(/([A-Z]+)-(\d+)/g, 
            '<span class="backlog-task-ref">$1-$2</span>');
        
        return formatted;
    }
}

class QuickConversionModal extends Modal {
    plugin: BacklogConverterPlugin;
    editor: Editor;

    constructor(app: App, plugin: BacklogConverterPlugin, editor: Editor) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
    }

    onOpen() {
        const { contentEl } = this;
        
        // ヘッダー部分
        const header = contentEl.createDiv({ cls: 'quick-conversion-header' });
        header.createEl('h2', { text: 'クイック変換' });
        header.createEl('p', { text: '変換方向を選択してください' });

        // ボタンコンテナ
        const buttonContainer = contentEl.createDiv({ cls: 'quick-conversion-buttons' });

        // Markdown → Backlog変換ボタン
        const toBacklogButton = buttonContainer.createEl('button', { 
            text: 'Markdown → Backlog記法',
            cls: 'mod-cta quick-conversion-btn'
        });
        toBacklogButton.onclick = () => {
            this.plugin.convertToBacklogFormat(this.editor);
            this.close();
        };

        // Backlog → Markdown変換ボタン
        const toMarkdownButton = buttonContainer.createEl('button', { 
            text: 'Backlog記法 → Markdown',
            cls: 'quick-conversion-btn'
        });
        toMarkdownButton.onclick = () => {
            this.plugin.convertFromBacklogFormat(this.editor);
            this.close();
        };

        // プレビューボタン
        const previewButton = buttonContainer.createEl('button', { 
            text: '変換プレビュー',
            cls: 'quick-conversion-btn'
        });
        previewButton.onclick = () => {
            this.plugin.previewConversion(this.editor);
            this.close();
        };

        // キャンセルボタン
        const cancelButton = buttonContainer.createEl('button', { 
            text: 'キャンセル',
            cls: 'quick-conversion-btn'
        });
        cancelButton.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class BacklogConverterSettingTab extends PluginSettingTab {
    plugin: BacklogConverterPlugin;

    constructor(app: App, plugin: BacklogConverterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Backlog Converter 設定' });

        // 基本設定
        containerEl.createEl('h3', { text: '基本設定' });

        new Setting(containerEl)
            .setName('Backlog Base URL')
            .setDesc('BacklogのベースURL（例：https://yourproject.backlog.jp）')
            .addText(text => text
                .setPlaceholder('https://yourproject.backlog.jp')
                .setValue(this.plugin.settings.baseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.baseUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Project Key')
            .setDesc('プロジェクトキー（例：MYPRJ）')
            .addText(text => text
                .setPlaceholder('MYPRJ')
                .setValue(this.plugin.settings.projectKey)
                .onChange(async (value) => {
                    this.plugin.settings.projectKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('自動変換を有効にする')
            .setDesc('ファイル保存時に自動的にBacklog記法に変換する（実験的機能）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoConversion)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoConversion = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('タブインデントを使用')
            .setDesc('リストの階層表現にタブインデントを使用します（オフの場合は2スペース）')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useTabsForIndent)
                .onChange(async (value) => {
                    this.plugin.settings.useTabsForIndent = value;
                    await this.plugin.saveSettings();
                }));

        // カスタムルール設定
        containerEl.createEl('h3', { text: 'カスタム変換ルール' });
        
        const rulesContainer = containerEl.createDiv();
        this.displayCustomRules(rulesContainer);

        new Setting(containerEl)
            .setName('新しいルールを追加')
            .setDesc('正規表現パターンと置換文字列でカスタムルールを追加')
            .addButton(button => button
                .setButtonText('ルール追加')
                .onClick(() => {
                    this.plugin.settings.customRules.push({ pattern: '', replacement: '' });
                    this.plugin.saveSettings();
                    this.display(); // 再描画
                }));
    }

    displayCustomRules(container: HTMLElement) {
        container.empty();

        this.plugin.settings.customRules.forEach((rule, index) => {
            const ruleContainer = container.createDiv({ cls: 'custom-rule-container' });
            
            new Setting(ruleContainer)
                .setName(`ルール ${index + 1}`)
                .addText(text => text
                    .setPlaceholder('正規表現パターン（例：\\*\\*(.+?)\\*\\*）')
                    .setValue(rule.pattern)
                    .onChange(async (value) => {
                        this.plugin.settings.customRules[index].pattern = value;
                        await this.plugin.saveSettings();
                    }))
                .addText(text => text
                    .setPlaceholder('置換文字列（例：--{color:red}$1--）')
                    .setValue(rule.replacement)
                    .onChange(async (value) => {
                        this.plugin.settings.customRules[index].replacement = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setButtonText('削除')
                    .onClick(async () => {
                        this.plugin.settings.customRules.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display(); // 再描画
                    }));
        });
    }
}
