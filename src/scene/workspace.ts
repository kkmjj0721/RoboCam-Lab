import {
  AmbientLight, AxesHelper, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Fog,
  LineBasicMaterial, LineSegments, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { applyPose, readPose } from '../camera/frames';
import { applyProjection, DEPTH_PROFILES, halfFovTangent, RGB_PROFILES } from '../camera/profiles';
import { createRig } from '../camera/rig';
import type { Go2Model } from '../robots/go2';
import { CAMERA_FIELDS, ROBOT_FIELDS } from '../state/fields';
import type { Pose } from '../state/types';
import type { SceneStore } from '../state/store';
import { createTerrain } from '../terrain/terrain';
import { disposeGeometry, EDITOR_LAYER, editorOnly } from './geometry';
import { createSensorViews } from './sensorViews';

type Viewports = { canvas: HTMLCanvasElement; editor: HTMLElement; rgb: HTMLElement; depth: HTMLElement };
export type GizmoMode = 'orbit' | 'translate' | 'rotate' | 'robot';

function cameraFrustum() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(32 * 3), 3));
  const wire = new LineSegments(geometry, new LineBasicMaterial({
    color: '#89ddbd', transparent: true, opacity: 0.56, depthWrite: false,
  }));
  wire.frustumCulled = false;
  editorOnly(wire);
  return wire;
}

function updateFrustum(wire: ReturnType<typeof cameraFrustum>, h: number, v: number, min: number, max: number) {
  const vertices = wire.geometry.getAttribute('position');
  const far = Math.min(max, Math.max(min + 0.12, 1.45));
  const corners = (d: number) => {
    const x = d * halfFovTangent(h);
    const y = d * halfFovTangent(v);
    return [new Vector3(-x, -y, -d), new Vector3(x, -y, -d), new Vector3(x, y, -d), new Vector3(-x, y, -d)];
  };
  const near = corners(min);
  const end = corners(far);
  const origin = new Vector3();
  let index = 0;
  function segment(a: Vector3, b: Vector3) {
    vertices.setXYZ(index++, a.x, a.y, a.z);
    vertices.setXYZ(index++, b.x, b.y, b.z);
  }
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    segment(near[i], near[next]);
    segment(end[i], end[next]);
    segment(near[i], end[i]);
    segment(origin, near[i]);
  }
  vertices.needsUpdate = true;
}

