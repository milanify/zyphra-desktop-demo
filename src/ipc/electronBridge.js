export function hasElectronAPI() {
  return typeof window !== "undefined" && !!window.electronAPI;
}

export function getElectronAPI() {
  if (!hasElectronAPI()) return null;
  return window.electronAPI;
}

