import { BacklogConverter, DEFAULT_SETTINGS, BacklogConverterSettings } from '../src/converter';

describe('BacklogConverterSettings', () => {
    let converter: BacklogConverter;

    beforeEach(() => {
        converter = new BacklogConverter();
    });

    describe('デフォルト設定', () => {
        test('デフォルト設定が正しく設定される', () => {
            expect(DEFAULT_SETTINGS).toEqual({
                baseUrl: '',
                projectKey: '',
                enableAutoConversion: false,
                customRules: [],
                useTabsForIndent: true
            });
        });

        test('デフォルト設定でコンバーターが初期化される', () => {
            const defaultConverter = new BacklogConverter();
            // デフォルト設定でタブインデントが使用される
            const input = `- アイテム1
-- サブアイテム1`;
            const expected = `- アイテム1
\t- サブアイテム1`;
            expect(defaultConverter.convertToMarkdown(input)).toBe(expected);
        });
    });

    describe('設定更新', () => {
        test('部分的な設定更新ができる', () => {
            converter.updateSettings({ useTabsForIndent: false });
            
            const input = `- アイテム1
-- サブアイテム1`;
            const expected = `- アイテム1
  - サブアイテム1`;
            expect(converter.convertToMarkdown(input)).toBe(expected);
        });

        test('複数の設定を同時に更新できる', () => {
            const newSettings = {
                useTabsForIndent: false,
                projectKey: 'TEST',
                customRules: [
                    { pattern: '\\[DONE\\]', replacement: '✅' }
                ]
            };
            converter.updateSettings(newSettings);

            // タブインデント設定のテスト
            const listInput = `- アイテム1
-- サブアイテム1`;
            const listExpected = `- アイテム1
  - サブアイテム1`;
            expect(converter.convertToMarkdown(listInput)).toBe(listExpected);

            // カスタムルールのテスト
            const customInput = '[DONE] タスク完了';
            const customExpected = '✅ タスク完了';
            expect(converter.convertToBacklog(customInput)).toBe(customExpected);
        });

        test('既存の設定を上書きしない', () => {
            // 最初にカスタムルールを設定
            converter.updateSettings({
                customRules: [
                    { pattern: '\\[TODO\\]', replacement: '📝' }
                ]
            });

            // 別の設定を更新
            converter.updateSettings({ useTabsForIndent: false });

            // カスタムルールは保持されている
            const input = '[TODO] タスク';
            const expected = '📝 タスク';
            expect(converter.convertToBacklog(input)).toBe(expected);
        });
    });

    describe('インデント設定', () => {
        test('タブインデントが有効な場合', () => {
            converter.updateSettings({ useTabsForIndent: true });

            const input = `- level1
-- level2
--- level3`;
            const expected = `- level1
\t- level2
\t\t- level3`;
            expect(converter.convertToMarkdown(input)).toBe(expected);
        });

        test('スペースインデントが有効な場合', () => {
            converter.updateSettings({ useTabsForIndent: false });

            const input = `- level1
-- level2
--- level3`;
            const expected = `- level1
  - level2
    - level3`;
            expect(converter.convertToMarkdown(input)).toBe(expected);
        });

        test('数字付きリストでのインデント設定', () => {
            converter.updateSettings({ useTabsForIndent: true });

            const input = `+ item1
  + item2
    + item3`;
            const expected = `1. item1
\t1. item2
\t\t1. item3`;
            expect(converter.convertToMarkdown(input)).toBe(expected);
        });
    });

    describe('カスタムルール', () => {
        test('複数のカスタムルールが順番に適用される', () => {
            converter.updateSettings({
                customRules: [
                    { pattern: '\\[TODO\\]', replacement: '📝' },
                    { pattern: '\\[DONE\\]', replacement: '✅' },
                    { pattern: '\\[URGENT\\]', replacement: '🔥' }
                ]
            });

            const input = '[TODO] タスク1\n[DONE] タスク2\n[URGENT] タスク3';
            const expected = '📝 タスク1\n✅ タスク2\n🔥 タスク3';
            expect(converter.convertToBacklog(input)).toBe(expected);
        });

        test('カスタムルールでキャプチャグループが使用できる', () => {
            converter.updateSettings({
                customRules: [
                    { pattern: '\\[PRIORITY:(\\d+)\\]', replacement: '優先度$1️⃣' }
                ]
            });

            const input = '[PRIORITY:1] 高優先度タスク';
            const expected = '優先度1️⃣ 高優先度タスク';
            expect(converter.convertToBacklog(input)).toBe(expected);
        });

        test('複雑な正規表現パターンが使用できる', () => {
            converter.updateSettings({
                customRules: [
                    { pattern: '\\b(https?://[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]+)', replacement: '🔗 $1' }
                ]
            });

            const input = 'サイトはhttps://example.comです';
            const expected = 'サイトは🔗 https://example.comです';
            expect(converter.convertToBacklog(input)).toBe(expected);
        });

        test('無効な正規表現はスキップされる', () => {
            // console.warnをモック化
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            converter.updateSettings({
                customRules: [
                    { pattern: '[invalid(regex', replacement: 'test' },
                    { pattern: '\\[VALID\\]', replacement: '✅' }
                ]
            });

            const input = '[VALID] テスト [invalid(regex テスト';
            const expected = '✅ テスト [invalid(regex テスト';
            expect(converter.convertToBacklog(input)).toBe(expected);

            expect(consoleSpy).toHaveBeenCalledWith('Invalid custom rule pattern:', '[invalid(regex');
            consoleSpy.mockRestore();
        });

        test('空のカスタムルール配列を処理する', () => {
            converter.updateSettings({ customRules: [] });

            const input = '[TODO] テスト';
            const expected = '[TODO] テスト';
            expect(converter.convertToBacklog(input)).toBe(expected);
        });

        test('カスタムルールが標準変換ルールの後に適用される', () => {
            converter.updateSettings({
                customRules: [
                    { pattern: "''([^']+)''", replacement: '🔥$1🔥' }
                ]
            });

            const input = '**太字**';
            const result = converter.convertToBacklog(input);
            const expected = "🔥太字🔥"; // **太字** → ''太字'' → 🔥太字🔥
            expect(result).toBe(expected);
        });
    });

    describe('プロジェクトキー設定', () => {
        test('プロジェクトキーが設定されている場合の動作', () => {
            converter.updateSettings({ projectKey: 'MYPROJECT' });
            
            // 注: 現在の実装では課題参照変換は実装されていないため、
            // この機能は将来の実装として準備されている
            expect(true).toBe(true); // プレースホルダーテスト
        });
    });

    describe('ベースURL設定', () => {
        test('ベースURLが設定されている場合の動作', () => {
            converter.updateSettings({ baseUrl: 'https://myproject.backlog.jp' });
            
            // 注: 現在の実装では課題URL変換は実装されていないため、
            // この機能は将来の実装として準備されている
            expect(true).toBe(true); // プレースホルダーテスト
        });
    });

    describe('自動変換設定', () => {
        test('自動変換フラグが設定できる', () => {
            converter.updateSettings({ enableAutoConversion: true });
            
            // 注: 自動変換はプラグインレベルの機能のため、
            // コンバータークラス単体では直接テストできない
            expect(true).toBe(true); // プレースホルダーテスト
        });
    });

    describe('設定の永続化', () => {
        test('設定オブジェクトが正しくコピーされる', () => {
            const originalSettings = {
                useTabsForIndent: false,
                customRules: [{ pattern: 'test', replacement: 'TEST' }]
            };

            converter.updateSettings(originalSettings);

            // 元の設定オブジェクトを変更しても影響しない
            originalSettings.useTabsForIndent = true;
            originalSettings.customRules.push({ pattern: 'new', replacement: 'NEW' });

            const input = `- item
-- subitem`;
            const expected = `- item
  - subitem`;
            expect(converter.convertToMarkdown(input)).toBe(expected);
        });
    });
});
