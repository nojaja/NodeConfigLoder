import * as path from 'path';
import * as fs from 'fs';
import ConfigLoder from '../configloder/ConfigLoder';
import Serializer from '../configloder/Serializer';
import { Command } from 'commander';
import PathUtil from '@nojaja/pathutil';
import * as sourceMapSupport from 'source-map-support';

// デバッグ用のsourceMap設定
sourceMapSupport.install();

/* 起動パラメータ設定 */
const version =
  typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'dev'; // __VERSION__はビルド時にwebpackのDefinePluginによって書き換えられます。
const program = new Command();
program.version(version);
program
  .requiredOption('-i, --input <type>', 'input config source file path')
  .option('-o, --output <type>', 'output config file path')
  .option('-k, --cryptokey <type>', 'crypto key')
  .option('-d --debug', 'output extra debugging log');

program.parse(process.argv);
const options = program.opts();
if (options.debug) console.log(options);

// 入力先の絶対パス取得
const inputPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(options.input)
);
const outputPath = PathUtil.normalizeSeparator(
  PathUtil.absolutePath(options.output ? options.output : './')
);

if (options.input) console.log(`inputPath: ${inputPath}`);
if (options.output) console.log(`outputPath: ${outputPath}`);

/**
 * 処理名: メモリ使用量フォーマット処理
 *
 * 処理概要:
 * バイト値をMB単位に変換してフォーマットする
 *
 * 実装理由:
 * メモリ統計情報を人間が読みやすい形式で表示するため
 * @param {number} byte バイト数
 * @returns {string} MB単位の文字列
 * @private
 */
const toMByte = (byte: number): string => {
  return `${Math.floor((byte / 1024 / 1024) * 100) / 100}MB`;
};

/**
 * 処理名: メイン処理
 *
 * 処理概要:
 * 設定ファイルを読み込み、シリアライズし、出力ファイルに書き込む。
 * パフォーマンス統計情報を記録して処理終了
 *
 * 実装理由:
 * CLIツールとしての主要な機能をasync/awaitで安全に実行するため
 */
const main = async (): Promise<void> => {
  const startTime = process.hrtime();
  process.on('exit', (_exitCode) => {
    // 後始末処理
    const endTimeArray = process.hrtime(startTime);
    const memoryUsage = process.memoryUsage();
    const memoryUsageInfo = JSON.stringify({
      rss: toMByte(memoryUsage.rss),
      heapTotal: toMByte(memoryUsage.heapTotal),
      heapUsed: toMByte(memoryUsage.heapUsed),
      external: toMByte(memoryUsage.external),
      arrayBuffers: toMByte(memoryUsage.arrayBuffers),
    });
    console.log(
      `process statistics - Execution time: ${endTimeArray[0]}s ${
        endTimeArray[1] / 1000000
      }ms, memoryUsage: ${memoryUsageInfo}`
    );
  });
  try {
    // 設定ファイルの読み込み
    const config = fs.readFileSync(inputPath, 'utf8');
    const cryptokey = options.cryptokey
      ? Buffer.from(options.cryptokey, 'hex')
      : Serializer.generatekey();
    if (!options.cryptokey)
      console.log(`cryptokey: ${cryptokey.toString('hex')}`);

    const configloder = new ConfigLoder();
    const serializer = new Serializer(cryptokey);
    const settingsdata = serializer.serializeObject(config);

    // 出力先フォルダの作成
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    configloder.writeConfigSync(outputPath, settingsdata);
    const contents = configloder.readConfigSync(outputPath);
    const obj = serializer.deserializeObject(contents);
    console.log(obj);
  } catch (error) {
    console.error(`fatal: ${error}`);
    process.exitCode = 1;
    return;
  }
};

await main();

