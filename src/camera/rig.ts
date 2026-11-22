import { Group, PerspectiveCamera } from 'three';
import { box, cylinder, surface } from '../scene/geometry';
import { DEPTH_ORIGIN, RENDER_BASIS, RGB_ORIGIN } from './frames';

export function createRig() {
  const mount = new Group();
  mount.name = 'd435_bottom_screw_frame';
  const housing = new Group();
  housing.name = 'd435_housing';
  mount.add(housing);

  const aluminum = surface('#adbab9', 0.35, 0.58);
  const glass = surface('#202829', 0.28, 0.25);
  const lenses = surface('#131c22', 0.20, 0.42);
  const bezel = surface('#394446', 0.40, 0.30);
  box(housing, aluminum, [0.02505, 0.090, 0.025], [0.002375, 0, 0.0125], 0.004);
  box(housing, glass, [0.0018, 0.080, 0.018], [0.0151, 0, 0.0125], 0.0008);
  for (const y of [0.0325, 0.0175, -0.010, -0.0325]) {
    cylinder(housing, bezel, 0.0048, 0.001, [0.0161, y, 0.0125]).rotation.z = Math.PI / 2;
    cylinder(housing, lenses, 0.0033, 0.0007, [0.0168, y, 0.0125]).rotation.z = Math.PI / 2;
  }

  const depth = new PerspectiveCamera();
  depth.name = 'd435_depth_optical_frame';
  depth.position.copy(DEPTH_ORIGIN);
  depth.quaternion.copy(RENDER_BASIS);
  const rgb = new PerspectiveCamera();
  rgb.name = 'd435_color_optical_frame';
  rgb.position.copy(RGB_ORIGIN);
  rgb.quaternion.copy(RENDER_BASIS);
  mount.add(depth, rgb);
  return { mount, depth, rgb };
}
