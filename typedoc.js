/**
 * 処理名: TypeDoc 設定
 *
 * 処理概要:
 * TypeDocの設定ファイル。ソースコードからHTMLドキュメントを生成する設定
 *
 * 実装理由:
 * TypeScriptソースの型情報とJSDocコメントから自動的にドキュメントを生成するため
 */

module.exports = {
  entryPoints: ['src/configloder/ConfigLoder.ts', 'src/configloder/FindDifferences.ts', 'src/configloder/Serializer.ts', 'src/tools/index.ts'],
  out: './docs',
  exclude: ['**/*.test.ts'],
  excludeExternals: true,
  excludePrivate: true,
  theme: 'default',
  readme: 'README.md',
  name: 'NodeConfigLoder API Documentation',
  entryPointStrategy: 'expand',
};
