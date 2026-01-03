import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as sourceMapSupport from 'source-map-support';

// デバッグ用のsourceMap設定
sourceMapSupport.install();

/**
 * 処理名: 設定ファイル読み込み・書き込みライブラリ
 *
 * 処理概要:
 * JSON/YAML形式の設定ファイルを読み込み・書き込みするためのクラス。
 * 同期処理で設定ファイルを管理し、フォーマット変換機能を提供する
 *
 * 実装理由:
 * アプリケーション起動時に設定ファイルを即座に読み込む必要があり、
 * JSON/YAMLの双方に対応する必要があるため
 */
export class ConfigLoder {
  private debug: boolean;

  /**
   * 処理名: コンストラクタ
   *
   * 処理概要:
   * ConfigLoderインスタンスを初期化する
   *
   * 実装理由:
   * デバッグフラグを設定し、詳細なログ出力をコントロールするため
   * @param {boolean} [debug] デバッグモード（省略可能、デフォルト: false）
   */
  constructor(debug?: boolean) {
    this.debug = debug || false;
  }

  /**
   * 処理名: リスト形式の設定ファイル読み込み
   *
   * 処理概要:
   * 改行区切りのテキストファイルを読み込み、配列に変換して返す
   *
   * 実装理由:
   * シンプルなリスト形式の設定を効率的に読み込むため
   * @param {string} filepath ファイルパス
   * @returns {string[]} 行単位に分割された文字列配列
   * @throws {Error} ファイルが存在しないか読み込みに失敗した場合
   */
  readListSync(filepath: string): string[] {
    try {
      if (!fs.existsSync(filepath)) {
        throw new Error(`no such list file: ${filepath}`);
      }
      const data = fs.readFileSync(filepath, 'utf8');
      return data.split(/\r?\n/);
    } catch (error) {
      throw new Error(`read error: ${filepath}`);
    }
  }

  /**
   * 処理名: 設定ファイル読み込み
   *
   * 処理概要:
   * JSON/YAML形式の設定ファイルを読み込み、JSON文字列として返す。
   * YAMLは自動的にJSONに変換される
   *
   * 実装理由:
   * 複数のフォーマットに対応しながら、内部的にはJSONで統一处理するため
   * @param {string} filepath ファイルパス
   * @returns {string} JSON形式の文字列
   * @throws {Error} ファイルが存在しないか読み込みに失敗した場合
   */
  readConfigSync(filepath: string): string {
    try {
      if (!fs.existsSync(filepath)) {
        throw new Error(`no such list file: ${filepath}`);
      }
      const content = fs.readFileSync(filepath, 'utf8');
      const ext = path.extname(filepath);
      return (ext === '.yaml' || ext === '.yml')
        ? JSON.stringify(yaml.load(content))
        : content;
    } catch (error) {
      throw new Error(`readConfigSync error: ${error}`);
    }
  }

  /**
   * 処理名: YAML形式への変換
   *
   * 処理概要:
   * JavaScriptオブジェクトをYAML形式のテキストに変換する
   *
   * 実装理由:
   * 設定ファイルの人間が読みやすいYAML形式での出力を実現するため
   * @param {unknown} json 変換元のオブジェクト
   * @returns {string} YAML形式の文字列
   */
  toYamlText(json: unknown): string {
    return yaml.dump(JSON.parse(JSON.stringify(json)));
  }

  /**
   * 処理名: JSON形式への変換
   *
   * 処理概要:
   * JavaScriptオブジェクトをフォーマット済みのJSON文字列に変換する
   *
   * 実装理由:
   * 設定ファイルのJSON形式での出力を提供するため
   * @param {unknown} json 変換元のオブジェクト
   * @returns {string} フォーマット済みJSON文字列
   */
  toJsonText(json: unknown): string {
    return JSON.stringify(json, null, 2);
  }

  /**
   * 処理名: 設定ファイル書き込み
   *
   * 処理概要:
   * 設定データをJSONまたはYAML形式で指定されたパスに書き込む。
   * ファイル拡張子から自動的にフォーマットを判定
   *
   * 実装理由:
   * 変更された設定を指定フォーマットで永続化するため
   * @param {string} filepath ファイルパス
   * @param {unknown} data 書き込むデータ
   * @throws {Error} 書き込みに失敗した場合
   */
  writeConfigSync(filepath: string, data: unknown): void {
    try {
      const ext = path.extname(filepath);
      if (ext === '.yaml' || ext === '.yml') {
        fs.writeFileSync(filepath, this.toYamlText(data));
      } else {
        fs.writeFileSync(filepath, this.toJsonText(data));
      }
    } catch (error) {
      throw new Error(`writeConfigSync error: ${error}`);
    }
  }
}

export default ConfigLoder;
