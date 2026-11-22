import { BufferGeometry, Color, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, PlaneGeometry } from 'three';
import { box, editorOnly, solid, surface } from '../scene/geometry';
import type { TerrainConfig } from '../state/types';
import { obstaclePatch } from './layout';

function ground(parent: Group, length: number, width: number, step: number, x = 0, y = 0) {
  const floor = solid(parent, new PlaneGeometry(length, width), surface('#303a37'), x, y, 0);
  floor.castShadow = false;
  const left = x - length / 2;
  const right = x + length / 2;
  const bottom = y - width / 2;
  const top = y + width / 2;
  const points: number[] = [];
  for (let i = Math.ceil(left / step); i * step <= right; i++) {
    points.push(i * step, bottom, 0.001, i * step, top, 0.001);
  }
  for (let i = Math.ceil(bottom / step); i * step <= top; i++) {
    points.push(left, i * step, 0.001, right, i * step, 0.001);
  }
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3));
  const grid = new LineSegments(geometry, new LineBasicMaterial({ color: '#65857b', transparent: true, opacity: 0.27 }));
  editorOnly(grid);
  parent.add(grid);
}

function groundAroundPatch(parent: Group, length: number, width: number) {
  const margin = 16;
  ground(parent, margin, width + 2 * margin, 0.25, -margin / 2);
  ground(parent, margin, width + 2 * margin, 0.25, length + margin / 2);
  ground(parent, length, margin, 0.25, length / 2, -(width + margin) / 2);
  ground(parent, length, margin, 0.25, length / 2, (width + margin) / 2);
}

export function createTerrain(config: TerrainConfig) {
  const root = new Group();
  const patchOrigin = new Group();
  const patch = new Group();
  root.add(patchOrigin);
  patchOrigin.add(patch);
  patchOrigin.position.set(config.x, config.y, 0);
  patchOrigin.rotation.z = config.yaw * Math.PI / 180;
  patch.position.z = config.z;

  if (config.type === 'flat') {
    const { length, width, grid } = config.settings.flat;
    ground(patch, length, width, grid);
    return root;
  }

  const layout = obstaclePatch(config);
  if (config.type === 'platform') ground(root, 36, 30, 0.25);
  else groundAroundPatch(patchOrigin, layout.length, layout.width);

  const low = new Color(config.type === 'stones' ? '#35433f' : '#47616a');
  const high = new Color(config.type === 'stones' ? '#a5bfb2' : '#a9b9b8');
  for (const block of layout.blocks) {
    const height = block.top - block.bottom;
    const color = '#' + low.clone().lerp(high, block.tone).getHexString();
    box(patch, surface(color, 0.88), [block.length, block.width, height], [block.x, block.y, (block.top + block.bottom) / 2]);
  }
  return root;
}
