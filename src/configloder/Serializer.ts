import * as crypto from 'crypto';
import * as sourceMapSupport from 'source-map-support';

// デバッグ用のsourceMap設定
sourceMapSupport.install();

/**
 * 処理名: 設定値のシリアライズ・暗号化ライブラリ
 *
 * 処理概要:
 * JavaScriptの設定オブジェクトをシリアライズ・デシリアライズする。
 * 正規表現、Buffer、環境変数、シークレット情報の特殊なハンドリングをサポート
 *
 * 実装理由:
 * 複雑な設定オブジェクト（正規表現、バイナリデータ、暗号情報）を
 * JSON形式で安全に保存・復元するため
 */
export class Serializer {
  private crypto: {
    instance: typeof crypto;
    algorithm: string;
    cryptokey: Buffer;
  };
  private debug: boolean;

  /**
   * 処理名: コンストラクタ
   *
   * 処理概要:
   * Serializerインスタンスを初期化し、暗号化キーとデバッグフラグを設定
   * 実装理由:
   * 暗号化・複号化処理で使用する秘密鍵を保持するため
   * @param {Buffer} cryptokey 暗号化用の秘密鍵
   * @param {boolean} [debug] デバッグモード
   */
  constructor(cryptokey: Buffer, debug?: boolean) {
    this.crypto = {
      instance: crypto,
      algorithm: 'aes-256-cbc',
      cryptokey: cryptokey,
    };
    this.debug = debug || false;
  }

  /**
   * 処理名: 暗号化キー生成
   * 処理概要:
   * パスワードから暗号化キーを生成する。
   * パスワードが指定されない場合はランダムに生成
   *
   * 実装理由:
   * 安全な暗号化キー生成のためにscrypt関数を使用
   * @param {string} [password] 暗号化パスワード
   * @returns {Buffer} 32バイトの暗号化キー
   */
  static generatekey(password?: string): Buffer {
    const PASSWORD =
      password || crypto.randomBytes(32).toString('base64');
    const SALT = crypto.randomBytes(16).toString('base64');
    return crypto.scryptSync(PASSWORD, SALT, 32);
  }

  /**
   * 処理名: RegExp デシリアライズ処理
   * @param {unknown} value 値
   * @returns {unknown} 処理済み値
   * @private
   */
  private deserializeRegExp(value: unknown): unknown {
    const obj = value as Record<string, unknown>;
    const regExp = new RegExp(
      (obj.source as string) || '',
      (obj.flags as string) || ''
    );
    if (obj.label) {
      Object.defineProperty(regExp, 'label', {
        value: obj.label,
      });
    }
    return regExp;
  }

  /**
   * 処理名: Buffer デシリアライズ処理
   * @param {unknown} value 値
   * @returns {unknown} 処理済み値
   * @private
   */
  private deserializeBuffer(value: unknown): unknown {
    const obj = value as Record<string, unknown>;
    return Buffer.from((obj.hex as string), 'hex');
  }

  /**
   * 処理名: Secret デシリアライズ処理
   * @param {unknown} value 値
   * @returns {unknown} 処理済み値
   * @private
   */
  private deserializeSecret(value: unknown): unknown {
    const obj = value as Record<string, unknown>;
    const decipher = this.crypto.instance.createDecipheriv(
      this.crypto.algorithm,
      this.crypto.cryptokey,
      Buffer.from((obj.iv as string), 'hex')
    );
    return JSON.parse(
      decipher.update((obj.hex as string), 'hex', 'utf-8') +
        decipher.final('utf-8')
    );
  }

  /**
   * 処理名: Env デシリアライズ処理
   * @param {unknown} value 値
   * @returns {unknown} 処理済み値
   * @private
   */
  private deserializeEnv(value: unknown): unknown {
    const obj = value as Record<string, unknown>;
    return (
      process.env[(obj.name as string)] ||
      (obj.default as string)
    );
  }

