import type { BoardTile, TileType } from '../types/run';
import { TILE_LABELS } from '../data/runData';

const CENTER_X = 180;
const TILE_SPACING_Y = 72;
const BASE_Y = 3040;
const ROUTE_X_GAP = 60;
const ROUTE_LABELS = ['A', 'B', 'C', 'D'] as const;
const MAX_INDEX = 40;

const iconOf = (type: TileType): string => TILE_LABELS[type].icon;
const iconImgOf = (type: TileType): string => TILE_LABELS[type].iconImg;
const nameOf = (type: TileType): string => TILE_LABELS[type].name;

interface BranchPlan {
  group: number;
  start: number;
  length: number;
  routeCount: number;
}

const connect = (nodes: BoardTile[], fromId: number, toId: number) => {
  const from = nodes.find((node) => node.id === fromId);
  if (!from) return;
  if (!from.nextTiles.includes(toId)) from.nextTiles.push(toId);
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const pickRouteCount = (): number => {
  const roll = Math.random();
  if (roll < 0.4) return 2;
  if (roll < 0.8) return 3;
  return 4;
};

const makeBranchPlans = (): BranchPlan[] => {
  const windows: Array<{ min: number; max: number }> = [
    { min: 5, max: 8 },
    { min: 14, max: 18 },
    { min: 24, max: 28 },
    { min: 33, max: 37 },
  ];
  const branchCount = Math.random() < 0.5 ? 3 : 4;
  const plans: BranchPlan[] = [];
  let prevMerge = 3;

  for (let i = 0; i < branchCount; i += 1) {
    const window = windows[i];
    const length = 2 + Math.floor(Math.random() * 4); // 2..5
    const minStart = Math.max(window.min, prevMerge + 2);
    const maxStart = Math.min(window.max, 39 - length);
    const fallbackStart = Math.max(window.min, Math.min(window.max, 39 - length));
    const start =
      minStart <= maxStart ? minStart + Math.floor(Math.random() * (maxStart - minStart + 1)) : fallbackStart;
    const routeCount = pickRouteCount();
    plans.push({ group: i + 1, start, length, routeCount });
    prevMerge = start + length;
  }

  return plans;
};

const getBranchX = (routeIndex: number, totalRoutes: number): number => {
  if (totalRoutes <= 1) return CENTER_X;
  const totalWidth = (totalRoutes - 1) * ROUTE_X_GAP;
  const startX = CENTER_X - totalWidth / 2;
  return startX + routeIndex * ROUTE_X_GAP;
};

const assignTypeByCounts = (
  nodes: BoardTile[],
  branchPlans: BranchPlan[],
): Map<number, TileType> => {
  const typeById = new Map<number, TileType>();
  const blockedBoss = new Set<number>();

  nodes.forEach((node) => {
    typeById.set(node.id, 'enemy');
    if (node.index === 0 || node.index === MAX_INDEX) blockedBoss.add(node.id);
  });

  const setType = (node: BoardTile | undefined, type: TileType) => {
    if (!node) return;
    typeById.set(node.id, type);
    blockedBoss.add(node.id);
  };

  const mainAt = (index: number) => nodes.find((node) => node.index === index && !node.branch);

  setType(mainAt(0), 'start');
  setType(mainAt(MAX_INDEX), 'area_boss');
  [1, 2, 3].forEach((idx) => setType(mainAt(idx), 'enemy'));
  setType(mainAt(39), Math.random() < 0.5 ? 'hotel' : 'pawnshop');

  const mergeIndices = branchPlans.map((plan) => plan.start + plan.length).filter((idx) => idx < 39);
  shuffle(mergeIndices).slice(0, Math.min(3, mergeIndices.length)).forEach((idx) => setType(mainAt(idx), 'hotel'));

  const pickMainInRange = (min: number, max: number): BoardTile | undefined => {
    const candidates = nodes.filter(
      (node) => !node.branch && node.index >= min && node.index <= max && !blockedBoss.has(node.id),
    );
    if (candidates.length === 0) return undefined;
    return pickRandom(candidates);
  };

  // pawnshop 3つ（序盤/中盤/終盤）
  const pawnEarly = pickMainInRange(6, 13);
  const pawnMid = pickMainInRange(17, 27);
  const pawnLate = pickMainInRange(29, 38);
  [pawnEarly, pawnMid, pawnLate].forEach((node) => setType(node, 'pawnshop'));

  const branchNodes = nodes.filter((node) => !!node.branch);
  const branchByGroup = new Map<number, BoardTile[]>();
  const branchByRouteKey = new Map<string, BoardTile[]>();
  branchNodes.forEach((node) => {
    if (!node.branchGroup) return;
    const list = branchByGroup.get(node.branchGroup) ?? [];
    list.push(node);
    branchByGroup.set(node.branchGroup, list);
    if (node.branch) {
      const routeKey = `${node.branchGroup}_${node.branch}`;
      const routeList = branchByRouteKey.get(routeKey) ?? [];
      routeList.push(node);
      branchByRouteKey.set(routeKey, routeList);
    }
  });

  // unique_boss 1~2: 分岐ルート優先
  const uniqueCount = 1 + Math.floor(Math.random() * 2);
  const groupsForUnique = shuffle(branchPlans.map((plan) => plan.group)).slice(0, uniqueCount);
  groupsForUnique.forEach((group) => {
    const groupNodes = branchByGroup.get(group) ?? [];
    const byRoute = new Map<string, BoardTile[]>();
    groupNodes.forEach((node) => {
      if (!node.branch) return;
      const routeList = byRoute.get(node.branch) ?? [];
      routeList.push(node);
      byRoute.set(node.branch, routeList);
    });
    const route = pickRandom(Array.from(byRoute.keys()));
    const target = pickRandom(byRoute.get(route) ?? []);
    setType(target, 'unique_boss');
  });

  // shrine 2~3: 分岐優先
  const shrineCount = 2 + Math.floor(Math.random() * 2);
  const shrineCandidates = branchNodes.filter((node) => !blockedBoss.has(node.id));
  shuffle(shrineCandidates).slice(0, shrineCount).forEach((node) => setType(node, 'shrine'));

  const eventTarget = 6 + Math.floor(Math.random() * 3); // 6~8
  const hotelTarget = 3 + Math.floor(Math.random() * 2); // 3~4
  const pawnTarget = 3;

  const countType = (type: TileType) =>
    nodes.filter((node) => node.index > 0 && node.index < MAX_INDEX && typeById.get(node.id) === type).length;

  const fillCandidates = nodes.filter((node) => node.index > 0 && node.index < MAX_INDEX);
  const tryFill = (type: TileType, target: number) => {
    const need = target - countType(type);
    if (need <= 0) return;
    const pool = shuffle(fillCandidates).filter((node) => !blockedBoss.has(node.id));
    pool.slice(0, need).forEach((node) => setType(node, type));
  };

  tryFill('hotel', hotelTarget);
  tryFill('pawnshop', pawnTarget);
  tryFill('event', eventTarget);

  // 分岐ルート内では shrine / unique_boss をそれぞれ最大1つまで
  branchByRouteKey.forEach((routeNodes) => {
    const uniqueNodes = routeNodes.filter((node) => typeById.get(node.id) === 'unique_boss');
    if (uniqueNodes.length > 1) {
      uniqueNodes.slice(1).forEach((node) => typeById.set(node.id, 'enemy'));
    }
    const shrineNodes = routeNodes.filter((node) => typeById.get(node.id) === 'shrine');
    if (shrineNodes.length > 1) {
      shrineNodes.slice(1).forEach((node) => typeById.set(node.id, 'enemy'));
    }
  });

  // 敵の連続制御（メインラインのみ5連続回避）
  let enemyRun = 0;
  for (let idx = 1; idx < 39; idx += 1) {
    const node = mainAt(idx);
    if (!node) continue;
    const type = typeById.get(node.id) ?? 'enemy';
    if (type === 'enemy') {
      enemyRun += 1;
      if (enemyRun >= 5) {
        const fallback: TileType[] = ['event', 'hotel', 'pawnshop', 'shrine'];
        typeById.set(node.id, fallback[Math.floor(Math.random() * fallback.length)]);
        enemyRun = 0;
      }
    } else {
      enemyRun = 0;
    }
  }

  return typeById;
};

export const generateBoard = (): BoardTile[] => {
  const nodes: BoardTile[] = [];
  const nodeIdByKey = new Map<string, number>();
  const branchPlans = makeBranchPlans();
  const blockedIndices = new Set<number>();
  branchPlans.forEach((plan) => {
    for (let i = 0; i < plan.length; i += 1) {
      blockedIndices.add(plan.start + i);
    }
  });
  let idCounter = 1;

  const addNode = (
    index: number,
    branch?: string,
    branchGroup?: number,
    routeIndex = 0,
    totalRoutes = 1,
  ) => {
    const id = idCounter;
    idCounter += 1;
    const x = branch ? getBranchX(routeIndex, totalRoutes) : CENTER_X;
    const y = BASE_Y - index * TILE_SPACING_Y;
    const node: BoardTile = {
      id,
      index,
      row: index,
      branch,
      type: 'enemy',
      icon: iconOf('enemy'),
      iconImg: iconImgOf('enemy'),
      name: nameOf('enemy'),
      nextTiles: [],
      isBranch: !!branch,
      branchGroup,
      visited: index === 0,
      isCurrentPosition: index === 0,
      x,
      y,
    };
    nodes.push(node);
    nodeIdByKey.set(`${index}_${branch ?? 'M'}`, id);
    return id;
  };

  for (let index = 0; index <= MAX_INDEX; index += 1) {
    if (blockedIndices.has(index)) continue;
    addNode(index);
  }

  branchPlans.forEach((plan) => {
    for (let routeIndex = 0; routeIndex < plan.routeCount; routeIndex += 1) {
      const label = ROUTE_LABELS[routeIndex];
      for (let offset = 0; offset < plan.length; offset += 1) {
        addNode(plan.start + offset, label, plan.group, routeIndex, plan.routeCount);
      }
    }
  });

  const getId = (index: number, branch?: string) => nodeIdByKey.get(`${index}_${branch ?? 'M'}`) ?? null;
  const branchByStart = new Map<number, BranchPlan>();
  const branchByInternal = new Map<number, BranchPlan>();
  branchPlans.forEach((plan) => {
    branchByStart.set(plan.start, plan);
    for (let i = 0; i < plan.length; i += 1) {
      branchByInternal.set(plan.start + i, plan);
    }
  });

  for (let index = 0; index < MAX_INDEX; index += 1) {
    const nextIndex = index + 1;
    const currentPlan = branchByInternal.get(index);
    const nextPlan = branchByStart.get(nextIndex);

    if (!currentPlan && !nextPlan) {
      const from = getId(index);
      const to = getId(nextIndex);
      if (from && to) connect(nodes, from, to);
      continue;
    }

    if (!currentPlan && nextPlan) {
      const from = getId(index);
      for (let route = 0; route < nextPlan.routeCount; route += 1) {
        const to = getId(nextIndex, ROUTE_LABELS[route]);
        if (from && to) connect(nodes, from, to);
      }
      continue;
    }

    if (currentPlan) {
      const currentOffset = index - currentPlan.start;
      const isLastInBranch = currentOffset === currentPlan.length - 1;
      for (let route = 0; route < currentPlan.routeCount; route += 1) {
        const label = ROUTE_LABELS[route];
        const from = getId(index, label);
        if (!from) continue;
        if (!isLastInBranch) {
          const to = getId(nextIndex, label);
          if (to) connect(nodes, from, to);
        } else {
          const to = getId(nextIndex);
          if (to) connect(nodes, from, to);
        }
      }
    }
  }

  const typeById = assignTypeByCounts(nodes, branchPlans);
  nodes.forEach((node) => {
    const type = typeById.get(node.id) ?? 'enemy';
    node.type = type;
    node.icon = iconOf(type);
    node.iconImg = iconImgOf(type);
    node.name = nameOf(type);
  });

  return nodes;
};

export const getTileById = (board: BoardTile[], id: number): BoardTile | undefined =>
  board.find((tile) => tile.id === id);

export const getRoutePreviewTiles = (board: BoardTile[], startTileId: number, depth = 3): BoardTile[] => {
  const out: BoardTile[] = [];
  let current = getTileById(board, startTileId);
  let step = 0;
  while (current && step < depth) {
    out.push(current);
    const next = current.nextTiles[0];
    current = next ? getTileById(board, next) : undefined;
    step += 1;
  }
  return out;
};

export interface MovePlayerResult {
  newTileId: number;
  stoppedAtBranch: boolean;
  branchOptions: number[];
  passedTileIds: number[];
}

export const movePlayerBySteps = (
  board: BoardTile[],
  startTileId: number,
  steps: number,
  selectedBranchTileId: number | null,
): MovePlayerResult => {
  const map = new Map<number, BoardTile>(board.map((node) => [node.id, node]));
  let currentId = startTileId;
  let remaining = steps;
  let branchChoice = selectedBranchTileId;
  const passedTileIds: number[] = [];

  while (remaining > 0) {
    const current = map.get(currentId);
    if (!current || current.type === 'area_boss') break;
    if (current.nextTiles.length === 0) break;

    if (current.nextTiles.length > 1) {
      if (!branchChoice || !current.nextTiles.includes(branchChoice)) {
        return {
          newTileId: currentId,
          stoppedAtBranch: true,
          branchOptions: [...current.nextTiles],
          passedTileIds,
        };
      }
      currentId = branchChoice;
      branchChoice = null;
    } else {
      currentId = current.nextTiles[0];
    }

    passedTileIds.push(currentId);
    remaining -= 1;
    const landed = map.get(currentId);
    // エリート・エリアボスは Slay the Spire 同様、踏んだら出目に余りがあっても必ず停止
    if (landed?.type === 'area_boss' || landed?.type === 'unique_boss') break;
  }

  return {
    newTileId: currentId,
    stoppedAtBranch: false,
    branchOptions: [],
    passedTileIds,
  };
};