export function createWorkspace(views: Viewports, store: SceneStore, robot: Go2Model) {
  const renderer = new WebGLRenderer({ canvas: views.canvas, antialias: true, alpha: true });
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const stageColor = new Color('#1d2a27');
  scene.background = stageColor;
  scene.fog = new Fog(stageColor, 7, 24);
  scene.add(new AmbientLight('#ccdcd4', 1.45));
  const key = new DirectionalLight('#fff0d5', 2.65);
  key.position.set(-2.7, -3.2, 7);
  key.target.position.set(1.0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.015;
  scene.add(key, key.target);
  const fill = new DirectionalLight('#a3dfff', 0.64);
  fill.position.set(3, 5, 2);
  scene.add(fill);

  const { base } = robot;
  const rig = createRig();
  base.add(rig.mount);
  scene.add(base);
  const axis = new AxesHelper(0.26);
  editorOnly(axis);
  base.add(axis);
  const wire = cameraFrustum();
  rig.depth.add(wire);
  let terrain = createTerrain(store.get().terrain);
  scene.add(terrain);

  const editor = new PerspectiveCamera(39, 1, 0.035, 50);
  editor.up.set(0, 0, 1);
  editor.layers.enable(EDITOR_LAYER);
  const controls = new OrbitControls(editor, views.editor);
  controls.enableDamping = true;
  controls.minDistance = 0.28;
  controls.maxDistance = 23;
  controls.maxPolarAngle = Math.PI * 0.495;
  const gizmo = new TransformControls(editor, views.editor);
  gizmo.setSize(0.57);
  const gizmoHelper = gizmo.getHelper();
  editorOnly(gizmoHelper);
  gizmo.getRaycaster().layers.enable(EDITOR_LAYER);
  scene.add(gizmoHelper);
  gizmo.addEventListener('dragging-changed', () => { controls.enabled = !gizmo.dragging; });

  const previews = createSensorViews(renderer);
  let dirtySensors = true;
  let animation = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 0;

  function requestDraw() {
    if (animation === 0) animation = requestAnimationFrame(draw);
  }

  function setViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const x = Math.round(bounds.left);
    const y = Math.round(height - bounds.bottom);
    const w = Math.round(bounds.width);
    const h = Math.round(bounds.height);
    const sx = Math.max(x, 0);
    const sy = Math.max(y, 0);
    const sw = Math.min(x + w, width) - sx;
    const sh = Math.min(y + h, height) - sy;
    if (sw <= 0 || sh <= 0) return false;
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(sx, sy, sw, sh);
    return true;
  }

  function capture() {
    previews.capture(scene, rig.rgb, rig.depth);
    dirtySensors = false;
  }

  function draw() {
    animation = 0;
    controls.update();
    const nextRatio = Math.min(devicePixelRatio, 1.5);
    const { clientWidth, clientHeight } = document.documentElement;
    if (width !== clientWidth || height !== clientHeight || pixelRatio !== nextRatio) {
      width = clientWidth;
      height = clientHeight;
      pixelRatio = nextRatio;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    }
    if (dirtySensors) capture();

    renderer.setScissorTest(false);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.setScissorTest(true);
    if (setViewport(views.editor)) {
      editor.aspect = views.editor.clientWidth / views.editor.clientHeight;
      editor.updateProjectionMatrix();
      renderer.render(scene, editor);
    }
    if (setViewport(views.rgb)) previews.draw('rgb');
    if (setViewport(views.depth)) previews.draw('depth');
    renderer.setScissorTest(false);
  }

  function resetView() {
    const { x, y, z } = store.get().robot.pose;
    editor.position.set(x - 1.36, y - 3.42, z + 1.59);
    controls.target.set(x + 1.07, y, Math.max(0.18, z - 0.10));
    controls.update();
    requestDraw();
  }

  controls.addEventListener('change', requestDraw);
  gizmo.addEventListener('change', requestDraw);
  gizmo.addEventListener('objectChange', () => {
    const config = store.get();
    const movingRobot = gizmo.object === base;
    const member = movingRobot ? 'robot' : 'camera';
    const fields = movingRobot ? ROBOT_FIELDS : CAMERA_FIELDS;
    const pose = { ...config[member].pose };
    const moved = readPose(movingRobot ? base : rig.mount);
    const names: (keyof Pose)[] = gizmo.mode === 'translate' ? ['x', 'y', 'z'] : ['roll', 'pitch', 'yaw'];
    for (const name of names) {
      const { min, max } = fields[name];
      pose[name] = Math.max(min, Math.min(max, moved[name]));
    }
    store.replace({ ...config, [member]: { ...config[member], pose } });
  });
  const observer = new ResizeObserver(requestDraw);
  for (const element of [views.editor, views.rgb, views.depth]) observer.observe(element);
  window.addEventListener('resize', requestDraw);
  window.addEventListener('scroll', requestDraw, { passive: true, capture: true });

  const sync = (config: ReturnType<SceneStore['get']>, updateShadows: boolean) => {
    applyPose(base, config.robot.pose);
    robot.setJoints(config.robot.jointAngles);
    applyPose(rig.mount, config.camera.pose);
    const rgb = RGB_PROFILES[config.camera.rgbProfile];
    const depth = DEPTH_PROFILES[config.camera.depthProfile];
    applyProjection(rig.rgb, rgb);
    applyProjection(rig.depth, depth);
    previews.setProfiles(rgb, depth, config.camera.minDepth, config.camera.maxDepth);
    updateFrustum(wire, depth.hfov, depth.vfov, config.camera.minDepth, config.camera.maxDepth);
    if (updateShadows) renderer.shadowMap.needsUpdate = true;
    dirtySensors = true;
    requestDraw();
  };
  sync(store.get(), true);
  resetView();

  store.subscribe((config, previous) => {
    const terrainChanged = config.terrain !== previous.terrain;
    if (terrainChanged) {
      scene.remove(terrain);
      disposeGeometry(terrain);
      terrain = createTerrain(config.terrain);
      scene.add(terrain);
    }
    sync(config, terrainChanged || config.robot !== previous.robot || config.camera.pose !== previous.camera.pose);
  });

  return {
    resetView,
    setGizmo(mode: GizmoMode) {
      if (mode === 'orbit') gizmo.detach();
      else {
        gizmo.attach(mode === 'robot' ? base : rig.mount);
        gizmo.setSize(mode === 'robot' ? 0.71 : 0.57);
        gizmo.setMode(mode === 'rotate' ? 'rotate' : 'translate');
        gizmo.setSpace(mode === 'rotate' ? 'local' : 'world');
      }
      requestDraw();
    },
    setFrustum(visible: boolean) {
      wire.visible = visible;
      requestDraw();
    },
    sample(x: number, y: number) {
      if (dirtySensors) capture();
      return previews.sample(x, y, DEPTH_PROFILES[store.get().camera.depthProfile]);
    },
  };
}

export type Workspace = ReturnType<typeof createWorkspace>;
