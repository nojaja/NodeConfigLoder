/**
 * 処理名: Serializer ユニットテスト
 *
 * 処理概要:
 * Serializerクラスのシリアライズ・デシリアライズ機能をテストする
 *
 * 実装理由:
 * 正規表現、Buffer、Secret等の特殊なオブジェクトの安全な処理を検証するため
 */

import { Serializer } from '../../../src/configloder/Serializer';

describe('Serializer', () => {
  let serializer: Serializer;
  let cryptokey: Buffer;

  beforeEach(() => {
    cryptokey = Serializer.generatekey('test-password');
    serializer = new Serializer(cryptokey);
  });

  /**
   * 正常系: シリアライズキー生成
   */
  it('正常系: シリアライズキー生成', () => {
    const key = Serializer.generatekey('password');

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  /**
   * 正常系: シリアライズキー生成（パスワード省略）
   */
  it('正常系: シリアライズキー生成（パスワード省略）', () => {
    const key = Serializer.generatekey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  /**
   * 正常系: シンプルなオブジェクトのデシリアライズ
   */
  it('正常系: シンプルなオブジェクトのデシリアライズ', () => {
    const json = JSON.stringify({
      name: 'test',
      value: 123,
      flag: true,
    });

    const result = serializer.deserializeObject(json);

    expect(result).toEqual({
      name: 'test',
      value: 123,
      flag: true,
    });
  });

  /**
   * 正常系: 環境変数オブジェクトのデシリアライズ
   */
  it('正常系: 環境変数オブジェクトのデシリアライズ', () => {
    process.env.TEST_VAR = 'test-value';

    const json = JSON.stringify({
      env: {
        type: 'Env',
        name: 'TEST_VAR',
        default: 'default-value',
      },
    });

    const result = serializer.deserializeObject(json) as Record<
      string,
      Record<string, unknown>
    >;

    expect(result.env).toBe('test-value');
  });

  /**
   * 正常系: 環境変数オブジェクトのデシリアライズ（デフォルト値使用）
   */
  it('正常系: 環境変数オブジェクトのデシリアライズ（デフォルト値使用）', () => {
    delete process.env.NONEXISTENT_VAR;

    const json = JSON.stringify({
      env: {
        type: 'Env',
        name: 'NONEXISTENT_VAR',
        default: 'default-value',
      },
    });

    const result = serializer.deserializeObject(json) as Record<
      string,
      Record<string, unknown>
    >;

    expect(result.env).toBe('default-value');
  });

  /**
   * 異常系: 不正なJSON形式
   */
  it('異常系: 不正なJSON形式', () => {
    const invalidJson = '{invalid json}';

    expect(() => {
      serializer.deserializeObject(invalidJson);
    }).toThrow('デシリアライズエラー');
  });

  /**
   * 正常系: JavaScriptコードのシリアライズ（基本オブジェクト）
   */
  it('正常系: JavaScriptコードのシリアライズ（基本オブジェクト）', () => {
    const jsCode = 'module.exports = { name: "test", value: 42 };';

    const result = serializer.serializeObject(jsCode) as Record<
      string,
      unknown
    >;

    expect(result.name).toBe('test');
    expect(result.value).toBe(42);
  });

  /**
   * 正常系: Bufferオブジェクトのデシリアライズ
   */
  it('正常系: Bufferオブジェクトのデシリアライズ', () => {
    const originalBuffer = Buffer.from('test');
    const json = JSON.stringify({
      buffer: {
        type: 'Buffer',
        hex: originalBuffer.toString('hex'),
      },
    });

    const result = serializer.deserializeObject(json) as Record<
      string,
      Buffer
    >;

    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.toString()).toBe('test');
  });

  /**
   * 正常系: RegExp オブジェクトのデシリアライズ
   */
  it('正常系: RegExp オブジェクトのデシリアライズ', () => {
    const json = JSON.stringify({
      pattern: {
        type: 'RegExp',
        source: '^test',
        flags: 'gi',
        label: 'testPattern',
      },
    });

    const result = serializer.deserializeObject(json) as Record<
      string,
      RegExp
    >;

    expect(result.pattern).toBeInstanceOf(RegExp);
    expect(result.pattern.source).toBe('^test');
    expect(result.pattern.flags).toBe('gi');
  });

  /**
   * 正常系: Secret オブジェクトのデシリアライズ
   */
  it('正常系: Secret オブジェクトのデシリアライズ', () => {
    const jsCode = `
      module.exports = {
        secret: new Secret({ password: 'mysecret' })
      };
    `;
    const serialized = serializer.serializeObject(jsCode) as Record<
      string,
      Record<string, unknown>
    >;
    const json = JSON.stringify(serialized);

    const result = serializer.deserializeObject(json) as Record<
      string,
      unknown
    >;

    expect(result.secret).toEqual({ password: 'mysecret' });
  });

  /**
   * 異常系: JavaScriptコードのシリアライズ（構文エラー）
   */
  it('異常系: JavaScriptコードのシリアライズ（構文エラー）', () => {
    const invalidCode = 'module.exports = { invalid: ';

    expect(() => {
      serializer.serializeObject(invalidCode);
    }).toThrow('シリアライズエラー');
  });
});
