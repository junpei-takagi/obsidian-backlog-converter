import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Menu } from 'obsidian';
import { BacklogConverter, BacklogConverterSettings, DEFAULT_SETTINGS } from './src/converter';

export default class BacklogConverterPlugin extends Plugin {
    settings: BacklogConverterSettings;
    private converter: BacklogConverter;

    async onload() {
        await this.loadSettings();
        this.converter = new BacklogConverter();

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
        this.converter.updateSettings(this.settings);
        const convertedContent = this.converter.convertToBacklog(content);
        
        editor.setValue(convertedContent);
        new Notice('Backlog記法への変換が完了しました');
    }

    convertFromBacklogFormat(editor: Editor) {
        const content = editor.getValue();
        this.converter.updateSettings(this.settings);
        const convertedContent = this.converter.convertToMarkdown(content);
        
        editor.setValue(convertedContent);
        new Notice('標準Markdownへの変換が完了しました');
    }

    previewConversion(editor: Editor) {
        const content = editor.getValue();
        this.converter.updateSettings(this.settings);
        const convertedContent = this.converter.convertToBacklog(content);
        
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
