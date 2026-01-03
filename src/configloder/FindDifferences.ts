import { EventEmitter } from 'events';
import * as crypto from 'crypto';

/**
 * ハッシュツリーのノード型
 */
interface HashTreeNode {
  __hash: string;
  [key: string]: unknown;
}

/**
 * 差分イベントの型
 */
interface DifferenceEvent {
  type: 'added' | 'removed' | 'modified';
  path: string;
}

/**
 * 処理名: 差分検出エンジン
 *
 * 処理概要:
 * ハッシュツリーを使用して2つのJSON構造の差分を効率的に検出する。
 * EventEmitterを継承し、差分を'difference'イベントで通知
 *
 * 実装理由:
 * 大規模な設定ファイルの変更検出において、全体比較ではなく
 * ハッシュツリーの活用で計算量を最小化するため
 */
export class FindDifferences extends EventEmitter {
  private previousHashTree: HashTreeNode;

  /**
   * 処理名: コンストラクタ
   *
   * 処理概要:
   * FindDifferencesインスタンスを初期化し、前回のハッシュツリーを空の状態で保持
   *
   * 実装理由:
   * EventEmitterの初期化と、差分検出のための状態を保持するため
   */
  constructor() {
    super();
    this.previousHashTree = { __hash: '' };
  }

  /**
   * 処理名: ハッシュ値計算
   *
   * 処理概要:
   * 与えられた値のSHA256ハッシュを計算する
   *
   * 実装理由:
   * オブジェクトの内容をコンパクトに表現し、変更検出の基盤とするため
   * @param {string} value ハッシュ対象の値
   * @returns {string} ハッシュ文字列
   * @private
   */
  private calculateHash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * 処理名: ハッシュツリー構築
   *
   * 処理概要:
   * JSONデータから再帰的にハッシュツリーを構築する。
   * 各ノードには__hashキーで当該ノード以下の変更を示すハッシュを保持
   *
   * 実装理由:
   * 差分検出時に__hashの比較だけで下層の探索を短縮するため
   * @param {unknown} data 構築対象のデータ
   * @returns {HashTreeNode} ハッシュツリー
   * @private
   */
  private buildHashTree(data: unknown): HashTreeNode {
    if (typeof data !== 'object' || data === null) {
      // プリミティブ値の場合、そのままハッシュ化
      return {
        __hash: this.calculateHash(JSON.stringify(data)),
      };
    }

    if (Array.isArray(data)) {
      // 配列の場合、各要素のハッシュ値を結合してハッシュ化
      const childHashes = data.map((item) => this.buildHashTree(item));
      const combinedHash = this.calculateHash(childHashes.map((h) => h.__hash).join(''));
      return {
        __hash: combinedHash,
        ...Object.fromEntries(childHashes.map((h, i) => [i.toString(), h])),
      } as HashTreeNode;
    }

    if (typeof data === 'object' && (data as Record<string, unknown>).type) {
      // type値を持っているobjectの場合、そのままハッシュ化
      return {
        __hash: this.calculateHash(JSON.stringify(data)),
      };
    }

    // オブジェクトの場合、キーと値をソートしてハッシュ化
    const childHashes = Object.keys(data)
      .sort()
      .reduce((tree: Record<string, HashTreeNode>, key) => {
        tree[key] = this.buildHashTree((data as Record<string, unknown>)[key]);
        return tree;
      }, {});

    const combinedHash = this.calculateHash(
      Object.entries(childHashes)
        .map(([key, value]) => `${key}:${value.__hash}`)
        .join('')
    );
    return { __hash: combinedHash, ...childHashes };
  }

