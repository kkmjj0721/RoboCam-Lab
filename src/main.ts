import { parseConfig } from './io/config';
import { downloadConfig, restoreLocal, restoreShared, saveLocal, shareUrl } from './io/persistence';
import { defaultScene } from './presets/defaultScene';
import { loadGo2 } from './robots/go2';
import { createWorkspace } from './scene/workspace';
import type { GizmoMode } from './scene/workspace';
import { createStore } from './state/store';
import type { TerrainType } from './state/types';
import { mountParameters } from './ui/parameters';
import { bindPreview } from './ui/preview';
import { element, mountShell } from './ui/shell';
import './styles.css';

mountShell(element('app'));

const toast = element('toast');
let toastTimeout = 0;
function notify(message: string) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 4500);
}

function initialConfig() {
  try {
    const shared = restoreShared(location.hash);
    if (shared !== null) return shared;
  } catch (error) {
    notify(`无法打开分享场景。${error instanceof Error ? error.message : ''}`);
  }
  try {
    return restoreLocal() ?? defaultScene();
  } catch {
    notify('无法读取本地配置，已载入默认场景。');
    return defaultScene();
  }
}

const store = createStore(initialConfig());
mountParameters(store, notify);
const bindDepthPicker = bindPreview(store, notify);

const canvas = element<HTMLCanvasElement>('webgl');
const fit = element<HTMLButtonElement>('fit');
const frustum = element<HTMLButtonElement>('frustum');
const modes = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const renderStatus = element('render-error');
renderStatus.textContent = '正在加载 Go2 模型…';
renderStatus.hidden = false;
try {
  const robot = await loadGo2();
  const workspace = createWorkspace({
    canvas, editor: element('editor'), rgb: element('rgb'), depth: element('depth'),
  }, store, robot);
  renderStatus.hidden = true;
  bindDepthPicker(workspace);
  fit.addEventListener('click', workspace.resetView);
  frustum.addEventListener('click', () => {
    const visible = frustum.getAttribute('aria-pressed') !== 'true';
    frustum.setAttribute('aria-pressed', String(visible));
    workspace.setFrustum(visible);
  });
  for (const button of modes) {
    button.addEventListener('click', () => {
      for (const entry of modes) entry.setAttribute('aria-pressed', String(entry === button));
      workspace.setGizmo(button.dataset.mode as GizmoMode);
    });
  }
} catch (error) {
  console.error('Go2 workspace initialization failed.', error);
  renderStatus.textContent = '无法加载 Go2 场景。请刷新页面，并确认浏览器支持 WebGL 2。';
  for (const button of [fit, frustum, ...modes, element<HTMLButtonElement>('depth')]) button.disabled = true;
}

const storageStatus = element('storage-status');
function save() {
  try {
    saveLocal(store.get());
    storageStatus.textContent = '配置保存在当前浏览器';
  } catch {
    storageStatus.textContent = '当前浏览器无法保存配置';
  }
}
save();
store.subscribe(save);
window.addEventListener('hashchange', () => {
  try {
    const config = restoreShared(location.hash);
    if (config !== null) store.replace(config);
  } catch (error) {
    notify(`无法打开分享场景。${error instanceof Error ? error.message : ''}`);
  }
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-terrain]')) {
  button.addEventListener('click', () => {
    const config = store.get();
    const type = button.dataset.terrain as TerrainType;
    if (type !== config.terrain.type) store.replace({ ...config, terrain: { ...config.terrain, type } });
  });
}

element('reset').addEventListener('click', () => {
  store.replace(defaultScene());
  history.replaceState(null, '', location.pathname + location.search);
  notify('已恢复默认场景。');
});
element('export').addEventListener('click', () => downloadConfig(store.get()));
const fileField = element<HTMLInputElement>('import-file');
element('import').addEventListener('click', () => fileField.click());
fileField.addEventListener('change', async () => {
  const file = fileField.files?.item(0);
  if (!file) return;
  fileField.value = '';
  try {
    if (file.size > 256 * 1024) throw new Error('场景配置文件不能超过 256 KB。');
    store.replace(parseConfig(await file.text()));
    history.replaceState(null, '', location.pathname + location.search);
    notify('已导入场景。');
  } catch (error) {
    notify(error instanceof Error ? error.message : String(error));
  }
});

element('share').addEventListener('click', async () => {
  const link = shareUrl(store.get());
  try {
    await navigator.clipboard.writeText(link);
    notify('分享链接已复制。');
  } catch {
    const dialog = element<HTMLDialogElement>('share-dialog');
    const input = element<HTMLInputElement>('share-url');
    input.value = link;
    dialog.showModal();
    input.select();
  }
});
