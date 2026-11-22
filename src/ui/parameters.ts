import { RGB_PROFILES } from '../camera/profiles';
import { checkTerrainSettings } from '../io/config';
import { defaultScene } from '../presets/defaultScene';
import { defaultGo2Joints, GO2_JOINTS, GO2_JOINT_LABELS, GO2_LEGS, GO2_LEG_LABELS } from '../robots/go2Joints';
import type { Go2Leg } from '../robots/go2Joints';
import { CAMERA_FIELDS, GO2_FIELDS, ROBOT_FIELDS, TERRAIN_FIELDS, TERRAIN_GENERATION_FIELDS, TERRAIN_POSE_FIELDS } from '../state/fields';
import type { Field } from '../state/fields';
import type { SceneStore } from '../state/store';
import { RGB_PROFILE_IDS } from '../state/types';
import type { Pose, SceneConfig, TerrainSettings, TerrainType } from '../state/types';
import { icon } from './icons';
import { bindNumberInput, bindProfileSelect } from './inputs';
import { element, TERRAIN_NAMES } from './shell';

type Pane = 'camera' | 'robot' | 'terrain';
type SyncField = (config: SceneConfig) => void;

function section(title: string, meta = '') {
  const node = document.createElement('section');
  node.className = 'parameter-section';
  node.innerHTML = `<div class="parameter-caption"><h3>${title}</h3>${meta}</div>`;
  return node;
}

