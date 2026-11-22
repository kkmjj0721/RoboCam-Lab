import { BoxGeometry, CylinderGeometry, Group, LineSegments, Mesh, MeshStandardMaterial } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const EDITOR_LAYER = 1;

export function editorOnly(object: Object3D) {
  object.traverse(child => child.layers.set(EDITOR_LAYER));
}

export function surface(color: string, roughness = 0.75, metalness = 0) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

export function solid(
  parent: Group, geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number,
) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function box(
  parent: Group, material: MeshStandardMaterial, size: [number, number, number], center: [number, number, number], radius = 0,
) {
  const geometry = radius ? new RoundedBoxGeometry(...size, 2, radius) : new BoxGeometry(...size);
  return solid(parent, geometry, material, ...center);
}

export function cylinder(
  parent: Group, material: MeshStandardMaterial, radius: number, height: number, center: [number, number, number],
) {
  return solid(parent, new CylinderGeometry(radius, radius, height, 24), material, ...center);
}

export function disposeGeometry(group: Group) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Mesh['material']>();
  group.traverse(object => {
    if (object instanceof Mesh || object instanceof LineSegments) {
      geometries.add(object.geometry);
      materials.add(object.material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    for (const entry of Array.isArray(material) ? material : [material]) entry.dispose();
  }
}
