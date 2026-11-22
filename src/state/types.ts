import type { Go2JointAngles } from '../robots/go2Joints';

export const TERRAIN_TYPES = ['flat', 'stairs', 'stones', 'platform'] as const;
export type TerrainType = typeof TERRAIN_TYPES[number];

export type Pose = {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
};

export type TerrainSettings = {
  flat: { length: number; width: number; grid: number };
  stairs: { count: number; minRise: number; maxRise: number; run: number; platformWidth: number; borderWidth: number };
  stones: {
    rows: number; columns: number; minSize: number; maxSize: number; gap: number; height: number;
    heightVariation: number; pitDepth: number; platformWidth: number; borderWidth: number;
  };
  platform: { length: number; width: number; height: number };
};

export type TerrainConfig = {
  type: TerrainType;
  x: number;
  y: number;
  z: number;
  yaw: number;
  difficulty: number;
  seed: number;
  settings: TerrainSettings;
};

export const DEPTH_PROFILE_IDS = ['848x480', '640x480', '1280x720'] as const;
export const RGB_PROFILE_IDS = ['1280x720', '1920x1080'] as const;
export type DepthProfileId = typeof DEPTH_PROFILE_IDS[number];
export type RgbProfileId = typeof RGB_PROFILE_IDS[number];

export type SceneConfig = {
  version: 2;
  robot: { model: 'go2'; pose: Pose; jointAngles: Go2JointAngles };
  camera: {
    model: 'D435';
    pose: Pose;
    depthProfile: DepthProfileId;
    rgbProfile: RgbProfileId;
    minDepth: number;
    maxDepth: number;
  };
  terrain: TerrainConfig;
};
