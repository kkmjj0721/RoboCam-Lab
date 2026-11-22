import type { StreamProfile } from '../camera/profiles';
import { readNumber } from '../io/config';
import type { Field } from '../state/fields';
import type { SceneStore } from '../state/store';
import type { SceneConfig } from '../state/types';

type Accessors<T> = {
  get: (config: SceneConfig) => T;
  set: (config: SceneConfig, value: T) => SceneConfig;
};

export function bindNumberInput(
  input: HTMLInputElement, slider: HTMLInputElement | null, field: Field,
  store: SceneStore, notify: (message: string) => void, { get, set }: Accessors<number>,
) {
  input.min = String(field.min);
  input.max = String(field.max);
  const precision = field.step === 0.001 ? 3 : field.step < 1 ? 2 : 0;

  function sync(config: SceneConfig) {
    const value = get(config);
    input.value = precision === 0 ? String(Number(value.toFixed(2))) : value.toFixed(precision);
    if (slider !== null) {
      slider.value = String(value);
      slider.style.setProperty('--progress', `${100 * (value - field.min) / (field.max - field.min)}%`);
    }
  }

  function commit(value: number) {
    const config = store.get();
    let next: SceneConfig;
    try {
      const normalized = readNumber(value, field);
      if (get(config) === normalized) return;
      next = set(config, normalized);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      sync(config);
      return;
    }
    store.replace(next);
  }

  input.addEventListener('change', () => commit(input.valueAsNumber));
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(input.valueAsNumber);
    }
  });
  if (slider !== null) slider.addEventListener('input', () => commit(slider.valueAsNumber));
  return sync;
}

export function bindProfileSelect<K extends 'depthProfile' | 'rgbProfile'>(
  select: HTMLSelectElement, store: SceneStore, key: K, ids: readonly SceneConfig['camera'][K][],
  profiles: Record<SceneConfig['camera'][K], StreamProfile>,
) {
  for (const id of ids) {
    const { width, height, fps } = profiles[id];
    const resolution = `${width} × ${height}`;
    select.add(new Option(key === 'rgbProfile' ? `${resolution} · ${fps} FPS` : resolution, id));
  }
  select.addEventListener('change', () => {
    const id = ids.find(candidate => candidate === select.value);
    if (id === undefined) throw new Error('Invalid stream profile selection.');
    const config = store.get();
    store.replace({ ...config, camera: { ...config.camera, [key]: id } });
  });
  return (config: SceneConfig) => { select.value = config.camera[key]; };
}
