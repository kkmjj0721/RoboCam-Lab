import type { TerrainConfig, TerrainSettings } from '../state/types';

type Footprint = { length: number; width: number };

type Block = {
  x: number; y: number; length: number; width: number;
  bottom: number; top: number; tone: number;
};

type Patch = Footprint & { blocks: Block[] };

export function stairRise(settings: TerrainSettings['stairs'], difficulty: number) {
  return settings.minRise + difficulty * (settings.maxRise - settings.minRise);
}

function ring(length: number, width: number, trim: number, centerX: number, bottom: number, top: number, tone: number): Block[] {
  const insetLength = length - 2 * trim;
  return [
    { x: centerX - (length - trim) / 2, y: 0, length: trim, width, bottom, top, tone },
    { x: centerX + (length - trim) / 2, y: 0, length: trim, width, bottom, top, tone },
    { x: centerX, y: -(width - trim) / 2, length: insetLength, width: trim, bottom, top, tone },
    { x: centerX, y: (width - trim) / 2, length: insetLength, width: trim, bottom, top, tone },
  ];
}

function stairs(settings: TerrainSettings['stairs'], difficulty: number): Patch {
  const { count, run, platformWidth, borderWidth } = settings;
  const interior = platformWidth + 2 * count * run;
  const size = interior + 2 * borderWidth;
  const center = size / 2;
  const rise = stairRise(settings, difficulty);
  const base = -Math.max(rise, 0.05);
  const blocks: Block[] = borderWidth > 0 ? ring(size, size, borderWidth, center, base, 0, 0.13) : [];

  // 保留向中心收缩的踏步环与独立的顶平台，避免相邻踏面重叠。
  for (let step = 0; step < count; step++) {
    const span = interior - 2 * step * run;
    blocks.push(...ring(span, span, run, center, base, (step + 1) * rise, 0.30 + 0.45 * step / count));
  }
  blocks.push({ x: center, y: 0, length: platformWidth, width: platformWidth, bottom: base, top: (count + 1) * rise, tone: 0.75 });
  return { length: size, width: size, blocks };
}

function randomFrom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function stones(settings: TerrainSettings['stones'], difficulty: number, seed: number): Patch {
  const { rows, columns, minSize, maxSize, gap, height, heightVariation, pitDepth, platformWidth, borderWidth } = settings;
  const pitch = maxSize + gap;
  const innerLength = rows * pitch;
  const innerWidth = columns * pitch;
  const length = innerLength + 2 * borderWidth;
  const width = innerWidth + 2 * borderWidth;
  const center = length / 2;
  const bottom = -pitDepth;
  const blocks = ring(length, width, borderWidth, center, bottom, height, 0.24);
  blocks.push({ x: center, y: 0, length, width, bottom: bottom - 0.09, top: bottom, tone: 0 });

  // 中心平台按固定网格对齐，留下完整的方桩和可复现的空隙。
  const firstCell = (count: number) => Math.max(0, Math.floor((count - platformWidth / pitch) / 2));
  const firstRow = firstCell(rows);
  const firstColumn = firstCell(columns);
  const padLength = (rows - 2 * firstRow) * pitch;
  const padWidth = (columns - 2 * firstColumn) * pitch;
  blocks.push({ x: center, y: 0, length: padLength, width: padWidth, bottom, top: height, tone: 0.79 });

  const next = randomFrom(seed);
  const signed = () => 2 * next() - 1;
  const size = maxSize - difficulty * (maxSize - minSize);
  const sizeVariation = Math.min(0.12 * (maxSize - minSize) * difficulty, size - minSize, maxSize - size);
  const displacement = gap * 0.33 * difficulty;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const dx = signed() * displacement;
      const dy = signed() * displacement;
      const sx = size + signed() * sizeVariation;
      const sy = size + signed() * sizeVariation;
      const top = height + signed() * heightVariation * difficulty;
      const tone = 0.42 + 0.30 * next();
      const platformCell = row >= firstRow && row < rows - firstRow && column >= firstColumn && column < columns - firstColumn;
      if (platformCell) continue;
      blocks.push({
        x: borderWidth + pitch * (row + 0.5) + dx,
        y: -innerWidth / 2 + pitch * (column + 0.5) + dy,
        length: sx, width: sy, bottom, top, tone,
      });
    }
  }
  return { length, width, blocks };
}

export function obstaclePatch(config: TerrainConfig): Patch {
  const { difficulty, seed, settings } = config;
  if (config.type === 'stairs') return stairs(settings.stairs, difficulty);
  if (config.type === 'stones') return stones(settings.stones, difficulty, seed);
  const { length, width, height } = settings.platform;
  return { length, width, blocks: [{ x: length / 2, y: 0, length, width, bottom: 0, top: height, tone: 0.76 }] };
}
