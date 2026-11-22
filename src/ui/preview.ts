import { DEPTH_PROFILES, RGB_PROFILES } from '../camera/profiles';
import { checkDepthRange } from '../io/config';
import { DEPTH_GRADIENT } from '../scene/sensorViews';
import type { Workspace } from '../scene/workspace';
import { DEPTH_RANGE_FIELDS } from '../state/fields';
import type { SceneStore } from '../state/store';
import { DEPTH_PROFILE_IDS } from '../state/types';
import type { SceneConfig } from '../state/types';
import { stairRise } from '../terrain/layout';
import { bindNumberInput, bindProfileSelect } from './inputs';
import { element, TERRAIN_NAMES } from './shell';

function describeTerrain(config: SceneConfig) {
  const { type, settings, difficulty, seed } = config.terrain;
  if (type === 'flat') return `${settings.flat.length} × ${settings.flat.width} m · 网格 ${settings.flat.grid} m`;
  if (type === 'stairs') return `四面 ${settings.stairs.count} 级 · 单级 ${stairRise(settings.stairs, difficulty).toFixed(3)} m`;
  if (type === 'stones') return `${settings.stones.rows} × ${settings.stones.columns} · 种子 ${seed}`;
  return `${settings.platform.length} × ${settings.platform.width} m · 高 ${settings.platform.height} m`;
}

export function bindPreview(store: SceneStore, notify: (message: string) => void) {
  const rgbPanel = element('rgb');
  const depthPanel = element<HTMLButtonElement>('depth');
  const marker = element('pixel-marker');
  const readout = element<HTMLOutputElement>('depth-readout');
  const terrainButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-terrain]')];
  const rgbMeta = { resolution: element('rgb-resolution'), fov: element('rgb-fov'), fps: element('rgb-fps') };
  const depthMeta = { fov: element('depth-fov'), fps: element('depth-fps') };
  const terrainName = element('terrain-name');
  const terrainSummary = element('terrain-summary');
  const far = element('depth-far');
  const near = element('depth-near');
  element('depth-gradient').style.background = DEPTH_GRADIENT;
  const syncProfile = bindProfileSelect(element<HTMLSelectElement>('depth-profile'), store, 'depthProfile', DEPTH_PROFILE_IDS, DEPTH_PROFILES);
  const depthFields = [['minDepth', 'depth-min'], ['maxDepth', 'depth-max']] as const;
  const syncDepthRange = depthFields.map(([name, id]) => {
    return bindNumberInput(element<HTMLInputElement>(id), null, DEPTH_RANGE_FIELDS[name], store, notify, {
      get: config => config.camera[name],
      set: (config, value) => {
        const camera = { ...config.camera, [name]: value };
        checkDepthRange(camera.minDepth, camera.maxDepth);
        return { ...config, camera };
      },
    });
  });

  const sync = (config: SceneConfig) => {
    const rgb = RGB_PROFILES[config.camera.rgbProfile];
    const depth = DEPTH_PROFILES[config.camera.depthProfile];
    rgbPanel.style.aspectRatio = `${rgb.width} / ${rgb.height}`;
    depthPanel.style.aspectRatio = `${depth.width} / ${depth.height}`;
    rgbMeta.resolution.textContent = `${rgb.width} × ${rgb.height}`;
    for (const [meta, profile] of [[rgbMeta, rgb], [depthMeta, depth]] as const) {
      meta.fov.textContent = `视场角 ${profile.hfov}° × ${profile.vfov}°`;
      meta.fps.textContent = `${profile.fps} FPS`;
    }
    syncProfile(config);
    for (const syncRange of syncDepthRange) syncRange(config);
    near.textContent = `${config.camera.minDepth.toFixed(2)} m`;
    far.textContent = `${config.camera.maxDepth.toFixed(2)} m`;
    terrainName.textContent = TERRAIN_NAMES[config.terrain.type];
    terrainSummary.textContent = describeTerrain(config);
    for (const button of terrainButtons) button.setAttribute('aria-pressed', String(button.dataset.terrain === config.terrain.type));
    marker.hidden = true;
    readout.value = '点击深度图读取光轴深度';
  };
  sync(store.get());
  store.subscribe(sync);

  return (workspace: Workspace) => {
    depthPanel.addEventListener('click', event => {
      const rect = depthPanel.getBoundingClientRect();
      const profile = DEPTH_PROFILES[store.get().camera.depthProfile];
      const u = event.detail === 0 ? 0.5 : (event.clientX - rect.left) / rect.width;
      const v = event.detail === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;
      const x = Math.floor(u * profile.width);
      const y = Math.floor(v * profile.height);
      if (x < 0 || y < 0 || x >= profile.width || y >= profile.height) return;
      const depth = workspace.sample(x, y);
      marker.style.left = `${depthPanel.offsetLeft + u * rect.width}px`;
      marker.style.top = `${depthPanel.offsetTop + v * rect.height}px`;
      marker.hidden = false;
      readout.value = depth === null ? `(${x}, ${y}) · 无效深度` : `(${x}, ${y}) · ${depth.toFixed(3)} m`;
    });
  };
}
