import { TERRAIN_TYPES } from '../state/types';
import type { TerrainType } from '../state/types';
import { icon } from './icons';

export const TERRAIN_NAMES: Record<TerrainType, string> = { flat: '平地', stairs: '楼梯', stones: '梅花桩', platform: '高台' };

export function mountShell(root: HTMLElement) {
  root.innerHTML = `
    <canvas class="webgl" id="webgl" aria-hidden="true"></canvas>
    <header class="topbar">
      <div class="brand"><span class="brand-mark">${icon('brand', 24)}</span><span>RoboCam <b>Lab</b></span></div>
      <div class="top-actions">
        <button class="button quiet" id="import" title="导入 JSON" type="button">${icon('upload', 16)}<span>导入</span></button>
        <button class="button quiet" id="export" title="导出 JSON" type="button">${icon('download', 16)}<span>导出 JSON</span></button>
        <button class="button primary" id="share" type="button">${icon('link', 17)}<span>分享场景</span></button>
        <input id="import-file" type="file" accept=".json,application/json" hidden />
      </div>
    </header>
    <main class="app-content">
      <div class="page-heading">
        <div>
          <h1>相机安装工作台</h1>
          <p>调整 Unitree Go2 的站姿与 D435 安装参数，实时查看彩色画面和深度。</p>
        </div>
        <button class="button quiet reset-scene" id="reset" type="button">${icon('reset', 16)}<span>重置场景</span></button>
      </div>
      <div class="workspace">
        <aside class="panel inspector" aria-labelledby="inspector-heading">
          <div class="panel-heading"><h2 id="inspector-heading">${icon('sliders', 17)}参数设置</h2></div>
          <div class="parameter-tabs" aria-label="参数类型">
            <button data-pane="camera" aria-pressed="true">相机</button>
            <button data-pane="robot" aria-pressed="false">机器人</button>
            <button data-pane="terrain" aria-pressed="false">地形</button>
          </div>
          <div class="panel-content" id="parameters"></div>
        </aside>
        <section class="panel stage" aria-labelledby="stage-heading">
          <div class="panel-heading stage-heading">
            <h2 id="stage-heading">${icon('cube', 17)}三维场景</h2>
            <button class="icon-button" title="重置观察视角" aria-label="重置观察视角" id="fit" type="button">${icon('fit', 17)}</button>
          </div>
          <div class="terrain-tabs" aria-label="地形预设">
            ${TERRAIN_TYPES.map(type => `<button data-terrain="${type}" aria-pressed="false">${icon(type, 16)}${TERRAIN_NAMES[type]}</button>`).join('')}
          </div>
          <div class="stage-viewport">
            <div class="editor-canvas render-region" id="editor" aria-label="Go2 与地形的三维工作区"></div>
            <div class="stage-tools" aria-label="三维操作">
              <button type="button" class="icon-button" data-mode="orbit" aria-label="自由观察" title="自由观察" aria-pressed="true">${icon('orbit', 17)}</button>
              <button type="button" class="icon-button" data-mode="translate" aria-label="平移相机" title="平移相机" aria-pressed="false">${icon('move', 17)}</button>
              <button type="button" class="icon-button" data-mode="rotate" aria-label="旋转相机" title="旋转相机" aria-pressed="false">${icon('rotate', 17)}</button>
              <button type="button" class="icon-button" data-mode="robot" aria-label="移动 Go2" title="沿世界轴移动 Go2" aria-pressed="false">${icon('robot', 19)}</button>
              <span class="tool-divider"></span>
              <button type="button" class="icon-button" id="frustum" title="显示深度视锥示意" aria-label="显示深度视锥示意" aria-pressed="true">${icon('frustum', 18)}</button>
            </div>
            <div class="stage-legend"><span><i class="axis-x"></i>X 前</span><span><i class="axis-y"></i>Y 左</span><span><i class="axis-z"></i>Z 上</span></div>
            <div class="render-error" id="render-error" role="status" hidden></div>
          </div>
          <div class="stage-footer">
            <div class="stage-summary"><strong id="terrain-name"></strong><span id="terrain-summary"></span></div>
            <span class="gesture-hint">拖动旋转 · 滚轮缩放</span>
          </div>
        </section>
        <aside class="panel previews" aria-labelledby="previews-heading">
          <div class="panel-heading"><h2 id="previews-heading">${icon('view', 17)}传感器预览</h2><span class="device-label">D435</span></div>
          <div class="preview-content">
            <section class="preview-block">
              <div class="preview-heading"><h3><span class="stream-sign rgb-sign"></span>彩色画面 <small>RGB</small></h3><span id="rgb-resolution"></span></div>
              <div class="video-frame"><div class="render-region rgb-frame" id="rgb" role="img" aria-label="D435 彩色画面"></div></div>
              <div class="preview-meta"><span id="rgb-fov"></span><span id="rgb-fps"></span></div>
            </section>
            <section class="preview-block">
              <div class="preview-heading">
                <h3><span class="stream-sign depth-sign"></span>深度画面 <small>Z</small></h3>
                <label class="preview-profile" for="depth-profile">分辨率<select id="depth-profile" aria-label="深度分辨率"></select></label>
              </div>
              <div class="depth-settings" role="group" aria-label="有效视距">
                <label for="depth-min">最近视距<span class="number-field"><input id="depth-min" type="number" step="any" inputmode="decimal" autocomplete="off"><span>m</span></span></label>
                <label for="depth-max">最远视距<span class="number-field"><input id="depth-max" type="number" step="any" inputmode="decimal" autocomplete="off"><span>m</span></span></label>
              </div>
              <div class="video-frame depth-container">
                <button type="button" class="render-region depth-frame" id="depth" aria-label="读取 D435 深度像素"></button>
                <span class="pixel-marker" id="pixel-marker" hidden></span>
              </div>
              <div class="preview-meta"><span id="depth-fov"></span><span id="depth-fps"></span></div>
              <div class="depth-legend" aria-label="深度色标">
                <div class="depth-gradient" id="depth-gradient"></div>
                <div class="range-labels"><span id="depth-near"></span><span id="depth-far"></span></div>
              </div>
              <div class="depth-readout">${icon('target', 17)}<output id="depth-readout" aria-live="polite">点击深度图读取光轴深度</output></div>
            </section>
            <p class="depth-note"><i></i>深色区域表示无效深度。画面按场景几何生成。</p>
          </div>
        </aside>
      </div>
      <footer class="footer"><span>场景位姿 m / ° · 关节 rad</span><span id="storage-status">配置保存在当前浏览器</span></footer>
    </main>
    <div class="toast" id="toast" role="status" hidden></div>
    <dialog id="share-dialog">
      <form method="dialog">
        <div class="dialog-title"><h2>分享场景</h2><button class="icon-button" aria-label="关闭">${icon('close', 18)}</button></div>
        <p>复制此链接，其他人可以打开同一套机器人、地形和相机配置。</p>
        <input id="share-url" type="text" readonly aria-label="场景分享链接" />
        <button class="button primary" value="close">完成</button>
      </form>
    </dialog>
  `;
}

export function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}
