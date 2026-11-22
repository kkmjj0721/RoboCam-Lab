import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Pose } from '../state/types';

const RAD = Math.PI / 180;

export const DEPTH_ORIGIN = new Vector3(0.0106, 0.0175, 0.0125);
export const RGB_ORIGIN = new Vector3(0.0106, 0.0325, 0.0125);
export const OPTICAL_BASIS = new Matrix4().makeBasis(
  new Vector3(0, -1, 0), new Vector3(0, 0, -1), new Vector3(1, 0, 0),
);
export const RENDER_BASIS = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(
  new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(-1, 0, 0),
));

function rotation(pose: Pose): Euler {
  return new Euler(pose.roll * RAD, pose.pitch * RAD, pose.yaw * RAD, 'ZYX');
}

export function applyPose(object: Object3D, pose: Pose) {
  object.position.set(pose.x, pose.y, pose.z);
  object.rotation.copy(rotation(pose));
}

export function readPose(object: Object3D): Pose {
  const euler = new Euler().setFromQuaternion(object.quaternion, 'ZYX');
  return {
    x: object.position.x, y: object.position.y, z: object.position.z,
    roll: euler.x / RAD, pitch: euler.y / RAD, yaw: euler.z / RAD,
  };
}

export function opticalTransform(pose: Pose, origin: Vector3): Matrix4 {
  return new Matrix4()
    .makeRotationFromEuler(rotation(pose))
    .setPosition(pose.x, pose.y, pose.z)
    .multiply(new Matrix4().copy(OPTICAL_BASIS).setPosition(origin));
}
