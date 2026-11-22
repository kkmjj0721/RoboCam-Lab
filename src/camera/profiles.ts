import type { PerspectiveCamera } from 'three';
import type { DepthProfileId, RgbProfileId } from '../state/types';

export type StreamProfile = {
  width: number;
  height: number;
  fps: number;
  hfov: number;
  vfov: number;
};

export const DEPTH_PROFILES: Record<DepthProfileId, StreamProfile> = {
  '848x480': { width: 848, height: 480, fps: 30, hfov: 87, vfov: 58 },
  '640x480': { width: 640, height: 480, fps: 30, hfov: 75, vfov: 62 },
  '1280x720': { width: 1280, height: 720, fps: 30, hfov: 87, vfov: 58 },
};

export const RGB_PROFILES: Record<RgbProfileId, StreamProfile> = {
  '1280x720': { width: 1280, height: 720, fps: 30, hfov: 69, vfov: 42 },
  '1920x1080': { width: 1920, height: 1080, fps: 30, hfov: 69, vfov: 42 },
};

export const RENDER_NEAR = 0.01;
export const RENDER_FAR = 30;

export function halfFovTangent(degrees: number) {
  return Math.tan(degrees * Math.PI / 360);
}

export function intrinsics(profile: StreamProfile) {
  return {
    fx: profile.width / (2 * halfFovTangent(profile.hfov)),
    fy: profile.height / (2 * halfFovTangent(profile.vfov)),
    cx: (profile.width - 1) / 2,
    cy: (profile.height - 1) / 2,
  };
}

export function applyProjection(camera: PerspectiveCamera, profile: StreamProfile) {
  camera.aspect = profile.width / profile.height;
  camera.fov = profile.vfov;
  camera.near = RENDER_NEAR;
  camera.far = RENDER_FAR;
  const halfWidth = camera.near * halfFovTangent(profile.hfov);
  const halfHeight = camera.near * halfFovTangent(profile.vfov);
  camera.projectionMatrix.makePerspective(-halfWidth, halfWidth, halfHeight, -halfHeight, camera.near, camera.far, camera.coordinateSystem);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
