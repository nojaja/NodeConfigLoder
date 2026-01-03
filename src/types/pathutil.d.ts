/**
 * pathutil モジュール型定義
 * @summary @nojaja/pathutil パッケージのTypeScript型定義
 */

declare module '@nojaja/pathutil' {
  interface PathUtil {
    normalizeSeparator(path: string): string;
    absolutePath(path: string): string;
  }

  const PathUtil: PathUtil;
  export default PathUtil;
}
