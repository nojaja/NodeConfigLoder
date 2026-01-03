/**
 * 処理名: FindDifferences ユニットテスト
 *
 * 処理概要:
 * FindDifferencesクラスの差分検出機能をテストする
 *
 * 実装理由:
 * ハッシュツリーベースの差分検出アルゴリズムが正しく動作することを検証するため
 */

import { FindDifferences } from '../../../src/configloder/FindDifferences';

describe('FindDifferences', () => {
  let finder: FindDifferences;

  beforeEach(() => {
    finder = new FindDifferences();
  });

  /**
   * 正常系: 初期化
   */
  it('正常系: 初期化', () => {
    const data = { key: 'value' };
    const tree = finder.initialize(data);

    expect(tree).toBeDefined();
    expect(tree.__hash).toBeDefined();
  });

  /**
   * 正常系: 差分検出（値の追加）
   */
  it('正常系: 差分検出（値の追加）', (done) => {
    const initialData = { key: 'value' };
    finder.initialize(initialData);

    const diffHandler = (diff: { type: string; path: string }) => {
      expect(diff.type).toBe('added');
      expect(diff.path).toBe('newKey');
      finder.removeListener('difference', diffHandler);
      done();
    };

    finder.on('difference', diffHandler);

    const newData = { key: 'value', newKey: 'newValue' };
    finder.detectChanges(newData);
  });

  /**
   * 正常系: 差分検出（値の削除）
   */
  it('正常系: 差分検出（値の削除）', (done) => {
    const initialData = { key: 'value', removeMe: 'data' };
    finder.initialize(initialData);

    const diffHandler = (diff: { type: string; path: string }) => {
      if (diff.type === 'removed' && diff.path === 'removeMe') {
        finder.removeListener('difference', diffHandler);
        done();
      }
    };

    finder.on('difference', diffHandler);

    const newData = { key: 'value' };
    finder.detectChanges(newData);
  });

  /**
   * 正常系: 差分検出（値の更新）
   */
  it('正常系: 差分検出（値の更新）', (done) => {
    const initialData = { key: 'oldValue' };
    finder.initialize(initialData);

    const diffHandler = (diff: { type: string; path: string }) => {
      if (diff.type === 'modified' && diff.path === 'key') {
        finder.removeListener('difference', diffHandler);
        done();
      }
    };

    finder.on('difference', diffHandler);

    const newData = { key: 'newValue' };
    finder.detectChanges(newData);
  });

  /**
   * 正常系: 差分検出（変更なし）
   */
  it('正常系: 差分検出（変更なし）', (done) => {
    const initialData = { key: 'value' };
    finder.initialize(initialData);

    const diffHandler = () => {
      finder.removeListener('difference', diffHandler);
      done.fail('差分イベントが発生してはいけない');
    };

    finder.on('difference', diffHandler);

    const sameData = { key: 'value' };
    finder.detectChanges(sameData);

    // 少し遅延させて確認
    setTimeout(() => {
      finder.removeListener('difference', diffHandler);
      done();
    }, 100);
  });

  /**
   * 正常系: ネストされたオブジェクトの差分検出
   */
  it('正常系: ネストされたオブジェクトの差分検出', (done) => {
    const initialData = { nested: { key: 'value' } };
    finder.initialize(initialData);

    const diffHandler = (diff: { type: string; path: string }) => {
      if (diff.type === 'modified' && diff.path === 'nested.key') {
        finder.removeListener('difference', diffHandler);
        done();
      }
    };

    finder.on('difference', diffHandler);

    const newData = { nested: { key: 'newValue' } };
    finder.detectChanges(newData);
  });

  /**
   * 正常系: 配列の差分検出（トップレベル置換）
   */
  it('正常系: 配列の差分検出（トップレベル置換）', () => {
    const initialData = { items: [1, 2, 3] };
    const tree = finder.initialize(initialData);

    expect(tree).toBeDefined();
    expect(tree.__hash).toBeDefined();

    // 同じ内容なので差分なし
    const tree2 = finder.detectChanges(initialData);
    expect(tree2.__hash).toBe(tree.__hash);
  });
});
