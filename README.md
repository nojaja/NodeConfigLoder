# NodeConfigLoder

設定ファイル読み込み・シリアライズライブラリ。  
JSON/YAML形式の設定ファイルを読み込み、暗号化・複号化、差分検出機能を提供します。

## Project Overview

NodeConfigLoder は Node.js向けの設定管理ライブラリです。以下の機能を提供します：

- **設定ファイル読み込み**: JSON/YAML形式の設定ファイルを同期読み込み
- **データシリアライズ**: 正規表現、Buffer、Secret値を安全にシリアライズ
- **暗号化サポート**: 機密情報を AES-256-CBC で暗号化・複号化
- **差分検出**: 設定の変更箇所をハッシュツリーで効率的に検出
- **CLI ツール**: コマンドラインで設定ファイルを処理

## Project Structure

```
src/
  configloder/
    ConfigLoder.js      # メインライブラリ - ファイル読み書き
    Serializer.js       # シリアライズ・暗号化処理
    FindDifferences.js  # 差分検出（ハッシュツリーベース）
  tools/
    index.js            # CLIツール実装
config/
  test.js               # テスト用設定ファイルサンプル
dist/                   # ビルド出力ディレクトリ
webpack.config.js       # Webpack設定
```

## Technology Stack

- **Runtime**: Node.js
- **Bundler**: Webpack 5
- **Crypto**: Node.js `crypto` モジュール（AES-256-CBC）
- **YAML**: `js-yaml` 4.1.0
- **CLI**: `commander` 8.3.0
- **Testing**: Jest 29.0.0
- **Utilities**: `@nojaja/pathutil`, `object-path`

## Features

### ✅ Implemented Features

1. **ConfigLoder クラス**
   - `readListSync(filepath)`: テキストファイルを行ごとに読み込む
   - `readConfigSync(filepath)`: JSON/YAMLファイルを読み込む
   - `writeConfigSync(filepath, data)`: JSON/YAMLで出力
   - `toJsonText(json)`: JSON文字列に変換
   - `toYamlText(json)`: YAML文字列に変換

2. **Serializer クラス**
   - `serializeObject(json)`: 複雑なオブジェクト（正規表現、Buffer、Secret）をシリアライズ
   - `deserializeObject(json)`: シリアライズ済みオブジェクトを復元
   - `generatekey(password)`: 暗号化キーを生成（scrypt + crypto）
   - AES-256-CBC による暗号化・複号化

3. **FindDifferences クラス** ⚠️ 実装進行中
   - `buildHashTree(data)`: ハッシュツリーを構築
   - 変更差分をイベント発行でトラッキング（EventEmitter拡張）

4. **CLI ツール**
   - `-i, --input <path>`: 入力設定ファイル（必須）
   - `-o, --output <path>`: 出力ファイルパス
   - `-k, --cryptokey <key>`: 暗号化キー（HEX形式）
   - `-d, --debug`: デバッグログ出力
   - 実行時の処理時間・メモリ使用量を統計出力

### config.js で利用可能なオブジェクト

設定ファイル（config.js）では以下の特殊なオブジェクトを使用できます。シリアライズ時に自動的に変換されます。

| オブジェクトの種類 | config.js での記載例 | 動作 |
|-----------------|------------------|------|
| **RegExp** | `/\s@Test\s.*/i` | 正規表現オブジェクト。source・flags・label で保存。復号時に RegExp として復元 |
| **Buffer** | `Buffer.from('7f454c46','hex')` | バイナリデータ。HEX形式で保存。復号時に Buffer として復元 |
| **Secret** | `new Secret("secret value")` | 機密情報を暗号化。内容は AES-256-CBC で暗号化して保存 |
| **Env** | `new Env({ name: 'API_KEY', default: 'fallback' })` | 環境変数を参照。実行時に `process.env[name]` から値を取得、なければ default を使用 |

#### RegExp の例（setLabel オプション）

RegExp にはラベルを設定でき、マッチした条件判定に利用できます：

```javascript
/\s@Test\s.*/i.setLabel('test-pattern')
```

#### Env の詳細

環境変数を動的に設定値に埋め込みます：

```javascript
new Env({ 
  name: 'DATABASE_URL',      // 参照する環境変数名
  default: 'localhost:5432'  // フォールバック値
})
```

実行時に `process.env.DATABASE_URL` が優先され、未設定の場合は `default` が使用されます。

### ⚠️ In Progress / Experimental

