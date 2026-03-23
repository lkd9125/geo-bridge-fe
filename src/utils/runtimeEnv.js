/**
 * 실행 환경 판별 (웹 vs 로컬 file / 일부 Electron 패키징)
 *
 * 주의: `file://`에서 `window.location.href = '/'` 같은 절대 경로 이동은
 * OS에 따라 `file:///C:/` 처럼 드라이브 루트로 열리며 Electron이 실패할 수 있음.
 * 화면 전환은 항상 React Router(`navigate`, `<Link>`, `<Navigate>`)만 사용할 것.
 */

export function isFileProtocol() {
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
}

/**
 * Preload에서 `window.geoBridge = { isElectron: true }` 등을 노출한 뒤,
 * Electron이 http(s)로 띄워도 HashRouter가 필요하면 여기에 조건을 추가하면 됨.
 */
export function prefersHashRouter() {
  if (isFileProtocol()) return true;
  if (typeof window !== 'undefined' && window.geoBridge?.isElectron === true) {
    return Boolean(window.geoBridge?.useHashRouter);
  }
  return false;
}
