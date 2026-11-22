import { defaultGo2Joints } from '../robots/go2Joints';
import type { SceneConfig } from '../state/types';

export function defaultScene(): SceneConfig {
  return {
    version: 2,
    robot: { model: 'go2', pose: { x: 0, y: 0, z: 0.32, roll: 0, pitch: 0, yaw: 0 }, jointAngles: defaultGo2Joints() },
    camera: {
      model: 'D435',
      pose: { x: 0.322, y: 0, z: 0.071, roll: 0, pitch: 30, yaw: 0 },
      depthProfile: '848x480',
      rgbProfile: '1280x720',
      minDepth: 0.30,
      maxDepth: 3.00,
    },
    terrain: {
      type: 'stairs',
      x: 0.87, y: 0, z: 0, yaw: 0, difficulty: 0.60, seed: 42,
      settings: {
        flat: { length: 16, width: 12, grid: 0.25 },
        stairs: { count: 4, minRise: 0.05, maxRise: 0.15, run: 0.22, platformWidth: 0.72, borderWidth: 0.12 },
        stones: {
          rows: 7, columns: 5, minSize: 0.16, maxSize: 0.29, gap: 0.09, height: 0.10,
          heightVariation: 0.06, pitDepth: 0.42, platformWidth: 0.46, borderWidth: 0.16,
        },
        platform: { length: 1.3, width: 1.1, height: 0.48 },
      },
    },
  };
}