  /**
   * 処理名: リバイバー関数
   * @param {string} _key キー名
   * @param {unknown} value 値
   * @returns {unknown} 処理済み値
   * @private
   */
  private reviver(_key: string, value: unknown): unknown {
    try {
      if (!value || typeof value !== 'object') {
        return value;
      }

      const type = (value as Record<string, unknown>).type as string;

      switch (type) {
        case 'RegExp':
          return this.deserializeRegExp(value);
        case 'Buffer':
          return this.deserializeBuffer(value);
        case 'Secret':
          return this.deserializeSecret(value);
        case 'Env':
          return this.deserializeEnv(value);
        default:
          return value;
      }
    } catch (error) {
      throw new Error(`デシリアライズリバイバーエラー: ${error}`);
    }
  }

  /**
   * 処理名: JSON文字列のデシリアライズ
   *
   * 処理概要:
   * JSON文字列を復元し、特殊なtype値を持つオブジェクトを
   * 適切なJavaScriptオブジェクトに変換する
   *
   * 実装理由:
   * 保存されたシリアライズデータから元の正規表現、Buffer、Secret等を
   * 復元するため
   * @param {string} json JSON文字列
   * @returns {unknown} デシリアライズされたオブジェクト
   * @throws {Error} デシリアライズに失敗した場合
   */
  deserializeObject(json: string): unknown {
    try {
      return JSON.parse(json, (key: string, value: unknown) => this.reviver(key, value));
    } catch (error) {
      throw new Error(`デシリアライズエラー: ${error}`);
    }
  }

  /**
   * 処理名: JavaScriptコードのシリアライズ
   *
   * 処理概要:
   * JavaScriptコード文字列を実行し、正規表現・Buffer・環境変数・Secret等の
   * 特殊なオブジェクトを適切にシリアライズ可能な形式に変換
   *
   * 実装理由:
   * module.exportsで定義された設定オブジェクトに対し、
   * カスタムtoJSONメソッドを動的に追加してシリアライズ処理を統一するため
   * @param {string} jsCode JavaScriptのコード文字列
   * @returns {unknown} シリアライズされた設定オブジェクト
   * @throws {Error} コード実行に失敗した場合
   */
  serializeObject(jsCode: string): unknown {
    try {
      const runCode = new Function(
        'crypto',
        `
                    try {
                        const module = {};
                        //正規表現パターンにラベル設定用メソッドを追加する、どの条件でマッチしたかをこのラベルで判断できる
                        RegExp.prototype.setLabel = function (label) { this.label = label; return this }
                        RegExp.prototype._toJSON = RegExp.prototype.toJSON //通常のtoJSONを退避
                        RegExp.prototype.toJSON = function () { return { type: "RegExp", source: this.source, flags: this.flags, label: this.label || '' } }//Instance作成に必要なパラメータのみを出力するようにメソッドを上書きする
        
                        Buffer.prototype._toJSON = Buffer.prototype.toJSON //通常のtoJSONを退避
                        Buffer.prototype.toJSON = function () { return { type: "Buffer", hex: this.toString('hex')} }//Instance作成に必要なパラメータのみを出力するようにメソッドを上書きする
        
                        //環境変数クラス
                        function Env(json) {
                            this.name = json.name;
                            this.default = json.default;
                            this.toJSON = () => {//Instance作成に必要なパラメータを出力するメソッドを追加
                                return { type: "Env", name: this.name, default: this.default}; 
                            }
                        }
        
                        //シークレット情報用の暗号化クラス
                        function Secret(json) {
                            this.text = JSON.stringify(json);//配下のJSON情報を暗号化する
                            this.toJSON = () => {//Instance作成に必要なパラメータを暗号化して出力するメソッドを追加
                                //IVを生成
                                const iv = crypto.instance.randomBytes(16);
                                //暗号器を生成
                                const cipher = crypto.instance.createCipheriv(crypto.algorithm, crypto.cryptokey, iv);
                                return { type: "Secret", iv: iv.toString('hex'), hex: cipher.update(this.text, 'utf-8', 'hex') + cipher.final('hex')}; 
                            }
                        }
                        ${jsCode};
                        return module.exports;
                    } catch (error) {
                        console.error(error);
                    }
                `
      );
      return runCode(this.crypto); // 設定情報jsに上記のコードを追加した状態でコードを実行する
    } catch (error) {
      throw new Error(`シリアライズエラー: ${error}`);
    }
  }
}

export default Serializer;
