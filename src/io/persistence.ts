import { exportConfig, parseConfig } from './config';
import type { SceneConfig } from '../state/types';

const STORAGE_KEY = 'robocam-lab:scene:v2';
const LEGACY_STORAGE_KEY = 'robocam-lab:scene:v1';
const HASH_PREFIX = '#scene=';

export function restoreShared(hash: string) {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const payload = hash.slice(HASH_PREFIX.length);
  if (payload.length > 8192 || !/^[\w-]+$/.test(payload)) throw new Error('分享链接的场景编码无效。');
  return parseConfig(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
}

export function restoreLocal() {
  const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  return saved === null ? null : parseConfig(saved);
}

export function saveLocal(config: SceneConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function shareUrl(config: SceneConfig, href = location.href) {
  const url = new URL(href);
  url.hash = HASH_PREFIX + btoa(JSON.stringify(config)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return url.href;
}

export function downloadConfig(config: SceneConfig) {
  const url = URL.createObjectURL(new Blob([exportConfig(config)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'robocam-lab-scene.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
