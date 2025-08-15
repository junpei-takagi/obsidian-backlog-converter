# Backlog Markdown Converter for Obsidian

ObsidianでMarkdownファイルをBacklog記法に変換、またはBacklog記法から標準Markdownに変換するプラグインです。

## 機能

### 主要機能
- **MarkdownからBacklog記法への変換**: 標準MarkdownをBacklog独自の記法に変換
- **Backlog記法からMarkdownへの変換**: Backlog記法を標準Markdownに逆変換
- **プレビュー機能**: 変換前後の内容を確認してから適用
- **カスタムルール**: 独自の変換ルールを設定可能
- **リボンアイコン**: サイドバーから簡単にアクセス
- **ステータスバーボタン**: 下部ステータスバーからワンクリック変換
- **クイック変換モーダル**: 直感的な変換操作

### 変換対象

#### MarkdownからBacklog記法
| 変換前（Markdown） | 変換後（Backlog記法） | 説明 |
|---|---|---|
| `[BLG-123](https://example.backlog.jp/view/BLG-123)` | `#BLG-123` | 課題URLを課題参照に |
| `**重要**` | `--{color:red}重要--` | 重要語句を赤色テキストに |
| `**成功**` | `--{color:green}成功--` | 成功語句を緑色テキストに |
| `**情報**` | `--{color:blue}情報--` | 情報語句を青色テキストに |
| `` `keyword` `` | `&keyword&` | インラインコードをキーワード参照に |
| `MYPRJ` | `^MYPRJ^` | プロジェクトキーをプロジェクト参照に |

#### Backlog記法からMarkdown
| 変換前（Backlog記法） | 変換後（Markdown） | 説明 |
|---|---|---|
| `#BLG-123` | `[BLG-123](https://example.backlog.jp/view/BLG-123)` | 課題参照をMarkdownリンクに |
| `--{color:red}重要--` | `**重要**` | 色付きテキストを強調テキストに |
| `^MYPRJ^` | `MYPRJ` | プロジェクト参照を通常テキストに |
| `&keyword&` | `` `keyword` `` | キーワード参照をインラインコードに |

## インストール

### 手動インストール
1. 本リポジトリをクローンまたはダウンロード
2. プラグインファイルをObsidianのプラグインディレクトリにコピー
   ```
   .obsidian/plugins/backlog-converter/
   ├── main.js
   ├── manifest.json
   └── styles.css (オプション)
   ```
3. Obsidianを再起動
4. 設定 → コミュニティプラグイン → "Backlog Markdown Converter"を有効化

### 開発環境でのビルド
```bash
npm install
npm run dev
```

### リリース版のビルド
```bash
npm install
npm run release
```

このコマンドを実行すると：
- `release/obsidian-backlog-converter/` フォルダにプラグインファイルが作成される
- `release/obsidian-backlog-converter-{version}.zip` にZIPパッケージが作成される
- ZIPファイルを解凍して `.obsidian/plugins/` にコピーするだけでインストール完了

## 使用方法

### 1. 基本設定
1. 設定 → プラグインオプション → "Backlog Markdown Converter"
2. 以下の情報を設定：
   - **Backlog Base URL**: BacklogのベースURL（例：`https://yourproject.backlog.jp`）
   - **Project Key**: プロジェクトキー（例：`MYPRJ`）

### 2. 変換の実行

#### リボンアイコンから実行（推奨）
1. 左サイドバーの**B**アイコン（Backlog変換）をクリック
2. 表示されるメニューから変換方向を選択：
   - **Markdown → Backlog記法に変換**
   - **Backlog記法 → Markdownに変換**
   - **変換プレビュー**
   - **設定を開く**

#### ステータスバーから実行
1. 下部ステータスバーの「Backlog変換」ボタンをクリック
2. クイック変換モーダルで変換方向を選択

#### コマンドパレットから実行
1. `Ctrl+P`（Mac: `Cmd+P`）でコマンドパレットを開く
2. 以下のコマンドから選択：
   - `Markdown → Backlog記法に変換`: MarkdownからBacklog記法に変換
   - `Backlog記法から標準Markdownに変換`: 逆変換
   - `Backlog変換のプレビュー`: 変換前後の内容を確認

#### ショートカットキー
設定 → ホットキー で各コマンドにショートカットキーを割り当て可能

### 3. カスタムルールの設定
独自の変換ルールを追加できます：

1. プラグイン設定を開く
2. "カスタム変換ルール"セクション
3. "ルール追加"ボタンをクリック
4. 正規表現パターンと置換文字列を入力

**例**:
- パターン: `\\[TODO\\]`
- 置換: `--{color:orange}TODO--`

## 注意事項

### バックアップ
- 変換を実行する前に、重要なファイルのバックアップを取ることを強く推奨します
- Git等のバージョン管理システムの使用を推奨します

### 制限事項
- 複雑な表やネストした構造では正しく変換されない場合があります
- カスタムルールでは正規表現の知識が必要です
- 一部のBacklog独自機能（添付ファイル参照等）は対応していません

### パフォーマンス
- 大きなファイル（10MB以上）では変換に時間がかかる場合があります
- 多数のカスタムルールは変換速度に影響する可能性があります

## トラブルシューティング

### よくある問題

**Q: 変換後の内容が期待と異なる**
A: カスタムルールの正規表現パターンを確認してください。無効なパターンはコンソールに警告が表示されます。

**Q: プラグインが動作しない**
A: 以下を確認してください：
- Obsidianのバージョンが0.15.0以上
- プラグインが有効化されている
- コンソール（F12）にエラーメッセージがないか

**Q: 課題URLの変換が機能しない**
A: 設定でBacklog Base URLとProject Keyが正しく設定されているか確認してください。

## 開発

### 開発環境の構築
```bash
git clone <repository-url>
cd obsidian-backlog-converter
npm install
```

### ビルド
```bash
npm run build
```

### 開発モード
```bash
npm run dev
```

### コントリビューション
プルリクエストやイシューの報告を歓迎します。

## ライセンス
MIT License

## 更新履歴

### v1.0.0
- 初回リリース
- 基本的な変換機能
- プレビュー機能
- カスタムルール機能
- 設定画面

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

```
MIT License

Copyright (c) 2025 Obsidian Backlog Converter

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
