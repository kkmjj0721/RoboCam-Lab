export const GO2_LEGS = ['FL', 'FR', 'RL', 'RR'] as const;
export const GO2_JOINT_TYPES = ['hip', 'thigh', 'calf'] as const;

export type Go2Leg = typeof GO2_LEGS[number];
export type Go2JointType = typeof GO2_JOINT_TYPES[number];
export type Go2JointName = `${Go2Leg}_${Go2JointType}_joint`;
export type Go2JointAngles = Record<Go2JointName, number>;

export const GO2_LEG_LABELS: Record<Go2Leg, string> = { FL: '前左', FR: '前右', RL: '后左', RR: '后右' };
export const GO2_JOINT_LABELS: Record<Go2JointType, string> = { hip: '髋外展', thigh: '大腿', calf: '小腿' };

export const GO2_JOINTS = GO2_LEGS.flatMap(leg => GO2_JOINT_TYPES.map(type => {
  const name: Go2JointName = `${leg}_${type}_joint`;
  const frontLeg = leg === 'FL' || leg === 'FR';
  const leftLeg = leg === 'FL' || leg === 'RL';
  const range = {
    hip: [-1.0472, 1.0472],
    thigh: frontLeg ? [-1.5708, 3.4907] : [-0.5236, 4.5379],
    calf: [-2.7227, -0.83776],
  }[type];
  const initial = { hip: leftLeg ? -0.1 : 0.1, thigh: 0.9, calf: -1.8 }[type];
  return { name, leg, type, link: `${leg}_${type}`, min: range[0], max: range[1], initial };
}));

export function defaultGo2Joints(): Go2JointAngles {
  return Object.fromEntries(GO2_JOINTS.map(joint => [joint.name, joint.initial])) as Go2JointAngles;
}
