import { Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GO2_JOINTS } from './go2Joints';
import type { Go2JointAngles } from './go2Joints';

export async function loadGo2() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const asset = await loader.loadAsync(`${import.meta.env.BASE_URL}robots/go2/go2.glb`);
  const base = asset.scene.getObjectByName('base_link');
  if (base === undefined) throw new Error('Go2 asset is missing base_link.');
  const joints = GO2_JOINTS.map(joint => {
    const node = base.getObjectByName(joint.link);
    if (node === undefined) throw new Error(`Go2 asset is missing link: ${joint.link}.`);
    const axis = joint.type === 'hip' ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    return { name: joint.name, node, axis };
  });

  // GLB 的场景根节点用于转换到 glTF 约定的 Y-up。工作台直接使用下面的 MJCF 坐标树。
  base.removeFromParent();
  base.traverse(node => {
    if (node instanceof Mesh) node.castShadow = node.receiveShadow = true;
  });
  return {
    base,
    setJoints(angles: Go2JointAngles) {
      for (const joint of joints) joint.node.quaternion.setFromAxisAngle(joint.axis, angles[joint.name]);
    },
  };
}

export type Go2Model = Awaited<ReturnType<typeof loadGo2>>;