- **FindDifferences**: 差分検出ロジックは実装途上です
- **イベント駆動**: 大規模ファイルの変更をイベント駆動で通知する予定

## Setup

### Installation

```bash
cd NodeConfigLoder
npm install
```

### Build

開発ビルド（SourceMap付き）：

```bash
npm run build
```

テストを含むビルド：

```bash
npm run test
```

## Usage

### CLI Tool として利用

設定ファイルをコマンドラインから処理します。

#### 起動オプション一覧

| オプション | 短形式 | 説明 | 必須 |
|-----------|--------|------|------|
| `--input <path>` | `-i` | 入力設定ファイルパス | ✅ Yes |
| `--output <path>` | `-o` | 出力ファイルパス | No（省略時は現在ディレクトリ） |
| `--cryptokey <key>` | `-k` | 暗号化キー（HEX形式） | No（省略時は自動生成） |
| `--debug` | `-d` | デバッグログを出力 | No |

#### 実行コマンド例

**ヘルプ表示**

```bash
node ./dist/configtool.bundle.js -h
```

**基本的な実行例：設定ファイルを処理**

```bash
node ./dist/configtool.bundle.js -i ./config/test.js -o aa.json
```

**暗号化キーを指定して実行**

```bash
node ./dist/configtool.bundle.js -i ./config/test.js -o aa.json -k 0123456789abcdef0123456789abcdef
```

**デバッグログを有効にして実行**

```bash
node ./dist/configtool.bundle.js -i ./config/test.js -o aa.json -d
```

**全オプション指定**

```bash
node ./dist/configtool.bundle.js -i ./config/test.js -o output.json -k a1b2c3d4e5f6... -d
```

#### 出力内容

実行後、以下の情報がコンソールに出力されます：

- 入力・出力ファイルパス
- 使用した暗号化キー（自動生成の場合）
- 処理結果のオブジェクト内容
- 実行時間（秒・ミリ秒）
- メモリ使用量（RSS、ヒープ等）

### ライブラリとして利用

JavaScript/Node.js コードから ConfigLoder を直接インポートして利用します。

#### 基本的な使用例

```javascript
import { ConfigLoder } from './dist/configloder.bundle.js';
import { Serializer } from './dist/serializer.bundle.js';

// 設定ファイルを読み込む
const loader = new ConfigLoder();
const config = loader.readConfigSync('./config.json');

// シリアライズして暗号化
const key = Serializer.generatekey('my-password');
const serializer = new Serializer(key);
const serialized = serializer.serializeObject(config);
loader.writeConfigSync('./config.encrypted.json', serialized);

// 復号化して読み込む
const encrypted = loader.readConfigSync('./config.encrypted.json');
const decrypted = serializer.deserializeObject(encrypted);

console.log(decrypted);
```

#### ConfigLoder API

```javascript
const loader = new ConfigLoder(debug = false);

// テキストファイルを行ごとに読み込む
const lines = loader.readListSync('./list.txt');  // string[]

// JSON/YAMLファイルを読み込む
const config = loader.readConfigSync('./config.json');

// JSON/YAMLファイルに書き込む
loader.writeConfigSync('./config.json', configData);

// JSON文字列に変換
const jsonStr = loader.toJsonText(obj);

// YAML文字列に変換
const yamlStr = loader.toYamlText(obj);
```

#### Serializer API

```javascript
// 暗号化キーを生成（パスワード + ソルトベース）
const key = Serializer.generatekey('my-password');

const serializer = new Serializer(cryptoKey, debug = false);

// オブジェクトをシリアライズ（暗号化）
const serialized = serializer.serializeObject(configString);

// シリアライズ済みオブジェクトを復号化
const deserialized = serializer.deserializeObject(jsonString);
```

#### FindDifferences API ⚠️

```javascript
import { FindDifferences } from './dist/finddifferences.bundle.js';

const differ = new FindDifferences();

// ハッシュツリーを構築
const hashTree = differ.buildHashTree(config);
```

### 開発

本プロジェクトの開発に参加する場合の手順です。

#### 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/nojaja/NodeConfigLoder.git
cd NodeConfigLoder

