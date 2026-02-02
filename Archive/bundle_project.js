const fs = require('fs');
const path = require('path');

// 設定
const OUTPUT_FILE = 'project_source_bundle.txt';
const ROOT_DIR = __dirname;

// 除外するディレクトリ
const IGNORE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'logs',
    'data',     // ゲームの保存データ
    '.idea',
    '.vscode',
    'coverage',
    'mockups'
];

// 除外するファイル
const IGNORE_FILES = [
    OUTPUT_FILE,
    'package-lock.json', // 長すぎるので除外（必要なら外してください）
    '.DS_Store',
    '.env',               // セキュリティのため除外
    '.env.example'
];

// 対象とする拡張子（これ以外は無視、ただしINCLUDE_FILESにあるものは含める）
const ALLOWED_EXTENSIONS = [
    '.ts',
    '.js',
    '.json',
    '.md',
    '.html',
    '.css',
    '.txt'
];

// 拡張子に関わらず必ず含めるファイル
const INCLUDE_FILES = [
    '.gitignore',
    '.env.example',
    'LICENSE',
    'Dockerfile'
];

/**
 * ディレクトリを再帰的に探索してファイルパスのリストを取得
 */
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);

        // ディレクトリの場合
        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        }
        // ファイルの場合
        else {
            // 除外リストにあるかチェック
            if (IGNORE_FILES.includes(file)) return;

            // 拡張子またはホワイトリスト名でチェック
            const ext = path.extname(file);
            if (ALLOWED_EXTENSIONS.includes(ext) || INCLUDE_FILES.includes(file)) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

/**
 * ファイルを結合して書き出し
 */
function bundle() {
    console.log('🔍 Scanning files...');
    const files = getAllFiles(ROOT_DIR);
    let content = "# Project Source Bundle\n# Generated: " + new Date().toISOString() + "\n\n";

    console.log(`📦 Bundling ${files.length} files...`);

    files.forEach(file => {
        const relativePath = path.relative(ROOT_DIR, file);
        console.log(`  + ${relativePath}`);

        try {
            const fileContent = fs.readFileSync(file, 'utf8');

            // 区切り線とファイル名を見やすく追加
            content += `\n` + '='.repeat(80) + `\n`;
            content += `FILE: ${relativePath}\n`;
            content += '='.repeat(80) + `\n`;
            content += '```' + (path.extname(file).replace('.', '') || 'text') + '\\n';
            content += fileContent + '\\n';
            content += '```\\n';

        } catch (err) {
            console.error(`  ❌ Error reading ${relativePath}: ${err.message}`);
        }
    });

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`\n✅ Done! Content written to: ${OUTPUT_FILE}`);
}

// 実行
bundle();
