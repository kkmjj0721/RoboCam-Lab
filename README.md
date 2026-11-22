# RoboCam-Lab

在浏览器中调整 Unitree Go2 的站姿和 RealSense D435 安装外参，实时查看不同地形下的彩色画面、深度和遮挡。

## 本地运行

使用 Node.js 24 和支持 WebGL 2 的现代浏览器。

```sh
npm ci
npm run dev
```

打开终端显示的地址。在「机器人」面板，可分别调整四条腿的关节角和机身世界位姿，也可在三维工具栏选择「移动 Go2」拖动机身。选择平地、金字塔楼梯、梅花桩或高台，再调整 D435 的安装参数。右侧「深度画面」上方可设定分辨率、最近视距和最远视距，点击深度图可读取像素的米制光轴深度。当前方案可通过 JSON 或分享链接恢复。

`npm run build` 执行 TypeScript 检查并生成 `dist/`。使用 `npm run preview` 预览生产构建。

## GitHub Pages

在仓库 **Settings → Pages** 中选择 **GitHub Actions** 作为发布来源。工作流 `Deploy RoboCam Lab to GitHub Pages` 会在推送到 `main` 时部署，也可手动运行。构建产物使用相对资源路径，可部署在仓库子路径。

## 技术说明

- [Go2 模型、地形、D435 预览和 JSON 格式](docs/camera-and-config.md)
- 应用使用 [MIT 许可证](LICENSE)。Go2 网格随附 [Unitree 许可证](public/robots/go2/LICENSE.txt)。
