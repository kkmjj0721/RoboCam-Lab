import { GO2_JOINTS, GO2_JOINT_LABELS, GO2_LEG_LABELS } from '../robots/go2Joints';
import type { Go2JointName } from '../robots/go2Joints';
import type { Pose, TerrainConfig, TerrainSettings } from './types';

export type Field = {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  axis?: string;
};

const length = (label: string, min: number, max: number, step = 0.01): Field => ({ label, min, max, step, unit: 'm' });
const count = (label: string, min: number, max: number): Field => ({ label, min, max, step: 1, unit: '' });
const angle = (label: string, axis: string): Field => ({ label, min: -180, max: 180, step: 1, unit: '°', axis });

const rotation = {
  roll: angle('Roll', 'x'),
  pitch: angle('Pitch', 'y'),
  yaw: angle('Yaw', 'z'),
};

export const CAMERA_FIELDS: Record<keyof Pose, Field> = {
  x: { ...length('X', -2, 2, 0.001), axis: 'x' },
  y: { ...length('Y', -2, 2, 0.001), axis: 'y' },
  z: { ...length('Z', -2, 2, 0.001), axis: 'z' },
  ...rotation,
};

export const ROBOT_FIELDS: Record<keyof Pose, Field> = {
  x: { ...length('X', -8, 8), axis: 'x' },
  y: { ...length('Y', -8, 8), axis: 'y' },
  z: { ...length('机身高度', 0, 3), axis: 'z' },
  ...rotation,
};

export const GO2_FIELDS = Object.fromEntries(GO2_JOINTS.map(joint => [joint.name, {
  label: `${GO2_LEG_LABELS[joint.leg]}${GO2_JOINT_LABELS[joint.type]}`, min: joint.min, max: joint.max, step: 0.01, unit: 'rad',
}])) as Record<Go2JointName, Field>;

export const TERRAIN_POSE_FIELDS: Record<keyof Pick<TerrainConfig, 'x' | 'y' | 'z' | 'yaw'>, Field> = {
  x: { ...length('X', -8, 8), axis: 'x' },
  y: { ...length('Y', -8, 8), axis: 'y' },
  z: { ...length('Z', -1, 3), axis: 'z' },
  yaw: angle('Yaw', 'z'),
};

export const TERRAIN_GENERATION_FIELDS = {
  difficulty: { label: '难度', min: 0, max: 1, step: 0.01, unit: '' },
  seed: count('随机种子', 0, 4_294_967_295),
};

export const TERRAIN_FIELDS: { [K in keyof TerrainSettings]: Record<keyof TerrainSettings[K], Field> } = {
  flat: { length: length('场地长度', 1, 24), width: length('场地宽度', 1, 24), grid: length('网格间距', 0.1, 2) },
  stairs: {
    count: count('侧面级数', 1, 12), run: length('踏步深度', 0.10, 0.75), platformWidth: length('顶平台宽', 0.25, 4),
    borderWidth: length('外沿宽度', 0, 2), minRise: length('最小级高', 0, 0.38), maxRise: length('最大级高', 0, 0.38),
  },
  stones: {
    rows: count('行数', 1, 10), columns: count('列数', 1, 8), minSize: length('最小边长', 0.05, 0.8),
    maxSize: length('最大边长', 0.05, 0.8), gap: length('基准间隙', 0.02, 1.5), height: length('桩顶高度', 0.03, 1.5),
    heightVariation: length('高度波动', 0, 0.5), pitDepth: length('凹坑深度', 0.10, 3),
    platformWidth: length('中心台宽', 0.1, 3), borderWidth: length('外沿宽度', 0.03, 1.5),
  },
  platform: { length: length('平台长度', 0.25, 5), width: length('平台宽度', 0.25, 5), height: length('平台高度', 0.08, 2) },
};

export const DEPTH_RANGE_FIELDS = {
  minDepth: length('最小深度', 0.05, 19.99),
  maxDepth: length('最大深度', 0.06, 20),
};
