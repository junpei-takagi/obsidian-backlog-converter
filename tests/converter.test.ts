import { BacklogConverter, DEFAULT_SETTINGS, BacklogConverterSettings } from '../src/converter';

describe('BacklogConverter', () => {
    let converter: BacklogConverter;

    beforeEach(() => {
        converter = new BacklogConverter();
    });

    describe('convertToBacklog', () => {
        describe('見出し変換', () => {
            test('H1見出しを変換する', () => {
                const input = '# 見出し1';
                const expected = '* 見出し1';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('H2見出しを変換する', () => {
                const input = '## 見出し2';
                const expected = '** 見出し2';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('H6見出しまで変換する', () => {
                const input = '###### 見出し6';
                const expected = '****** 見出し6';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('複数の見出しを変換する', () => {
                const input = `# 見出し1
## 見出し2
### 見出し3`;
                const result = converter.convertToBacklog(input);
                // 各行を個別にチェック
                const lines = result.split('\n');
                expect(lines[0]).toBe('* 見出し1');
                expect(lines[1]).toBe('** 見出し2');
                expect(lines[2]).toBe('*** 見出し3');
            });
        });

        describe('テキスト装飾変換', () => {
            test('太字を変換する', () => {
                const input = '**太字テキスト**';
                const expected = "''太字テキスト''";
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('斜体を変換する', () => {
                const input = '*斜体テキスト*';
                const expected = "'''斜体テキスト'''";
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('打ち消し線を変換する', () => {
                const input = '~~打ち消しテキスト~~';
                const expected = '%%打ち消しテキスト%%';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('複数のテキスト装飾を変換する', () => {
                const input = '**太字** と *斜体* と ~~打ち消し~~';
                const expected = "''太字'' と '''斜体''' と %%打ち消し%%";
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('リスト変換', () => {
            test('シンプルな箇条書きリストを変換する', () => {
                const input = `- アイテム1
- アイテム2
- アイテム3`;
                const expected = `- アイテム1
- アイテム2
- アイテム3`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('インデント付き箇条書きリストを変換する', () => {
                const input = `- アイテム1
  - サブアイテム1
    - サブサブアイテム1
- アイテム2`;
                const expected = `- アイテム1
-- サブアイテム1
--- サブサブアイテム1
- アイテム2`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('タブインデント付きリストを変換する', () => {
                const input = `- アイテム1
\t- サブアイテム1
\t\t- サブサブアイテム1`;
                const expected = `- アイテム1
-- サブアイテム1
--- サブサブアイテム1`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('数字付きリストを変換する', () => {
                const input = `1. アイテム1
2. アイテム2
3. アイテム3`;
                const expected = `+ アイテム1
+ アイテム2
+ アイテム3`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('インデント付き数字付きリストを変換する', () => {
                const input = `1. アイテム1
  1. サブアイテム1
    1. サブサブアイテム1`;
                const expected = `+ アイテム1
  + サブアイテム1
    + サブサブアイテム1`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('リンクと画像変換', () => {
            test('リンクを変換する', () => {
                const input = '[テストリンク](https://example.com)';
                const expected = '[[テストリンク>https://example.com]]';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('画像を変換する', () => {
                const input = '![代替テキスト](https://example.com/image.png)';
                const expected = '#image(https://example.com/image.png)';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('代替テキストなしの画像を変換する', () => {
                const input = '![](https://example.com/image.png)';
                const expected = '#image(https://example.com/image.png)';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('コードブロック変換', () => {
            test('言語指定なしのコードブロックを変換する', () => {
                const input = '```\nconsole.log("Hello");\n```';
                const expected = '{code}\nconsole.log("Hello");\n{/code}';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('言語指定ありのコードブロックを変換する', () => {
                const input = '```javascript\nconsole.log("Hello");\n```';
                const expected = '{code}\nconsole.log("Hello");\n{/code}';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('複数行のコードブロックを変換する', () => {
                const input = `\`\`\`
function test() {
  return "hello";
}
\`\`\``;
                const expected = `{code}
function test() {
  return "hello";
}
{/code}`;
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('引用ブロック変換', () => {
            test('単行の引用を変換する', () => {
                const input = '> これは引用です';
                const expected = '{quote}\nこれは引用です\n{/quote}';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('複数行の引用を変換する', () => {
                const input = `> 引用行1
> 引用行2
> 引用行3`;
                const expected = '{quote}\n引用行1\n引用行2\n引用行3\n{/quote}';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('目次変換', () => {
            test('目次を変換する', () => {
                const input = '[TOC]';
                const expected = '#contents';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('色指定変換', () => {
            test('重要語句（赤色）を変換する', () => {
                const inputs = ['**重要**', '**注意**', '**警告**', '**エラー**', '**危険**'];
                const expected = ['&color(red) { 重要 }', '&color(red) { 注意 }', '&color(red) { 警告 }', '&color(red) { エラー }', '&color(red) { 危険 }'];
                
                inputs.forEach((input, index) => {
                    expect(converter.convertToBacklog(input)).toBe(expected[index]);
                });
            });

            test('成功語句（緑色）を変換する', () => {
                const inputs = ['**成功**', '**完了**', '**OK**'];
                const expected = ['&color(green) { 成功 }', '&color(green) { 完了 }', '&color(green) { OK }'];
                
                inputs.forEach((input, index) => {
                    expect(converter.convertToBacklog(input)).toBe(expected[index]);
                });
            });

            test('情報語句（青色）を変換する', () => {
                const inputs = ['**情報**', '**参考**', '**メモ**'];
                const expected = ['&color(blue) { 情報 }', '&color(blue) { 参考 }', '&color(blue) { メモ }'];
                
                inputs.forEach((input, index) => {
                    expect(converter.convertToBacklog(input)).toBe(expected[index]);
                });
            });

            test('色指定語句と通常の太字を区別する', () => {
                const input = '**重要** な **太字テキスト** です';
                const expected = "&color(red) { 重要 } な ''太字テキスト'' です";
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('複数の色指定語句を変換する', () => {
                const input = '**重要**: **成功** しました。**情報** を確認してください。';
                const expected = '&color(red) { 重要 }: &color(green) { 成功 } しました。&color(blue) { 情報 } を確認してください。';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });

        describe('カスタムルール', () => {
            test('カスタムルールが適用される', () => {
                const settings: BacklogConverterSettings = {
                    ...DEFAULT_SETTINGS,
                    customRules: [
                        { pattern: '\\[TODO\\]', replacement: '🔥 TODO' }
                    ]
                };
                converter.updateSettings(settings);

                const input = '[TODO] タスクを完了する';
                const expected = '🔥 TODO タスクを完了する';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });

            test('無効な正規表現パターンを無視する', () => {
                const settings: BacklogConverterSettings = {
                    ...DEFAULT_SETTINGS,
                    customRules: [
                        { pattern: '[invalid(', replacement: 'test' }
                    ]
                };
                converter.updateSettings(settings);

                const input = 'テストテキスト';
                const expected = 'テストテキスト';
                expect(converter.convertToBacklog(input)).toBe(expected);
            });
        });
    });

    describe('convertToMarkdown', () => {
        describe('見出し変換', () => {
            test('Backlog見出しをMarkdownに変換する', () => {
                const input = '* 見出し1';
                const expected = '# 見出し1';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('複数レベルの見出しを変換する', () => {
                const input = `* 見出し1
** 見出し2
*** 見出し3`;
                const expected = `# 見出し1
## 見出し2
### 見出し3`;
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('テキスト装飾変換', () => {
            test('Backlog太字をMarkdownに変換する', () => {
                const input = "''太字テキスト''";
                const expected = '**太字テキスト**';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlog斜体をMarkdownに変換する', () => {
                const input = "'''斜体テキスト'''";
                const expected = '*斜体テキスト*';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlog打ち消し線をMarkdownに変換する', () => {
                const input = '%%打ち消しテキスト%%';
                const expected = '~~打ち消しテキスト~~';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('リスト変換', () => {
            test('Backlogリストをタブインデント付きMarkdownに変換する', () => {
                const settings: BacklogConverterSettings = {
                    ...DEFAULT_SETTINGS,
                    useTabsForIndent: true
                };
                converter.updateSettings(settings);

                const input = `- アイテム1
-- サブアイテム1
--- サブサブアイテム1`;
                const expected = `- アイテム1
\t- サブアイテム1
\t\t- サブサブアイテム1`;
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlogリストをスペースインデント付きMarkdownに変換する', () => {
                const settings: BacklogConverterSettings = {
                    ...DEFAULT_SETTINGS,
                    useTabsForIndent: false
                };
                converter.updateSettings(settings);

                const input = `- アイテム1
-- サブアイテム1
--- サブサブアイテム1`;
                const expected = `- アイテム1
  - サブアイテム1
    - サブサブアイテム1`;
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlog数字付きリストをMarkdownに変換する', () => {
                const input = `+ アイテム1
+ アイテム2`;
                const expected = `1. アイテム1
1. アイテム2`;
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('リンクと画像変換', () => {
            test('BacklogリンクをMarkdownに変換する', () => {
                const input = '[[テストリンク>https://example.com]]';
                const expected = '[テストリンク](https://example.com)';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlogリンク（コロン記法）をMarkdownに変換する', () => {
                const input = '[[テストリンク:https://example.com]]';
                const expected = '[テストリンク](https://example.com)';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('Backlog画像をMarkdownに変換する', () => {
                const input = '#image(https://example.com/image.png)';
                const expected = '![](https://example.com/image.png)';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('コードブロック変換', () => {
            test('BacklogコードブロックをMarkdownに変換する', () => {
                const input = '{code}\nconsole.log("Hello");\n{/code}';
                const expected = '```\nconsole.log("Hello");\n```';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('引用ブロック変換', () => {
            test('Backlog引用をMarkdownに変換する', () => {
                const input = '{quote}\nこれは引用です\n{/quote}';
                const expected = '> これは引用です';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('複数行のBacklog引用をMarkdownに変換する', () => {
                const input = '{quote}\n引用行1\n引用行2\n{/quote}';
                const expected = '> 引用行1\n> 引用行2';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('目次変換', () => {
            test('Backlog目次をMarkdownに変換する', () => {
                const input = '#contents';
                const expected = '[TOC]';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });
        });

        describe('色指定逆変換', () => {
            test('赤色指定をMarkdownに変換する', () => {
                const input = '&color(red) { 重要 }';
                const expected = '**重要**';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('緑色指定をMarkdownに変換する', () => {
                const input = '&color(green) { 成功 }';
                const expected = '**成功**';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('青色指定をMarkdownに変換する', () => {
                const input = '&color(blue) { 情報 }';
                const expected = '**情報**';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('複数の色指定をMarkdownに変換する', () => {
                const input = '&color(red) { 重要 }: &color(green) { 成功 } しました。&color(blue) { 情報 } を確認してください。';
                const expected = '**重要**: **成功** しました。**情報** を確認してください。';
                expect(converter.convertToMarkdown(input)).toBe(expected);
            });

            test('スペース有無に関わらず変換する', () => {
                const inputs = [
                    '&color(red) { 重要 }',
                    '&color(red) {重要}',
                    '&color(red) {  重要  }'
                ];
                const expected = '**重要**';
                
                inputs.forEach(input => {
                    expect(converter.convertToMarkdown(input)).toBe(expected);
                });
            });
        });
    });

    describe('往復変換テスト', () => {
        test('Markdown → Backlog → Markdownで元に戻る（見出し）', () => {
            const original = '# 見出し1\n## 見出し2';
            const backlog = converter.convertToBacklog(original);
            const result = converter.convertToMarkdown(backlog);
            expect(result).toBe(original);
        });

        test('Markdown → Backlog → Markdownで元に戻る（テキスト装飾）', () => {
            const original = '**太字** と *斜体* と ~~打ち消し~~';
            const backlog = converter.convertToBacklog(original);
            const result = converter.convertToMarkdown(backlog);
            expect(result).toBe(original);
        });

        test('Markdown → Backlog → Markdownで元に戻る（リンク）', () => {
            const original = '[リンク](https://example.com)';
            const backlog = converter.convertToBacklog(original);
            const result = converter.convertToMarkdown(backlog);
            expect(result).toBe(original);
        });

        test('Markdown → Backlog → Markdownで元に戻る（色指定語句）', () => {
            const original = '**重要**: **成功** しました。**情報** を確認してください。';
            const backlog = converter.convertToBacklog(original);
            const result = converter.convertToMarkdown(backlog);
            expect(result).toBe(original);
        });
    });

    describe('エッジケース', () => {
        test('空文字列を処理する', () => {
            expect(converter.convertToBacklog('')).toBe('');
            expect(converter.convertToMarkdown('')).toBe('');
        });

        test('改行のみの文字列を処理する', () => {
            const input = '\n\n\n';
            expect(converter.convertToBacklog(input)).toBe(input);
            expect(converter.convertToMarkdown(input)).toBe(input);
        });

        test('特殊文字を含む文字列を処理する', () => {
            const input = '特殊文字: !@#$%^&*()_+-=[]{}|;:,.<>?';
            expect(converter.convertToBacklog(input)).toBe(input);
            expect(converter.convertToMarkdown(input)).toBe(input);
        });

        test('非常に長い文字列を処理する', () => {
            const longText = 'a'.repeat(10000);
            const input = `# ${longText}`;
            const expected = `* ${longText}`;
            expect(converter.convertToBacklog(input)).toBe(expected);
        });
    });
});
