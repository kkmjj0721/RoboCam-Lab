import type { SceneConfig } from './types';

export function createStore(initial: SceneConfig) {
  let config = initial;
  const listeners = new Set<(next: SceneConfig, previous: SceneConfig) => void>();
  return {
    get: () => config,
    replace(next: SceneConfig) {
      const previous = config;
      config = next;
      for (const listener of listeners) listener(next, previous);
    },
    subscribe(listener: (next: SceneConfig, previous: SceneConfig) => void) {
      listeners.add(listener);
    },
  };
}

export type SceneStore = ReturnType<typeof createStore>;