# 依存パッケージをインストール
npm install
```

#### ビルド・テスト

**開発ビルド**（SourceMap付き）

```bash
npm run build
```

これは以下と等価です：

```bash
cross-env NODE_ENV=test webpack
```

**テスト実行**

```bash
npm run test
```

これは以下と等価です：

```bash
cross-env NODE_ENV=test webpack && jest
```

#### 出力ファイル

ビルド後、[dist/](dist/) 配下に以下のバンドルが生成されます：

| ファイル | 用途 |
|---------|------|
| `configloder.bundle.js` | ConfigLoder ライブラリ（UMD） |
| `serializer.bundle.js` | Serializer ライブラリ（UMD） |
| `finddifferences.bundle.js` | FindDifferences ライブラリ（UMD） |
| `configtool.bundle.js` | CLIツール（実行可能） |

#### ソースコード構成

- [src/configloder/](src/configloder/) - コアライブラリ実装
- [src/tools/](src/tools/) - CLIツール実装
- [config/](config/) - テスト用設定ファイル
- [webpack.config.js](webpack.config.js) - ビルド設定

#### 開発ワークフロー

1. [src/](src/) 配下のソースコードを編集
2. `npm run build` でビルド
3. `npm run test` でテスト実行
4. 動作確認：`node ./dist/configtool.bundle.js -i ./config/test.js -o aa.json`
5. 変更を Git にコミット

#### デバッグ

CLI ツール実行時にデバッグ出力を有効にする：

```bash
node ./dist/configtool.bundle.js -i ./config/test.js -o aa.json -d
```

ライブラリ内のデバッグ出力を有効にする：

```javascript
const loader = new ConfigLoder(true);  // debug=true
const serializer = new Serializer(key, true);  // debug=true
```

## Technical Details

### Serialization Format

Serializer は複雑なデータ型を JSON 互換形式で保存します：

```javascript
{
  "key1": "value",                    // 通常の文字列
  "secret": {
    "type": "Secret",
    "iv": "hex string",               // 初期化ベクタ
    "hex": "encrypted hex"            // 暗号化データ
  },
  "buffer": {
    "type": "Buffer",
    "hex": "7f454c46"                 // HEX表記
  },
  "regex": {
    "type": "RegExp",
    "source": "\\s@Test\\s.*",
    "flags": "i",
    "label": "optional label"         // 任意のラベル
  }
}
```

### Encryption Details

- **Algorithm**: AES-256-CBC
- **Key Generation**: `crypto.scryptSync()` (password-based)
- **IV (初期化ベクタ)**: 各Secret値ごとにランダムに生成
- **キーは環境変数またはCLI引数で指定**

### Test Configuration Example

[config/test.js](config/test.js) は以下の構造をサポートしています：

```javascript
module.exports = {
  "key1": "value",
  "key2": new Secret("Secret value"),
  "key3": Buffer.from('7f454c46','hex'),
  "key4": /\s@Test\s.*/i,
  "key5": {
    "key5-1": "value",
    "key5-2": new Secret("Secret value"),
    "key5-3": Buffer.from('7f454c46','hex'),
  },
  "key6": [
    "value",
    new Secret("Secret value"),
    Buffer.from('7f454c46','hex'),
  ]
}
```

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| ConfigLoder | ✅ Complete | 基本的なファイル I/O 実装済み |
| Serializer | ✅ Complete | 暗号化・複号化機能実装済み |
| FindDifferences | ⚠️ In Progress | ハッシュツリー構築中、差分検出ロジック未完 |
| CLI Tool | ✅ Complete | コマンドラインツール実装済み |
| Tests | ⚠️ Partial | 基本テストのみ実装 |

## Performance / Goals

現在のツール特性：

- **処理時間**: 実行終了時に秒・ミリ秒単位で統計出力
- **メモリ使用量**: RSS、ヒープ使用量を MB 単位で出力
- **目標**: 大規模設定ファイル（数百MB）の差分検出を効率化

## Output Example

実行時のコンソール出力例：

```
inputPath: D:\devs\workspace202111\NodeConfigLoder\config\test.js
outputPath: D:\devs\workspace202111\NodeConfigLoder\aa.json
cryptokey: a1b2c3d4e5f6...
{ key1: 'value', key2: { type: 'Secret', ... }, ... }
process statistics - Execution time: 0s 45.123ms, memoryUsage: {"rss":"45.23MB","heapTotal":"32.45MB","heapUsed":"15.67MB",...}
```

## License & Author

- **License**: MIT License © 2025 nojaja
- **Author**: nojaja <free.riccia@gmail.com>
- **Repository**: [github.com/nojaja/NodeConfigLoder](https://github.com/nojaja/NodeConfigLoder)
- **Issues**: [github.com/nojaja/NodeConfigLoder/issues](https://github.com/nojaja/NodeConfigLoder/issues)