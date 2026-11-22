import { Quaternion, Vector3 } from 'three';
import { DEPTH_ORIGIN, opticalTransform, RGB_ORIGIN } from '../camera/frames';
import { DEPTH_PROFILES, intrinsics, RGB_PROFILES } from '../camera/profiles';
import { defaultScene } from '../presets/defaultScene';
import { CAMERA_FIELDS, DEPTH_RANGE_FIELDS, GO2_FIELDS, ROBOT_FIELDS, TERRAIN_FIELDS, TERRAIN_GENERATION_FIELDS, TERRAIN_POSE_FIELDS } from '../state/fields';
import type { Field } from '../state/fields';
import { DEPTH_PROFILE_IDS, RGB_PROFILE_IDS, TERRAIN_TYPES } from '../state/types';
import type { SceneConfig, TerrainSettings } from '../state/types';

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
  return value as Record<string, unknown>;
}

export function readNumber(value: unknown, field: Field): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) {
    throw new Error(`${field.label} 必须在 ${field.min} 到 ${field.max}${field.unit ? ` ${field.unit}` : ''}之间。`);
  }
  if (field.step === 1 && field.unit === '' && !Number.isInteger(value)) {
    throw new Error(`${field.label} 必须是整数。`);
  }
  return value;
}

export function checkDepthRange(min: number, max: number) {
  if (min >= max) throw new Error('最小深度必须小于最大深度。');
}

export function checkTerrainSettings(settings: TerrainSettings) {
  if (settings.stairs.minRise > settings.stairs.maxRise) throw new Error('最小级高不能大于最大级高。');
  const { minSize, maxSize, height, heightVariation, pitDepth } = settings.stones;
  if (minSize > maxSize) throw new Error('最小边长不能大于最大边长。');
  if (heightVariation >= height + pitDepth) throw new Error('桩顶高度波动必须小于桩顶高度与凹坑深度之和。');
}

function fields<K extends string>(value: unknown, label: string, schema: Record<K, Field>): Record<K, number> {
  const input = record(value, label);
  const keys = Object.keys(schema) as K[];
  return Object.fromEntries(keys.map(key => [key, readNumber(input[key], schema[key])])) as Record<K, number>;
}

function select<K extends string>(value: unknown, values: readonly K[], label: string): K {
  const match = values.find(option => option === value);
  if (match === undefined) throw new Error(`${label}不受支持。`);
  return match;
}

function upgradeVersionOne(root: Record<string, unknown>): Record<string, unknown> {
  const robot = record(root.robot, '机器人');
  if (robot.model !== 'quadruped') throw new Error('机器人型号不受支持。');
  const terrain = record(root.terrain, '地形');
  const settings = record(terrain.settings, '地形参数');
  const stairs = record(settings.stairs, '楼梯参数');
  const stones = record(settings.stones, '梅花桩参数');
  const defaults = defaultScene();
  const stoneSize = readNumber(stones.diameter, TERRAIN_FIELDS.stones.maxSize);
  const spacing = readNumber(stones.spacing, { label: '中心间距', min: 0.12, max: 1.5, step: 0.01, unit: 'm' });
  return {
    ...root,
    version: 2,
    robot: { ...robot, model: 'go2', jointAngles: defaults.robot.jointAngles },
    terrain: {
      ...terrain, difficulty: 1, seed: defaults.terrain.seed,
      settings: {
        ...settings,
        stairs: {
          ...defaults.terrain.settings.stairs, count: stairs.count, run: stairs.run,
          minRise: stairs.rise, maxRise: stairs.rise, platformWidth: stairs.width,
        },
        stones: {
          ...defaults.terrain.settings.stones, rows: stones.rows, columns: stones.columns, height: stones.height,
          minSize: stoneSize, maxSize: stoneSize, gap: Math.max(TERRAIN_FIELDS.stones.gap.min, spacing - stoneSize), heightVariation: 0,
        },
      },
    },
  };
}

