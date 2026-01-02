import * as crypto from 'crypto'
import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();

export class Serializer {
    constructor(cryptokey, debug) {
        this.crypto = {
            instance: crypto,
            algorithm: 'aes-256-cbc',
            cryptokey: cryptokey
        }
        this.debug = debug || false;
    }

    /**
     * 設定値の暗号化複合化用のキーを生成します
     * @param {*} password 
     * @returns 
     */
    static generatekey(password) {
        const PASSWORD = password || crypto.randomBytes(32).toString('base64');
        const SALT = crypto.randomBytes(16).toString('base64');
        return crypto.scryptSync(PASSWORD, SALT, 32);
    }

    deserializeObject(json) {
        try {
            const reviver = (key, value) => {
                try {
                    //設定値が正規表現オブジェクトだった場合の処理
                    if (value != null && typeof value === 'object' && value.type && value.type === 'RegExp') {
                        const regExp = new RegExp(value.source || '', value.flags || '');
                        if (value.label) regExp.label = value.label;
                        return regExp;
                    }

                    //設定値がHEXデータだった場合の処理
                    if (value != null && typeof value === 'object' && value.type && value.type === 'Buffer') {
                        return Buffer.from(value.hex, 'hex');
                    }

                    //設定値が暗号データだった場合の処理
                    if (value != null && typeof value === 'object' && value.type && value.type === 'Secret') {
                        const decipher = this.crypto.instance.createDecipheriv(this.crypto.algorithm, this.crypto.cryptokey, Buffer.from(value.iv, 'hex'));
                        return JSON.parse(decipher.update(value.hex, 'hex', 'utf-8') + decipher.final('utf-8'));
                    }

                    //設定値がHEXデータだった場合の処理
                    if (value != null && typeof value === 'object' && value.type && value.type === 'Env') {
                        return process.env[value.name] || value.default;
                    }
                } catch (error) {
                    throw new Error(`deserializeObject error: key:${key}, value:${value}`, error);
                }
                return value
            }
            return JSON.parse(json, reviver);
        } catch (error) {
            throw new Error(`deserializeObject error: ${error}`, error);
        }
    }

    serializeObject(jsCode) {
        try {
            const runCode = new Function("crypto", `
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
                `);
            return runCode(this.crypto);//設定情報jsに上記のコードを追加した状態でコードを実行する
        } catch (error) {
            throw new Error(`serializeObject error: ${error}`, error);
        }
    }
}

export default Serializer