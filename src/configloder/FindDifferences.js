const { EventEmitter } = require('events');
const crypto = require('crypto');

class FindDifferences extends EventEmitter {
    constructor() {
        super();
        this.previousHashTree = {};
    }

    // ハッシュ値を計算する関数
    calculateHash(value) {
        return crypto.createHash('sha256').update(value).digest('hex');
    }

    // 再帰的にハッシュツリーを構築する関数（初回用）
    buildHashTree(data) {
        if (typeof data !== 'object' || data === null) {
            // プリミティブ値の場合、そのままハッシュ化
            //return this.calculateHash(JSON.stringify(data));
            return { __hash: this.calculateHash(JSON.stringify(data)) };
        }

        if (Array.isArray(data)) {
            // 配列の場合、各要素のハッシュ値を結合してハッシュ化
            const childHashes = data.map((item) => this.buildHashTree(item));
            const combinedHash = this.calculateHash(childHashes.join(''));
            return { __hash: combinedHash, ...childHashes };
        }

        if (typeof data == 'object' && data.type) {
            // type値を持っているobjectの場合、そのままハッシュ化
            return { __hash: this.calculateHash(JSON.stringify(data)) };
        }

        // オブジェクトの場合、キーと値をソートしてハッシュ化
        const childHashes = Object.keys(data)
            .sort()
            .reduce((tree, key) => {
                tree[key] = this.buildHashTree(data[key]);
                return tree;
            }, {});
        const combinedHash = this.calculateHash(
            Object.entries(childHashes)
                .map(([key, value]) => `${key}:${value.__hash || value}`)
                .join('')
        );
        return { __hash: combinedHash, ...childHashes };
    }

    // 再帰的に差分を検出しながらハッシュツリーを更新する関数
    findDifferencesAndUpdate(hashTree, jsonData, path = '') {
        const differences = {};

        // オブジェクト全体のハッシュ値を比較し、変更がなければ再帰しない
        const newHash = this.calculateHash(JSON.stringify(jsonData));
        if (hashTree.__hash === newHash) {
            return differences; // 差分なし
        }

        // 既存のハッシュツリーのキーを確認
        for (const key in hashTree) {
            if (key === '__hash') continue; // __hash はスキップ（全体のハッシュ）

            const currentPath = path ? `${path}.${key}` : key;

            if (!(key in jsonData)) {
                this.emit('difference', { type: 'removed', path: currentPath });
                delete hashTree[key]; // 削除されたキーはハッシュツリーからも削除
            } else if (typeof jsonData[key] === 'object' && jsonData[key] !== null) {
                if (jsonData[key].type) {
                    // type値を持っているobjectの場合、そのままハッシュ化して比較
                    const newPrimitiveHash = this.calculateHash(JSON.stringify(jsonData[key]));
                    if (hashTree[key].__hash !== newPrimitiveHash) {
                        this.emit('difference', { type: 'modified', path: currentPath });
                        hashTree[key] = { __hash: newPrimitiveHash }; // ハッシュツリーを更新
                    }
                } else {
                    // 再帰的に探索（__hashで変更がない場合はスキップ）
                    if (!hashTree[key] || typeof hashTree[key] !== 'object') hashTree[key] = {};
                    this.findDifferencesAndUpdate(hashTree[key], jsonData[key], currentPath);
                }
            } else {
                // プリミティブ値の場合は直接比較
                const newPrimitiveHash = this.calculateHash(JSON.stringify(jsonData[key]));
                //console.log(`modified: key: ${key}, __hash: ${hashTree[key].__hash} newPrimitiveHash: ${newPrimitiveHash} `)
                if (hashTree[key].__hash !== newPrimitiveHash) {
                    this.emit('difference', { type: 'modified', path: currentPath });
                    hashTree[key] = { __hash: newPrimitiveHash }; // ハッシュツリーを更新
                }
            }
        }

        // 新しいデータのキーを確認（追加されたもの）
        for (const key in jsonData) {
            const currentPath = path ? `${path}.${key}` : key;

            if (!(key in hashTree)) {
                this.emit('difference', { type: 'added', path: currentPath });
                hashTree[key] =
                    typeof jsonData[key] === 'object' && jsonData[key] !== null
                        ? this.buildHashTree(jsonData[key])
                        : { __hash: this.calculateHash(JSON.stringify(jsonData[key])) };
            }
        }

        // 全体のハッシュ値を更新
        hashTree.__hash = this.calculateHash(
            Object.entries(hashTree)
                .filter(([key]) => key !== '__hash')
                .map(([key, value]) => `${key}:${value.__hash || value}`)
                .join('')
        );
    }

    // 初期化用メソッド（初回読み込み時）
    initialize(jsonData) {
        return this.previousHashTree = this.buildHashTree(jsonData);// 初期ハッシュツリー構築
    }

    // 差分検出用メソッド（ファイル変更時）
    detectChanges(jsonData) {
        this.findDifferencesAndUpdate(this.previousHashTree, jsonData);
        return this.previousHashTree
    }
}

module.exports = FindDifferences;
