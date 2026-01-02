const fs = require('fs');
const FindDifferences = require('../configloder/FindDifferences');
const objectPath = require('object-path');

// 監視対象ファイルパス
const filePath = './target.json';

// インスタンス作成
const diffFinder = new FindDifferences();

// 差分通知イベントのリスナー設定
diffFinder.on('difference', ({ type, path }) => {
    console.log(`変更検出: ${type} - ${path}`);
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        const valueAtPath = objectPath.get(jsonData, path);
        console.log(`該当箇所の値:`, valueAtPath);
    } catch (error) {
        console.error(`エラーが発生しました: ${error.message}`);
    }
});

// 初期化処理
function initialize() {
    if (!fs.existsSync(filePath)) {
        console.error(`${filePath} が存在しません。`);
        process.exit(1);
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if(fileContent==='')return
        const jsonData = JSON.parse(fileContent);

        const previousHashTree = diffFinder.initialize(jsonData);
        console.log(`[${new Date().toISOString()}] 初期化完了`);
        // console.log(previousHashTree)
    } catch (error) {
        console.error(`初期化中にエラーが発生しました: ${error.message}`);
    }
}

// ファイル変更監視処理
function watchFile() {
    fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                if(fileContent==='')return
                const jsonData = JSON.parse(fileContent);

                const previousHashTree = diffFinder.detectChanges(jsonData);
                // console.log(previousHashTree)
            } catch (error) {
                console.error(`ファイル変更処理中にエラーが発生しました: ${error.message}`);
            }
        }
    });

    console.log(`[${new Date().toISOString()}] 監視開始: ${filePath}`);
}

// 実行処理
initialize();
watchFile();