  /**
   * 処理名: 削除・更新キーの処理
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {Record<string, unknown>} jsonData JSON データ
   * @param {string} path パス
   * @returns {void}
   * @private
   */
  private processExistingKeys(
    hashTree: HashTreeNode,
    jsonData: Record<string, unknown>,
    path: string
  ): void {
    for (const key in hashTree) {
      if (key === '__hash') continue;
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in jsonData)) {
        this.emit('difference', {
          type: 'removed',
          path: currentPath,
        } as DifferenceEvent);
        delete hashTree[key];
      } else {
        this.processKeyValue(hashTree, jsonData, key, currentPath);
      }
    }
  }

  /**
   * 処理名: キー値の処理
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {Record<string, unknown>} jsonData JSON データ
   * @param {string} key キー
   * @param {string} currentPath 現在のパス
   * @returns {void}
   * @private
   */
  private processKeyValue(
    hashTree: HashTreeNode,
    jsonData: Record<string, unknown>,
    key: string,
    currentPath: string
  ): void {
    const jsonValue = jsonData[key];
    if (typeof jsonValue === 'object' && jsonValue !== null) {
      this.processObjectValue(hashTree, jsonValue as Record<string, unknown>, key, currentPath);
    } else {
      this.processPrimitiveValue(hashTree, jsonValue, key, currentPath);
    }
  }

  /**
   * 処理名: オブジェクト値の処理
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {Record<string, unknown>} jsonValue JSON 値
   * @param {string} key キー
   * @param {string} currentPath 現在のパス
   * @returns {void}
   * @private
   */
  private processObjectValue(
    hashTree: HashTreeNode,
    jsonValue: Record<string, unknown>,
    key: string,
    currentPath: string
  ): void {
    if (jsonValue.type) {
      const newPrimitiveHash = this.calculateHash(JSON.stringify(jsonValue));
      if ((hashTree[key] as HashTreeNode).__hash !== newPrimitiveHash) {
        this.emit('difference', {
          type: 'modified',
          path: currentPath,
        } as DifferenceEvent);
        (hashTree[key] as HashTreeNode).__hash = newPrimitiveHash;
      }
    } else {
      if (!hashTree[key] || typeof hashTree[key] !== 'object') {
        hashTree[key] = { __hash: '' };
      }
      this.findDifferencesAndUpdate(
        hashTree[key] as HashTreeNode,
        jsonValue,
        currentPath
      );
    }
  }

  /**
   * 処理名: プリミティブ値の処理
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {unknown} jsonValue JSON 値
   * @param {string} key キー
   * @param {string} currentPath 現在のパス
   * @returns {void}
   * @private
   */
  private processPrimitiveValue(
    hashTree: HashTreeNode,
    jsonValue: unknown,
    key: string,
    currentPath: string
  ): void {
    const newPrimitiveHash = this.calculateHash(JSON.stringify(jsonValue));
    if ((hashTree[key] as HashTreeNode).__hash !== newPrimitiveHash) {
      this.emit('difference', {
        type: 'modified',
        path: currentPath,
      } as DifferenceEvent);
      (hashTree[key] as HashTreeNode).__hash = newPrimitiveHash;
    }
  }

  /**
   * 処理名: 追加されたキーの処理
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {Record<string, unknown>} jsonData JSON データ
   * @param {string} path パス
   * @returns {void}
   * @private
   */
  private processAddedKeys(
    hashTree: HashTreeNode,
    jsonData: Record<string, unknown>,
    path: string
  ): void {
    for (const key in jsonData) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in hashTree)) {
        this.emit('difference', {
          type: 'added',
          path: currentPath,
        } as DifferenceEvent);
        const jsonValue = jsonData[key];
        hashTree[key] =
          typeof jsonValue === 'object' && jsonValue !== null
            ? this.buildHashTree(jsonValue)
            : { __hash: this.calculateHash(JSON.stringify(jsonValue)) };
      }
    }
  }

  /**
   * 処理名: 差分検出と更新
   *
   * 処理概要:
   * 前回のハッシュツリーと新しいJSONデータを比較し、
   * 追加・削除・更新されたパスを'difference'イベントで通知
   *
   * 実装理由:
   * ハッシュ値の比較で不要な再帰を避け、変更箇所のみを検出するため
   * @param {HashTreeNode} hashTree ハッシュツリー
   * @param {unknown} jsonData JSON データ
   * @param {string} path パス
   * @returns {void}
   * @private
   */
  private findDifferencesAndUpdate(
    hashTree: HashTreeNode,
    jsonData: unknown,
    path = ''
  ): void {
    const newHash = this.calculateHash(JSON.stringify(jsonData));
    if (hashTree.__hash === newHash) {
      return;
    }

    const data = jsonData as Record<string, unknown>;
    this.processExistingKeys(hashTree, data, path);
    this.processAddedKeys(hashTree, data, path);

    (hashTree as Record<string, unknown>).__hash = this.calculateHash(
      Object.entries(hashTree)
        .filter(([key]) => key !== '__hash')
        .map(([key, value]) => `${key}:${(value as HashTreeNode).__hash}`)
        .join('')
    );
  }

  /**
   * 処理名: ハッシュツリー初期化
   *
   * 処理概要:
   * 初回読み込み時にハッシュツリーを構築し、前回状態として保持
   *
   * 実装理由:
   * 次回の差分検出の基準となるベースラインを作成するため
   * @param {unknown} jsonData 初回のJSONデータ
   * @returns {HashTreeNode} 構築されたハッシュツリー
   */
  initialize(jsonData: unknown): HashTreeNode {
    return (this.previousHashTree = this.buildHashTree(jsonData)); // 初期ハッシュツリー構築
  }

  /**
   * 処理名: 差分検出
   *
   * 処理概要:
   * 新しいJSONデータと前回のハッシュツリーを比較し、
   * 差分を検出して'difference'イベントで通知。
   * 内部的にハッシュツリーを更新して次回検出に備える
   *
   * 実装理由:
   * ファイル監視やリアルタイム変更検出のため、継続的に差分を検出するため
   * @param {unknown} jsonData 新しいJSONデータ
   * @returns {HashTreeNode} 更新上のハッシュツリー
   */
  detectChanges(jsonData: unknown): HashTreeNode {
    this.findDifferencesAndUpdate(this.previousHashTree, jsonData);
    return this.previousHashTree;
  }
}

export default FindDifferences;
