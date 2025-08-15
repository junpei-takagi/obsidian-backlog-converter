import fs from 'fs';
import path from 'path';

// リリース用のディレクトリを作成
const releaseDir = 'release';
const pluginName = 'obsidian-backlog-converter';

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir);
}

// プラグイン用のサブディレクトリを作成
const pluginDir = path.join(releaseDir, pluginName);
if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true });
}
fs.mkdirSync(pluginDir);

// 必要なファイルをコピー
const filesToCopy = [
    'main.js',
    'manifest.json',
    'styles.css',
    'LICENSE'
];

console.log('リリース用ファイルをコピー中...');

filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(pluginDir, file));
        console.log(`✓ ${file} をコピーしました`);
    } else {
        console.log(`⚠️  ${file} が見つかりません`);
    }
});

// package.jsonからバージョン情報を読み取り
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// ZIPファイルを作成する場合（オプション）
// npm install archiver が必要
try {
    const archiver = await import('archiver');
    const archive = archiver.default('zip', {
        zlib: { level: 9 }
    });

    const zipName = `${pluginName}-${version}.zip`;
    const output = fs.createWriteStream(path.join(releaseDir, zipName));

    archive.pipe(output);
    archive.directory(pluginDir, pluginName);
    await archive.finalize();

    console.log(`✓ ${zipName} を作成しました`);
} catch (error) {
    console.log('ZIP作成をスキップ（archiverがインストールされていません）');
    console.log('必要に応じて `npm install archiver` を実行してください');
}

// READMEファイルもコピー
if (fs.existsSync('README.md')) {
    fs.copyFileSync('README.md', path.join(pluginDir, 'README.md'));
    console.log('✓ README.md をコピーしました');
}

console.log(`\n🎉 リリースファイルが ${pluginDir} に作成されました`);
console.log('このフォルダを .obsidian/plugins/ にコピーしてプラグインをインストールできます');