export function mountParameters(store: SceneStore, notify: (message: string) => void) {
  const container = element('parameters');
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-pane]')];
  let active: Pane = 'camera';
  let activeLeg: Go2Leg = 'FL';
  let syncFields: SyncField[] = [];

  function sync(config: SceneConfig) {
    for (const update of syncFields) update(config);
  }

  function addField(
    target: HTMLElement, field: Field, name: string,
    get: (config: SceneConfig) => number, set: (config: SceneConfig, value: number) => SceneConfig, stepSlider = true,
  ) {
    const row = document.createElement('div');
    row.className = `parameter-row${stepSlider ? '' : ' no-slider'}`;
    const inputId = `field-${active}-${name}`;
    row.innerHTML = `
      <label class="field-label" for="${inputId}">${field.axis ? `<i class="axis-${field.axis}"></i>` : ''}${field.label}</label>
      ${stepSlider ? `<input class="slider" type="range" aria-label="${field.label} 滑条" min="${field.min}" max="${field.max}" step="${field.step}">` : ''}
      <div class="number-field"><input type="number" id="${inputId}" step="any" autocomplete="off"><span>${field.unit}</span></div>
    `;
    target.append(row);
    const numeric = row.querySelector<HTMLInputElement>('input[type="number"]')!;
    const slider = row.querySelector<HTMLInputElement>('.slider');
    syncFields.push(bindNumberInput(numeric, slider, field, store, notify, { get, set }));
  }

  function addPose(target: HTMLElement, type: 'camera' | 'robot', names: (keyof Pose)[]) {
    const schema = type === 'camera' ? CAMERA_FIELDS : ROBOT_FIELDS;
    for (const name of names) {
      addField(target, schema[name], name,
        config => config[type].pose[name],
        (config, value) => ({ ...config, [type]: { ...config[type], pose: { ...config[type].pose, [name]: value } } }));
    }
  }

  function displayCamera() {
    const device = document.createElement('div');
    device.className = 'device-row';
    device.innerHTML = `<span class="device-icon">${icon('brand', 19)}</span><div><strong>RealSense D435</strong><small>双目深度相机</small></div><span class="frame-tag">base_link</span>`;
    const position = section('安装位置', '<span class="caption-unit">m</span>');
    addPose(position, 'camera', ['x', 'y', 'z']);
    const angles = section('安装姿态', '<span class="caption-unit">deg</span>');
    addPose(angles, 'camera', ['roll', 'pitch', 'yaw']);
    const note = document.createElement('p');
    note.className = 'field-note';
    note.textContent = '正 Pitch 向下俯视';
    angles.append(note);
    const profiles = section('彩色分辨率');
    const profileRow = document.createElement('label');
    profileRow.className = 'select-row';
    profileRow.append('RGB');
    const rgbSelect = document.createElement('select');
    rgbSelect.setAttribute('aria-label', '彩色分辨率');
    profileRow.append(rgbSelect);
    profiles.append(profileRow);
    syncFields.push(bindProfileSelect(rgbSelect, store, 'rgbProfile', RGB_PROFILE_IDS, RGB_PROFILES));
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'text-button';
    restore.innerHTML = `${icon('reset', 15)}恢复外参`;
    restore.addEventListener('click', () => {
      const config = store.get();
      store.replace({ ...config, camera: { ...config.camera, pose: defaultScene().camera.pose } });
    });
    container.append(device, position, angles, profiles, restore);
  }

  function displayRobot() {
    const position = section('Go2 机身位置', '<span class="caption-unit">m · 世界坐标</span>');
    addPose(position, 'robot', ['x', 'y', 'z']);
    const stance = section('站立关节角', '<span class="caption-unit">rad</span>');
    const legTabs = document.createElement('div');
    legTabs.className = 'parameter-tabs leg-tabs';
    legTabs.setAttribute('aria-label', 'Go2 腿部选择');
    stance.append(legTabs);
    const legs = GO2_LEGS.map(leg => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = GO2_LEG_LABELS[leg];
      button.dataset.leg = leg;
      legTabs.append(button);
      const fields = document.createElement('div');
      stance.append(fields);
      for (const joint of GO2_JOINTS.filter(joint => joint.leg === leg)) {
        addField(fields, { ...GO2_FIELDS[joint.name], label: GO2_JOINT_LABELS[joint.type] }, joint.name,
          config => config.robot.jointAngles[joint.name],
          (config, value) => ({ ...config, robot: {
            ...config.robot, jointAngles: { ...config.robot.jointAngles, [joint.name]: value },
          } }));
      }
      button.addEventListener('click', () => {
        activeLeg = leg;
        syncLegs();
      });
      return { button, fields, leg };
    });
    function syncLegs() {
      for (const { button, fields, leg } of legs) {
        button.setAttribute('aria-pressed', String(leg === activeLeg));
        fields.hidden = leg !== activeLeg;
      }
    }
    syncLegs();
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'text-button';
    restore.innerHTML = `${icon('reset', 15)}恢复默认关节角`;
    restore.addEventListener('click', () => {
      const config = store.get();
      store.replace({ ...config, robot: { ...config.robot, jointAngles: defaultGo2Joints() } });
    });
    stance.append(restore);
    const rotation = section('机身姿态', '<span class="caption-unit">deg</span>');
    addPose(rotation, 'robot', ['roll', 'pitch', 'yaw']);
    container.append(position, stance, rotation);
  }

  function displayTerrain<K extends TerrainType>(type: K) {
    const placement = section('地形位置', '<span class="caption-unit">世界坐标</span>');
    for (const name of ['x', 'y', 'z', 'yaw'] as const) {
      addField(placement, TERRAIN_POSE_FIELDS[name], name, config => config.terrain[name],
        (config, value) => ({ ...config, terrain: { ...config.terrain, [name]: value } }));
    }
    const shape = section(`${TERRAIN_NAMES[type]}尺寸`);
    const fields = TERRAIN_FIELDS[type] as Record<keyof TerrainSettings[K], Field>;
    for (const name of Object.keys(fields) as (keyof TerrainSettings[K] & string)[]) {
      addField(shape, fields[name], name, config => Number(config.terrain.settings[type][name]),
        (config, value) => {
          const settings = {
            ...config.terrain.settings, [type]: { ...config.terrain.settings[type], [name]: value },
          };
          checkTerrainSettings(settings);
          return { ...config, terrain: { ...config.terrain, settings } };
        });
    }
    if (type === 'stairs' || type === 'stones') {
      const generation = section('生成设置');
      addField(generation, TERRAIN_GENERATION_FIELDS.difficulty, 'difficulty', config => config.terrain.difficulty,
        (config, difficulty) => ({ ...config, terrain: { ...config.terrain, difficulty } }));
      if (type === 'stones') {
        addField(generation, TERRAIN_GENERATION_FIELDS.seed, 'seed', config => config.terrain.seed,
          (config, seed) => ({ ...config, terrain: { ...config.terrain, seed } }), false);
      }
      container.append(generation);
    }
    container.append(shape, placement);
  }

  function render(config: SceneConfig) {
    container.replaceChildren();
    syncFields = [];
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.pane === active));
    if (active === 'camera') displayCamera();
    if (active === 'robot') displayRobot();
    if (active === 'terrain') displayTerrain(config.terrain.type);
    sync(config);
  }

  for (const button of tabs) {
    button.addEventListener('click', () => {
      active = button.dataset.pane as Pane;
      render(store.get());
    });
  }
  render(store.get());
  store.subscribe((next, previous) => {
    if (active === 'terrain' && next.terrain.type !== previous.terrain.type) render(next);
    else sync(next);
  });
}
