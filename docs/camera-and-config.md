# 坐标系、D435 预览与场景配置

## 坐标系

世界与默认机身坐标采用右手系，`+X` 向前、`+Y` 向左、`+Z` 向上。机器人位姿定义 `base_link` 在世界中的位置与姿态。相机面板的位置定义 D435 底部螺孔安装参考系在 `base_link` 中的位置。

长度以米计。旋转采用列向量与 `Rz(yaw) · Ry(pitch) · Rx(roll)`，界面用度。零姿态的相机朝机身正前方，正 Pitch 向下。在三维视图中，平移控件沿世界轴操作，旋转控件沿安装参考系的轴操作，保存值始终相对机身。

RGB 和深度相机各自有光学坐标系，均为 `+X` 向右、`+Y` 向下、`+Z` 向前。安装参考系到两个光学原点的标称偏移来自 [RealSense ROS 模型定义](https://github.com/realsenseai/realsense-ros/blob/ros2-master/realsense2_description/urdf/_d435.urdf.xacro)。

## Go2 模型与站姿

网页模型从 `HT_Quadruped_mjlab/src/assets/robots/go2/xmls/go2.xml` 及其 16 个可视 OBJ 网格生成，取自本地版本 `0a793e8`。网格与 [MuJoCo Menagerie 的 Unitree Go2](https://github.com/google-deepmind/mujoco_menagerie/tree/370c43965323c0944b433b202aac5058b5f907a9/unitree_go2) 对应文件一致。发布资产简化了表面网格并使用 Meshopt 压缩，保留原模型尺寸、关节树、可视网格位姿及 MJCF 材质。网格许可随 GLB 一起分发。 [Unitree 许可证](../public/robots/go2/LICENSE.txt)

默认站姿来自同版本的 `src/config/go2/go2_config.py`。机身高度为 `0.32 m`，左／右髋分别为 `-0.1 / 0.1 rad`，大腿为 `0.9 rad`，小腿为 `-1.8 rad`。四条腿的 12 个关节都可独立调整，范围来自 MJCF 中的关节限制。工作台展示静态姿态，脚底高度随机身和关节设置变化。D435 继续挂在 `base_link` 上。

## 地形生成

网页实现单块可摆放的子地形。楼梯参考 `BoxPyramidStairsTerrainCfg`，四面以同心踏步环逐级升向顶平台，难度在最小和最大级高中线性插值。梅花桩参考 `BoxSteppingStonesTerrainCfg`，使用带外沿和深坑底面的固定方桩网格及中心平台。难度增加时桩顶缩小，位置和高度可按固定种子产生变化。平地和矩形高台提供基础对照。 [mjlab 地形文档](https://mujocolab.github.io/mjlab/main/source/terrain.html) · [上游生成实现](https://github.com/mujocolab/mjlab/blob/55182f0903b8359033fca90560aab871c417465d/src/mjlab/terrains/primitive_terrains.py)

## D435 预览

D435 外壳由程序化几何生成，外壳尺寸及光学偏移按标称规格近似。

分辨率和视场角参考 [RealSense D435 规格](https://www.realsenseai.com/products/stereo-depth-camera-d435/)和 [D400 系列数据手册](https://www.realsenseai.com/wp-content/uploads/2026/03/RealSense-D400-Series-Datasheet-Mar-2026.pdf)。RGB 和深度均使用主点居中的标称针孔投影，真实设备的内外参随设备和流档位变化。档位中的 30 FPS 为设备标称值，网页按交互更新渲染。

深度图显示光学坐标的 `Z`，像素坐标从左上角开始。渲染先取最近表面，再根据有效深度范围标记无效值，因此过近物体仍会遮挡后方。色标随当前有效范围更新。场景产生的是理想几何深度，适合检查安装位置、观测范围与几何遮挡。视锥示意默认画到光轴前方约 1.45 m，受设定范围约束。

## JSON 与分享

场景配置的 `version` 为 `2`，包含 `robot`、`camera`、`terrain`。`robot.jointAngles` 使用 MJCF 关节名和弧度，`robot.pose` 保持米和度。地形记录难度、种子和四种预设各自的参数。导入 `version: 1` 时会保留场景位姿和相机参数，并使用 Go2 默认关节角及对应的新地形参数。旧的直楼梯和圆桩场景会按新版地形形状重建。

导出的 `transforms.T_base_depth` 和 `transforms.T_base_rgb` 分别将深度和 RGB 光学坐标转换为 `base_link` 坐标，矩阵为按行排列的 16 个数，四元数分量顺序为 `xyzw`。变换与 `sensorProfiles` 由场景参数生成，导入时会按参数重新计算。

分享链接在 URL 片段中保存场景配置。打开带有效片段的链接会优先恢复该场景。浏览器本地保存用于恢复同一来源下最近的配置。