export function decodeConfig(value: unknown): SceneConfig {
  const parsed = record(value, '场景配置');
  const root = parsed.version === 1 ? upgradeVersionOne(parsed) : parsed;
  if (root.version !== 2) throw new Error('场景配置版本不受支持。');
  const robot = record(root.robot, '机器人');
  const camera = record(root.camera, '相机');
  const terrain = record(root.terrain, '地形');
  const settings = record(terrain.settings, '地形参数');
  if (robot.model !== 'go2' || camera.model !== 'D435') throw new Error('机器人或相机型号不受支持。');
  const minDepth = readNumber(camera.minDepth, DEPTH_RANGE_FIELDS.minDepth);
  const maxDepth = readNumber(camera.maxDepth, DEPTH_RANGE_FIELDS.maxDepth);
  checkDepthRange(minDepth, maxDepth);
  const terrainSettings = {
    flat: fields(settings.flat, '平地参数', TERRAIN_FIELDS.flat),
    stairs: fields(settings.stairs, '楼梯参数', TERRAIN_FIELDS.stairs),
    stones: fields(settings.stones, '梅花桩参数', TERRAIN_FIELDS.stones),
    platform: fields(settings.platform, '高台参数', TERRAIN_FIELDS.platform),
  };
  checkTerrainSettings(terrainSettings);
  return {
    version: root.version,
    robot: { model: robot.model, pose: fields(robot.pose, '机身位姿', ROBOT_FIELDS), jointAngles: fields(robot.jointAngles, 'Go2 关节角', GO2_FIELDS) },
    camera: {
      model: camera.model, pose: fields(camera.pose, '相机位姿', CAMERA_FIELDS),
      depthProfile: select(camera.depthProfile, DEPTH_PROFILE_IDS, '深度档位'),
      rgbProfile: select(camera.rgbProfile, RGB_PROFILE_IDS, '彩色档位'),
      minDepth, maxDepth,
    },
    terrain: {
      type: select(terrain.type, TERRAIN_TYPES, '地形类型'),
      ...fields(terrain, '地形位姿', TERRAIN_POSE_FIELDS),
      ...fields(terrain, '地形生成参数', TERRAIN_GENERATION_FIELDS),
      settings: terrainSettings,
    },
  };
}

export function parseConfig(source: string): SceneConfig {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('文件内容不是有效的 JSON。');
  }
  return decodeConfig(value);
}

function transform(config: SceneConfig, origin: typeof DEPTH_ORIGIN, childFrame: string) {
  const matrix = opticalTransform(config.camera.pose, origin);
  return {
    parentFrame: 'base_link', childFrame,
    direction: 'optical_to_base',
    unit: 'm',
    translation: new Vector3().setFromMatrixPosition(matrix).toArray(),
    quaternionOrder: 'xyzw',
    quaternion: new Quaternion().setFromRotationMatrix(matrix).toArray(),
    storage: 'row_major',
    matrix: matrix.transpose().toArray(),
  };
}

export function exportConfig(config: SceneConfig) {
  const depth = DEPTH_PROFILES[config.camera.depthProfile];
  const rgb = RGB_PROFILES[config.camera.rgbProfile];
  return JSON.stringify({
    ...config,
    coordinates: {
      baseAxes: '+X forward, +Y left, +Z up',
      opticalAxes: '+X right, +Y down, +Z forward',
      mountFrame: 'd435_bottom_screw_frame',
      angles: 'degrees, Rz(yaw) Ry(pitch) Rx(roll)',
      jointAngleUnit: 'rad',
      lengthUnit: 'm',
    },
    transforms: {
      T_base_depth: transform(config, DEPTH_ORIGIN, 'd435_depth_optical_frame'),
      T_base_rgb: transform(config, RGB_ORIGIN, 'd435_color_optical_frame'),
    },
    sensorProfiles: {
      intrinsics: 'nominal_centered_pinhole',
      depth: { ...depth, ...intrinsics(depth), metric: 'optical_z_m' },
      rgb: { ...rgb, ...intrinsics(rgb) },
    },
  }, null, 2);
}
