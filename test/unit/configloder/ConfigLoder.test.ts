/**
 * 処理名: ConfigLoder ユニットテスト
 *
 * 処理概要:
 * ConfigLoderクラスの各メソッドをテストする
 *
 * 実装理由:
 * ファイル読み込み・書き込み・フォーマット変換の機能を検証するため
 */

import { ConfigLoder } from '../../../src/configloder/ConfigLoder';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigLoder', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configloder-'));
  });

  afterEach(() => {
    // クリーンアップ
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * 正常系: JSON設定ファイルの読み込み
   */
  it('正常系: JSON設定ファイルの読み込み', () => {
    const testData = { key: 'value', nested: { foo: 'bar' } };
    const jsonPath = path.join(tempDir, 'test.json');
    fs.writeFileSync(jsonPath, JSON.stringify(testData));

    const loader = new ConfigLoder();
    const content = loader.readConfigSync(jsonPath);
    const parsed = JSON.parse(content);

    expect(parsed.key).toBe('value');
    expect(parsed.nested.foo).toBe('bar');
  });

  /**
   * 異常系: 存在しないファイルの読み込み
   */
  it('異常系: 存在しないファイルの読み込み', () => {
    const loader = new ConfigLoder();
    const nonExistentPath = path.join(tempDir, 'nonexistent.json');

    expect(() => {
      loader.readConfigSync(nonExistentPath);
    }).toThrow('no such list file');
  });

  /**
   * 正常系: JSON形式への変換
   */
  it('正常系: JSON形式への変換', () => {
    const loader = new ConfigLoder();
    const testObj = { key: 'value', arr: [1, 2, 3] };

    const jsonText = loader.toJsonText(testObj);
    const parsed = JSON.parse(jsonText);

    expect(parsed.key).toBe('value');
    expect(parsed.arr).toEqual([1, 2, 3]);
  });

  /**
   * 正常系: 設定ファイルの書き込み（JSON）
   */
  it('正常系: 設定ファイルの書き込み（JSON）', () => {
    const loader = new ConfigLoder();
    const testData = { setting: 'test', value: 123 };
    const outputPath = path.join(tempDir, 'output.json');

    loader.writeConfigSync(outputPath, testData);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.setting).toBe('test');
    expect(parsed.value).toBe(123);
  });

  /**
   * 正常系: リスト形式ファイルの読み込み
   */
  it('正常系: リスト形式ファイルの読み込み', () => {
    const listPath = path.join(tempDir, 'list.txt');
    fs.writeFileSync(listPath, 'line1\nline2\nline3');

    const loader = new ConfigLoder();
    const lines = loader.readListSync(listPath);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('line1');
    expect(lines[2]).toBe('line3');
  });

  /**
   * 正常系: YAML形式への変換
   */
  it('正常系: YAML形式への変換', () => {
    const loader = new ConfigLoder();
    const testObj = { key: 'value', nested: { foo: 'bar' } };

    const yamlText = loader.toYamlText(testObj);

    expect(typeof yamlText).toBe('string');
    expect(yamlText).toContain('key');
    expect(yamlText).toContain('value');
  });

  /**
   * 正常系: 設定ファイルの書き込み（YAML）
   */
  it('正常系: 設定ファイルの書き込み（YAML）', () => {
    const loader = new ConfigLoder();
    const testData = { setting: 'test', value: 123 };
    const outputPath = path.join(tempDir, 'output.yaml');

    loader.writeConfigSync(outputPath, testData);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('setting');
    expect(content).toContain('test');
  });

  /**
   * 正常系: YAML設定ファイルの読み込み
   */
  it('正常系: YAML設定ファイルの読み込み', () => {
    const yamlPath = path.join(tempDir, 'test.yaml');
    const yamlContent = 'key: value\nnested:\n  foo: bar';
    fs.writeFileSync(yamlPath, yamlContent);

    const loader = new ConfigLoder();
    const content = loader.readConfigSync(yamlPath);
    const parsed = JSON.parse(content);

    expect(parsed.key).toBe('value');
    expect(parsed.nested.foo).toBe('bar');
  });

  /**
   * 異常系: リスト読み込み（存在しないファイル）
   */
  it('異常系: リスト読み込み（存在しないファイル）', () => {
    const loader = new ConfigLoder();
    const nonExistentPath = path.join(tempDir, 'nonexistent.txt');

    expect(() => {
      loader.readListSync(nonExistentPath);
    }).toThrow();
  });
});
