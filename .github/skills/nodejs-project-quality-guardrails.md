---
name: nodejs-project-quality-guardrails
description: Defines reusable quality assurance guardrails for Node.js/TypeScript projects, including testing coverage, linting, documentation, design principles, and CI gating. Use when generating or modifying project code to ensure consistent high quality.
license: MIT
compatibility: Designed for AI agents that support Agent Skills format (agentskills.io specification) and GitHub Copilot / Claude / Codex agents
metadata:
  author: nojaja
  version: "1.0.0"
allowed-tools: Read Write Bash
---

# Node.js/TypeScript プロジェクト 品質担保ガードレール Skill

このスキルは、Node.js（TypeScript）プロジェクトの品質担保のために
**一貫したテスト、静的解析、ドキュメント、設計ルール、CI 条件** を
AI エージェント（GitHub Copilot / Claude / OpenAI Codex）に理解させ、
**生成・修正・レビュー作業** に常に適用させることを目的とします。

## このスキルを使うべきタイミング

- 新規機能のコードを生成する際
- 既存コードをリファクタリングする際
- Unit テスト追加や修正書き換えを行う際
- CI 周りの構成や静的解析指摘を修正する際
- プロジェクト全体の品質ルールをエージェントに認識させたい場合
- 1 つのワークスペースに複数プロジェクトがある場合は、各プロジェクトごとに本スキルで示す構成（docs/typedoc-md、src、test/unit・e2e、.dependency-cruiser.js、eslint.config.cjs、jest.unit.config.js、jest.e2e.config.js、typedoc.js など）を持たせ、プロジェクト単位で適用・監査すること

---

## 品質担保ルール概観

### 1. 単体テスト
- Jest + ts-jest を利用する
- カバレッジを 80%以上 にする
- テスト対象は unit テストが主、E2E は補助的に扱う
- CI では `npm run test:ci` を定義し `jest --coverage` を実行する
- coverageThreshold で 80% 未満ならエラー扱いとし必ず失敗させる

### 2. ドキュメント生成
- typedoc + typedoc-plugin-markdown を使う
- Markdown 出力先: `docs/typedoc-md/`
- public API のみ対象

### 3. 静的解析
- ESLint（flat-config）
  - TypeScript, sonarjs, jsdoc 最小構成
- dependency-cruiser を使い依存関係ルールを強制

---

## 実装設計原則

### DI（Dependency Injection）
- DIコンテナは使わない
- 外部依存の差し替えは Jest のモック で対応

> ⚠ DI は避けるが、外部アクセス用ラッパーの差し替えは許容（DI コンテナを使わないという意味での「DI 回避」）

### 外部アクセス設計
- ファイルI/O や外部API は必ず ラッパー経由
- ラッパーはシングルトン & モック可能

### クラス設計とインスタンス管理
- SRP（単一責務）を最優先
- 共通基底クラスは乱用しない
- 明確な共有状態が必要な場合のみ Singleton を使用可
- Singleton は状態を限定し、テストで差し替え可能にする

### SOLID & フォルダ構成
- SRP, DIP を満たす設計
- フォルダ構成は責務が分かる形に

### コードライフサイクル
- フェールバックや後方互換・マイグレーションは考慮しない
- 不要になったコードは コメントアウトせず完全削除

### 使用言語
- TypeScript のみ
- 設定ファイル用途のみ `.js / .cjs` を許可
- 作業完了条件: `npm run test` と `npm run build` が成功していること

---

## 成果物として必須なもの

- 単体テスト（Jest + ts-jest）: カバレッジ 80%以上
- 静的解析: ESLint / dependency-cruiser
- API ドキュメント: typedoc → Markdown 出力

---

## プロジェクト構成（期待形）

```

プロジェクトフォルダ/
├─ docs/
│  └─ typedoc-md/              # typedoc Markdown 出力
├─ src/                        # 本体ソース
├─ test/
│  ├─ unit/                    # 単体テスト（Jest）
│  └─ e2e/                     # E2E テスト
├─ .dependency-cruiser.js      # dependency-cruiser 設定
├─ eslint.config.cjs           # ESLint flat-config
├─ jest.unit.config.js         # Jest unit 設定
├─ jest.e2e.config.js          # Jest E2E 設定
└─ typedoc.js                  # typedoc 設定

```

---

## テストカバレッジ & CI ゲート

- `npm run test:ci` で `jest --coverage` を実行し、coverage 80% 未満は失敗
- `npm run lint` で ESLint を実行し、エラーがあれば CI を失敗させる
- `npm run depcruise` の違反があれば CI を失敗させる

---

## CI/品質ゲート要件

1. `npm run test` が成功すること
2. `npm run lint` がエラーを出さないこと
3. `npm run depcruise` が違反なし
4. `npm run build` が成功しバンドル生成されること

---

## ESLint ルール / 必須条件

- Cognitive Complexity ≤ 10

```js
// eslint.config.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:sonarjs/recommended',
    'plugin:jsdoc/recommended'
  ],
  plugins: ['sonarjs', 'jsdoc'],
  rules: {
    'sonarjs/cognitive-complexity': ['error', 10],
    'no-unused-vars': ['warn'],
    'jsdoc/require-jsdoc': [
      'error',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true
        }
      }
    ],
    'jsdoc/require-param': 'error',
    'jsdoc/require-returns': 'error'
  }
};
```
- JSDoc コメント必須
- JSDoc 内で param / returns を記載

---

## typedoc / JSDoc ガイドライン

### JSDoc 必須記載項目
1. 処理名（短いタイトル）
2. 処理概要（何をするか）
3. 実装理由（設計判断）

### 記述方針
- すべて日本語で記載
- public / internal を問わず 全 function / method / class / interface に必須

```ts
/**
 * 処理名: タスク保存
 *
 * 処理概要: WebView から受け取ったタスク差分を永続化する
 *
 * 実装理由: ユーザーの編集内容を保存し再起動時に復元するため
 */
function saveTasks(...) {}
```

---

## dependency-cruiser ルール

- レイヤー間の不適切な依存を防止するため `.dependency-cruiser.js` を用意する
- 依存は interface / contract 経由のみ許可するなど、ルール違反時は CI で失敗させる

---

## テスト & 受け入れ基準

### テスト要件
- Unit Test: Jest。外部通信・I/O はすべてモック
- E2E Test: docker-compose で起動し Playwright を使用

### 機能受け入れ条件（例）
- 入力受入: 100 行の断片データをインポートし UI で編集可能
- 重複検出: サンプルデータで 80%以上の論理的重複を検出
- 分解提案: 10 件中 7 件以上で適切な分割候補を提示
- 状態抽出: 「ユーザー登録」マトリクスから主要状態遷移を自動生成
- コラボレーション: 複数ユーザーの同時編集を競合なくマージ可能

### 最終ゲート
- `npm run test` 成功
* `npm run lint` エラーなし
* `npm run build` 成功
* `dist/index.bundle.js` が生成されていること
