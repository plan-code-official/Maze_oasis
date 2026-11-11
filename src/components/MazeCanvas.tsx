import React, { useEffect, useRef, useMemo } from 'react';
import { gameAudio } from '../utils/audio';
import character11 from '../../assets/11.png';
import character12 from '../../assets/12.png';
import character13 from '../../assets/13.png';
import character14 from '../../assets/14.png';
import character21 from '../../assets/21.png';
import character22 from '../../assets/22.png';
import character23 from '../../assets/23.png';
import character24 from '../../assets/24.png';
import character31 from '../../assets/31.png';
import character32 from '../../assets/32.png';
import character33 from '../../assets/33.png';
import character34 from '../../assets/34.png';

type FacingDirection = 'up' | 'down' | 'left' | 'right';

const CHARACTER_FRAMES: Record<FacingDirection, [string, string, string]> = {
  down: [character11, character21, character31],
  right: [character12, character22, character32],
  up: [character13, character23, character33],
  left: [character14, character24, character34]
};

const CHARACTER_ALPHA_BOUNDS: Record<string, [number, number, number, number]> = {
  [character11]: [14, 0, 422, 956],
  [character12]: [53, 14, 366, 959],
  [character13]: [0, 15, 432, 909],
  [character14]: [24, 0, 385, 957],
  [character21]: [33, 19, 432, 947],
  [character22]: [0, 2, 398, 962],
  [character23]: [14, 0, 432, 957],
  [character24]: [0, 3, 429, 957],
  [character31]: [11, 0, 419, 963],
  [character32]: [3, 3, 432, 957],
  [character33]: [20, 6, 423, 957],
  [character34]: [9, 1, 388, 963]
};

const WALK_FRAME_DURATION = 125;

// 19x19 Maze Grid Layout (1 = Wall, 0 = Path)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], // TL Room (cols 1..3), TR Room (cols 15..17)
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // Room entry doors at col 4 and 14
  [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Center Row (player starts at 9, 9)
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // BL Room (cols 1..3), BR Room (cols 15..17)
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Warp Portals (Top <-> Bottom)
const WARP_PORTALS = [
  { x: 9, y: 0, targetX: 9, targetY: 17, exitDir: 'up', color: '#39a99c' },
  { x: 9, y: 18, targetX: 9, targetY: 1, exitDir: 'down', color: '#d89a4e' }
];

// Full-width maze metrics: 19 cells * 32px = 608px world width
const CELL_SIZE = 32;
const MAZE_TILES_COUNT = 19;
const MAZE_WORLD_SIZE = MAZE_TILES_COUNT * CELL_SIZE; // 608px
const MAZE_VIEW_PERCENTAGE = 0.85; // 85% zoom view
const MOBILE_LANDSCAPE_MIN_VISIBLE_ROWS = 9;
const MOBILE_PORTRAIT_QUERY = '((any-pointer: coarse) or (max-width: 600px)) and (orientation: portrait) and (max-width: 800px) and (max-height: 1100px)';
const MOBILE_LANDSCAPE_QUERY = '((any-pointer: coarse) or (max-width: 767px)) and (orientation: landscape) and (max-width: 980px) and (max-height: 600px) and (min-aspect-ratio: 3/2)';
const PLAYER_MOVE_SPEED = 1.25;
const ENEMY_SPEED_REMAINING_RATIO = 0.7;
const isMobileLandscapeViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches;
const isMobilePortraitViewport = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_PORTRAIT_QUERY).matches;

const getLandscapeZoom = (availableWidth: number, availableHeight: number) => {
  const aspectRatio = window.innerWidth / window.innerHeight;
  const magnification = Math.min(1.22, Math.max(1.15, 1.15 + (aspectRatio - 1.6) * 0.08));
  const widthBasedZoom = (availableWidth / MAZE_WORLD_SIZE) * MAZE_VIEW_PERCENTAGE * magnification;
  const heightBasedZoom = availableHeight / (CELL_SIZE * MOBILE_LANDSCAPE_MIN_VISIBLE_ROWS);
  return Math.min(widthBasedZoom, heightBasedZoom);
};

const getPortraitZoom = (availableWidth: number, availableHeight: number) => {
  const visibleColumns = Math.min(11.5, Math.max(9.25, 9.25 + (availableWidth - 320) * 0.012));
  const widthBasedZoom = availableWidth / (CELL_SIZE * visibleColumns);
  const heightBasedZoom = availableHeight / (CELL_SIZE * 9.5);
  return Math.min(widthBasedZoom, heightBasedZoom);
};

const computeInitialMazeZoom = () => {
  if (typeof window !== 'undefined') {
    const estWidth = window.innerWidth >= 1024
      ? Math.min(1920, window.innerWidth) - 380
      : window.innerWidth - 32;
    const zoom = isMobilePortraitViewport()
      ? getPortraitZoom(window.innerWidth - 16, window.innerHeight)
      : isMobileLandscapeViewport()
        ? getLandscapeZoom(estWidth, window.innerHeight)
        : (estWidth / MAZE_WORLD_SIZE) * MAZE_VIEW_PERCENTAGE;
    return { zoomX: zoom, zoomY: zoom };
  }
  return { zoomX: 1.33 * MAZE_VIEW_PERCENTAGE, zoomY: 1.33 * MAZE_VIEW_PERCENTAGE };
};

// Room Centers & Colors
const ROOMS = [
  { id: 0, x: 2, y: 2, label: 'أعلى اليسار', color: '#c79450', glow: 'rgba(247, 213, 138, 0.28)' }, // TL
  { id: 1, x: 16, y: 2, label: 'أعلى اليمين', color: '#c79450', glow: 'rgba(247, 213, 138, 0.28)' }, // TR
  { id: 2, x: 2, y: 16, label: 'أسفل اليسار', color: '#c79450', glow: 'rgba(247, 213, 138, 0.28)' }, // BL
  { id: 3, x: 16, y: 16, label: 'أسفل اليمين', color: '#c79450', glow: 'rgba(247, 213, 138, 0.28)' } // BR
];

const DESERT_PALMS = [
  { x: 7, y: 3, scale: 1 },
  { x: 11, y: 3, scale: 0.82 },
  { x: 2, y: 9, scale: 0.78 },
  { x: 16, y: 9, scale: 0.92 },
  { x: 7, y: 15, scale: 0.86 },
  { x: 11, y: 15, scale: 1 }
];

const DESERT_DETAILS = [
  { x: 1, y: 5, kind: 'rocks' },
  { x: 17, y: 5, kind: 'shrub' },
  { x: 3, y: 7, kind: 'water' },
  { x: 15, y: 7, kind: 'rocks' },
  { x: 1, y: 11, kind: 'shrub' },
  { x: 17, y: 11, kind: 'water' },
  { x: 3, y: 11, kind: 'rocks' },
  { x: 15, y: 11, kind: 'shrub' },
  { x: 1, y: 13, kind: 'water' },
  { x: 17, y: 13, kind: 'rocks' }
] as const;

const ENEMY_SPAWNS = [{ x: 5, y: 5 }, { x: 13, y: 5 }, { x: 5, y: 13 }];

const isSafeDecorationCell = (x: number, y: number) => (
  MAZE_GRID[y]?.[x] === 0
  && !ROOMS.some((room) => Math.abs(x - room.x) <= 1 && Math.abs(y - room.y) <= 1)
  && !WARP_PORTALS.some((portal) => portal.x === x && portal.y === y)
  && !ENEMY_SPAWNS.some((spawn) => Math.abs(x - spawn.x) <= 1 && Math.abs(y - spawn.y) <= 1)
  && (Math.abs(x - 9) > 1 || Math.abs(y - 9) > 1)
);

interface Monster {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  personality: 'chaser' | 'ambusher' | 'wanderer';
  lastDir: 'up' | 'down' | 'left' | 'right' | 'none';
}

interface MazeCanvasProps {
  level: number;
  words: string[]; // 4 words distributed to the 4 rooms
  correctWord: string;
  onCorrect: () => void;
  onWrong: (word: string) => void;
  onLoseLife: () => void;
  lives: number;
  isPaused: boolean;
  externalDirection: string | null; // For on-screen controls
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  level,
  words,
  correctWord,
  onCorrect,
  onWrong,
  onLoseLife,
  lives,
  isPaused,
  externalDirection
}) => {
  const numWords = words.length;

  const activeRooms = useMemo(() => ROOMS.filter(r => r.id < numWords), [numWords]);
  const cagedRooms = useMemo(() => ROOMS.filter(r => r.id >= numWords), [numWords]);


  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const characterImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    Object.values(CHARACTER_FRAMES).flat().forEach((src) => {
      const image = new Image();
      image.onload = () => {
        characterImagesRef.current[src] = image;
      };
      image.src = src;
    });
  }, []);

  // Player state
  const playerRef = useRef({
    x: 9 * 32 + 16,
    y: 9 * 32 + 16,
    gridX: 9,
    gridY: 9,
    targetX: 9,
    targetY: 9,
    speed: PLAYER_MOVE_SPEED,
    dir: 'none',
    nextDir: 'none',
    invincibleFrames: 0,
    facingDir: 'left',
    isMoving: false,
    walkFrame: 0,
    lastWalkFrameAt: 0,
  });

  // Monsters state
  const monstersRef = useRef<Monster[]>([]);

  // Ghost AI mode: alternates between scatter and chase
  const ghostModeRef = useRef<'scatter' | 'chase'>('scatter');
  const ghostTimerRef = useRef<number>(0);

  // Local state for wrong room cooldowns to prevent double triggers
  const lastRoomVisitedRef = useRef<{ id: number; time: number } | null>(null);
  const initialZoom = computeInitialMazeZoom();
  const cameraRef = useRef({ x: 9 * 32 + 16, y: 9 * 32 + 16, zoomX: initialZoom.zoomX, zoomY: initialZoom.zoomY });
  const frameCountRef = useRef(0);
  const lowPowerDeviceRef = useRef(false);
  const mobilePortraitRef = useRef(isMobilePortraitViewport());

  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    const portraitQuery = window.matchMedia(MOBILE_PORTRAIT_QUERY);
    const updatePortraitMode = () => {
      mobilePortraitRef.current = portraitQuery.matches;
    };

    updatePortraitMode();
    portraitQuery.addEventListener('change', updatePortraitMode);
    return () => portraitQuery.removeEventListener('change', updatePortraitMode);
  }, []);

  useEffect(() => {
    lowPowerDeviceRef.current = window.matchMedia(
      '(pointer: coarse), (max-width: 768px), (prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  useEffect(() => {
    if (isPaused) {
      if (pauseStartRef.current === null) {
        pauseStartRef.current = Date.now();
      }
    } else if (pauseStartRef.current !== null) {
      const pausedDuration = Date.now() - pauseStartRef.current;
      ghostTimerRef.current += pausedDuration;
      pauseStartRef.current = null;
    }
  }, [isPaused]);

  useEffect(() => {
    if (isPaused || lives <= 0) {
      const player = playerRef.current;
      player.isMoving = false;
      player.walkFrame = 0;
      gameAudio.stopFootsteps();
    }

    return () => gameAudio.stopFootsteps();
  }, [isPaused, lives]);

  // BFS pathfinding — returns the first direction to move toward target
  const bfsFirstStep = (
    startX: number, startY: number,
    goalX: number, goalY: number,
    walkableCheck: (gx: number, gy: number) => boolean
  ): { dx: number; dy: number; dir: string } | null => {
    // Clamp goal to grid bounds
    const gx = Math.max(0, Math.min(18, goalX));
    const gy = Math.max(0, Math.min(18, goalY));

    if (startX === gx && startY === gy) return null;

    const visited = new Set<string>();
    const queue: { x: number; y: number; firstStep: { dx: number; dy: number; dir: string } }[] = [];

    const dirs = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' }
    ];

    visited.add(`${startX},${startY}`);

    for (const d of dirs) {
      const nx = startX + d.dx;
      const ny = startY + d.dy;
      if (walkableCheck(nx, ny) && !visited.has(`${nx},${ny}`)) {
        if (nx === gx && ny === gy) return d;
        visited.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny, firstStep: d });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const key = `${nx},${ny}`;
        if (!visited.has(key) && walkableCheck(nx, ny)) {
          if (nx === gx && ny === gy) return current.firstStep;
          visited.add(key);
          queue.push({ x: nx, y: ny, firstStep: current.firstStep });
        }
      }
    }

    // No path found — fallback: pick any walkable adjacent tile
    for (const d of dirs) {
      if (walkableCheck(startX + d.dx, startY + d.dy)) return d;
    }
    return null;
  };

  // Background Cache Canvas
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-render the static background whenever cagedRooms changes
  useEffect(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
    }
    const bgCanvas = bgCanvasRef.current;
    const bCtx = bgCanvas.getContext('2d');
    if (!bCtx) return;

    bgCanvas.width = 19 * cellSize;
    bgCanvas.height = 19 * cellSize;

    const sandGradient = bCtx.createLinearGradient(0, 0, bgCanvas.width, bgCanvas.height);
    sandGradient.addColorStop(0, '#f0d7a1');
    sandGradient.addColorStop(0.52, '#e8c994');
    sandGradient.addColorStop(1, '#ddb77d');
    bCtx.fillStyle = sandGradient;
    bCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Subtle sand tiles and scattered grains keep paths distinct without clutter.
    bCtx.strokeStyle = 'rgba(145, 98, 61, 0.18)';
    bCtx.lineWidth = 1;
    for (let i = 0; i <= 19; i++) {
      bCtx.beginPath();
      bCtx.moveTo(i * cellSize, 0);
      bCtx.lineTo(i * cellSize, 19 * cellSize);
      bCtx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(0, i * cellSize);
      bCtx.lineTo(19 * cellSize, i * cellSize);
      bCtx.stroke();
    }

    for (let r = 0; r < 19; r++) {
      for (let c = 0; c < 19; c++) {
        if (MAZE_GRID[r][c] === 0 && (r * 17 + c * 11) % 4 === 0) {
          const grainX = c * cellSize + 6 + ((r * 7 + c * 3) % 19);
          const grainY = r * cellSize + 5 + ((r * 5 + c * 13) % 20);
          bCtx.fillStyle = 'rgba(255, 247, 220, 0.42)';
          bCtx.fillRect(grainX, grainY, 2, 1);
          bCtx.fillStyle = 'rgba(145, 98, 61, 0.12)';
          bCtx.fillRect(grainX + 5, grainY + 4, 1, 1);
        }
      }
    }

    // Warm courtyard paving replaces the former neon room highlights.
    ROOMS.forEach((room) => {
      bCtx.fillStyle = room.glow;
      bCtx.fillRect((room.x - 1) * cellSize, (room.y - 1) * cellSize, cellSize * 3, cellSize * 3);

      bCtx.strokeStyle = room.color;
      bCtx.lineWidth = 1.5;
      bCtx.strokeRect((room.x - 1) * cellSize, (room.y - 1) * cellSize, cellSize * 3, cellSize * 3);

    });

    // The existing warp tiles are styled as small oasis wells.
    WARP_PORTALS.forEach((portal) => {
      const x = portal.x * cellSize + cellSize / 2;
      const y = portal.y * cellSize + cellSize / 2;
      bCtx.fillStyle = '#91623d';
      bCtx.beginPath();
      bCtx.arc(x, y, 13, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#c8955d';
      bCtx.beginPath();
      bCtx.arc(x, y, 10, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#43b9b2';
      bCtx.beginPath();
      bCtx.arc(x, y, 7, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.strokeStyle = 'rgba(248, 233, 203, 0.75)';
      bCtx.lineWidth = 1;
      bCtx.beginPath();
      bCtx.arc(x, y, 4, 0, Math.PI * 2);
      bCtx.stroke();
    });

    // Sandstone blocks retain the existing maze geometry and collision grid.
    for (let r = 0; r < 19; r++) {
      for (let c = 0; c < 19; c++) {
        let isWall = MAZE_GRID[r][c] === 1;

        // Dynamically turn caged rooms into walls
        for (const room of cagedRooms) {
          if (Math.abs(c - room.x) <= 1 && Math.abs(r - room.y) <= 1) isWall = true;
        }

        if (isWall) {
          const x = c * cellSize;
          const y = r * cellSize;

          bCtx.fillStyle = '#91623d';
          bCtx.fillRect(x, y, cellSize, cellSize);
          bCtx.fillStyle = ((r + c) % 2 === 0) ? '#c8955d' : '#c18a52';
          bCtx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          bCtx.fillStyle = '#e5bc7e';
          bCtx.fillRect(x + 3, y + 3, cellSize - 6, 3);
          bCtx.fillStyle = 'rgba(116, 72, 39, 0.28)';
          bCtx.fillRect(x + 3, y + cellSize - 4, cellSize - 6, 2);
          bCtx.strokeStyle = 'rgba(112, 73, 43, 0.5)';
          bCtx.lineWidth = 1;
          bCtx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);

          if ((r * 13 + c * 7) % 5 === 0) {
            bCtx.fillStyle = 'rgba(248, 233, 203, 0.38)';
            bCtx.fillRect(x + 7 + ((r + c) % 9), y + 12 + ((r * 3 + c) % 7), 5, 1);
            bCtx.fillStyle = 'rgba(116, 72, 39, 0.2)';
            bCtx.fillRect(x + 17 + ((r * 5 + c) % 5), y + 20, 3, 1);
          }
        }
      }
    }

    DESERT_PALMS.forEach(({ x, y, scale }) => {
      if (!isSafeDecorationCell(x, y)) return;
      const palmX = x * cellSize + cellSize / 2;
      const palmY = y * cellSize + cellSize / 2;
      const canopySize = 9 * scale;

      bCtx.fillStyle = 'rgba(92, 63, 35, 0.2)';
      bCtx.beginPath();
      bCtx.ellipse(palmX + 3, palmY + 5, canopySize * 0.9, canopySize * 0.55, -0.3, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#8a5b35';
      bCtx.beginPath();
      bCtx.ellipse(palmX, palmY + 2, 3 * scale, 4 * scale, -0.25, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#c9975b';
      bCtx.beginPath();
      bCtx.ellipse(palmX - 0.8, palmY + 1, 1.2 * scale, 3.2 * scale, -0.25, 0, Math.PI * 2);
      bCtx.fill();

      for (let leaf = 0; leaf < 8; leaf++) {
        const angle = -Math.PI / 2 + leaf * Math.PI / 4;
        const length = canopySize * (leaf % 2 === 0 ? 1 : 0.78);
        const tipX = palmX + Math.cos(angle) * length;
        const tipY = palmY + Math.sin(angle) * length * 0.72;
        const controlX = palmX + Math.cos(angle) * length * 0.62 - Math.sin(angle) * 2.5;
        const controlY = palmY + Math.sin(angle) * length * 0.5 + Math.cos(angle) * 2.5;

        bCtx.strokeStyle = leaf % 3 === 0 ? '#397b55' : '#286346';
        bCtx.lineWidth = 2 * scale;
        bCtx.lineCap = 'round';
        bCtx.beginPath();
        bCtx.moveTo(palmX, palmY);
        bCtx.quadraticCurveTo(controlX, controlY, tipX, tipY);
        bCtx.stroke();
        bCtx.strokeStyle = 'rgba(190, 211, 125, 0.78)';
        bCtx.lineWidth = 0.7;
        bCtx.beginPath();
        bCtx.moveTo(palmX + Math.cos(angle) * 3, palmY + Math.sin(angle) * 2);
        bCtx.lineTo(tipX, tipY);
        bCtx.stroke();
      }

      bCtx.fillStyle = '#d6a94e';
      bCtx.beginPath();
      bCtx.arc(palmX, palmY, 1.8, 0, Math.PI * 2);
      bCtx.fill();
    });

    DESERT_DETAILS.forEach(({ x, y, kind }) => {
      if (!isSafeDecorationCell(x, y)) return;
      const detailX = x * cellSize + cellSize / 2;
      const detailY = y * cellSize + cellSize / 2;

      if (kind === 'water') {
        bCtx.fillStyle = 'rgba(92, 63, 35, 0.16)';
        bCtx.beginPath();
        bCtx.ellipse(detailX + 1, detailY + 2, 7, 4.5, -0.2, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#279fae';
        bCtx.beginPath();
        bCtx.ellipse(detailX, detailY, 6, 3.5, -0.2, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.strokeStyle = 'rgba(248, 233, 203, 0.8)';
        bCtx.lineWidth = 1;
        bCtx.beginPath();
        bCtx.ellipse(detailX - 1, detailY - 0.5, 2.5, 1, -0.2, 0, Math.PI * 2);
        bCtx.stroke();
      } else if (kind === 'rocks') {
        bCtx.fillStyle = 'rgba(92, 63, 35, 0.18)';
        bCtx.beginPath();
        bCtx.ellipse(detailX + 2, detailY + 3, 7, 3.5, 0.15, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#b98149';
        bCtx.beginPath();
        bCtx.ellipse(detailX - 2, detailY, 4.5, 3.5, -0.3, 0, Math.PI * 2);
        bCtx.ellipse(detailX + 3, detailY + 1, 3, 2.5, 0.2, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#f3ddb8';
        bCtx.fillRect(detailX - 3, detailY - 1.5, 3, 1);
      } else {
        bCtx.fillStyle = 'rgba(92, 63, 35, 0.16)';
        bCtx.beginPath();
        bCtx.ellipse(detailX + 1, detailY + 3, 6, 3, 0, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#397b55';
        bCtx.beginPath();
        bCtx.ellipse(detailX - 2, detailY, 3.2, 2, -0.4, 0, Math.PI * 2);
        bCtx.ellipse(detailX + 2, detailY - 1, 3.5, 2.2, 0.4, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.fillStyle = '#d6a94e';
        bCtx.fillRect(detailX, detailY - 2, 1, 1);
      }
    });
  }, [cagedRooms]);

  const activeDPadDirRef = useRef<string | null>(null);

  const cellSize = 32;

  const computeMazeZoom = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const zoom = isMobilePortraitViewport()
          ? getPortraitZoom(rect.width, rect.height)
          : isMobileLandscapeViewport()
            ? getLandscapeZoom(rect.width, rect.height)
            : (rect.width / MAZE_WORLD_SIZE) * MAZE_VIEW_PERCENTAGE;
        return { zoomX: zoom, zoomY: zoom };
      }
    }
    if (typeof window !== 'undefined') {
      const estWidth = window.innerWidth >= 1024
        ? Math.min(1920, window.innerWidth) - 380
        : window.innerWidth - 32;
      const zoom = isMobilePortraitViewport()
        ? getPortraitZoom(window.innerWidth - 16, window.innerHeight)
        : isMobileLandscapeViewport()
          ? getLandscapeZoom(estWidth, window.innerHeight)
          : (estWidth / MAZE_WORLD_SIZE) * MAZE_VIEW_PERCENTAGE;
      return { zoomX: zoom, zoomY: zoom };
    }
    return { zoomX: 1.33 * MAZE_VIEW_PERCENTAGE, zoomY: 1.33 * MAZE_VIEW_PERCENTAGE };
  };

  // Initialize monsters
  const resetEntities = () => {
    // Reset player
    playerRef.current = {
      x: 9 * cellSize + cellSize / 2,
      y: 9 * cellSize + cellSize / 2,
      gridX: 9,
      gridY: 9,
      targetX: 9,
      targetY: 9,
      speed: PLAYER_MOVE_SPEED,
      dir: 'none',
      nextDir: 'none',
      invincibleFrames: 120, // 2 seconds safety on level start
      facingDir: 'left',
      isMoving: false,
      walkFrame: 0,
      lastWalkFrameAt: 0,
    };

    const targetZoom = computeMazeZoom();

    cameraRef.current = {
      x: 9 * cellSize + cellSize / 2,
      y: 9 * cellSize + cellSize / 2,
      zoomX: targetZoom.zoomX,
      zoomY: targetZoom.zoomY
    };

    // Keep the existing level/device tuning, then reduce it by 30% so enemies
    // remain capable of chasing without overwhelming the player.
    const isMobileDevice = lowPowerDeviceRef.current;
    const isEasyDevice = isMobileDevice || (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
    let chaserSpeed = isEasyDevice ? 0.78 : 1.3;
    let ambusherSpeed = isEasyDevice ? 0.66 : 1.1;
    let wandererSpeed = isEasyDevice ? 0.56 : 0.9;
    if (level >= 2 && level <= 4) {
      chaserSpeed = isEasyDevice ? 0.84 : 1.4;
      ambusherSpeed = isEasyDevice ? 0.72 : 1.2;
      wandererSpeed = isEasyDevice ? 0.62 : 1.0;
    } else if (level >= 5) {
      chaserSpeed = isEasyDevice ? 0.9 : 1.5;
      ambusherSpeed = isEasyDevice ? 0.78 : 1.3;
      wandererSpeed = isEasyDevice ? 0.68 : 1.1;
    }

    chaserSpeed *= ENEMY_SPEED_REMAINING_RATIO;
    ambusherSpeed = chaserSpeed;
    wandererSpeed *= ENEMY_SPEED_REMAINING_RATIO;

    ghostModeRef.current = 'scatter';
    ghostTimerRef.current = Date.now();

    monstersRef.current = [
      {
        x: 5 * cellSize + cellSize / 2,
        y: 5 * cellSize + cellSize / 2,
        gridX: 5,
        gridY: 5,
        targetX: 5,
        targetY: 5,
        speed: chaserSpeed,
        color: '#b9633e', // Terracotta: Chaser
        personality: 'chaser',
        lastDir: 'none'
      },
      {
        x: 13 * cellSize + cellSize / 2,
        y: 5 * cellSize + cellSize / 2,
        gridX: 13,
        gridY: 5,
        targetX: 13,
        targetY: 5,
        speed: ambusherSpeed,
        color: '#438875', // Oasis green: Ambusher
        personality: 'ambusher',
        lastDir: 'none'
      },
      {
        x: 5 * cellSize + cellSize / 2,
        y: 13 * cellSize + cellSize / 2,
        gridX: 5,
        gridY: 13,
        targetX: 5,
        targetY: 13,
        speed: wandererSpeed,
        color: '#d6a64f', // Sunlit gold: Wanderer
        personality: 'wanderer',
        lastDir: 'none'
      }
    ];

    lastRoomVisitedRef.current = null;
  };

  // Reset when words/level changes
  useEffect(() => {
    resetEntities();
  }, [words]);

  const externalDirectionRef = useRef<string | null>(null);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Sync external direction (touch/mouse hold)
  useEffect(() => {
    externalDirectionRef.current = externalDirection;
  }, [externalDirection]);

  // Handle keyboard inputs with held down tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || lives <= 0) return;

      const trackedKeys = ['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S', 'ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'];
      if (trackedKeys.includes(e.key)) {
        e.preventDefault();
      }

      keysPressedRef.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    const handleBlur = () => {
      keysPressedRef.current = {};
      externalDirectionRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPaused, lives]);

  const getDesiredDirection = (): string | null => {
    if (activeDPadDirRef.current) {
      return activeDPadDirRef.current;
    }
    if (externalDirectionRef.current) {
      return externalDirectionRef.current;
    }
    const keys = keysPressedRef.current;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) return 'up';
    if (keys['ArrowDown'] || keys['s'] || keys['S']) return 'down';
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) return 'left';
    if (keys['ArrowRight'] || keys['d'] || keys['D']) return 'right';
    return null;
  };



  const isWalkable = (gx: number, gy: number, isMonster: boolean = false): boolean => {
    if (gx < 0 || gx >= 19 || gy < 0 || gy >= 19) return false;

    if (isMonster) {
      // Monsters cannot enter any room
      for (const room of ROOMS) {
        if (Math.abs(gx - room.x) <= 1 && Math.abs(gy - room.y) <= 1) return false;
      }
    } else {
      // Player cannot enter caged rooms
      for (const room of cagedRooms) {
        if (Math.abs(gx - room.x) <= 1 && Math.abs(gy - room.y) <= 1) return false;
      }
    }


    return MAZE_GRID[gy][gx] !== 1;
  };

  // Main game loop inside requestAnimationFrame
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    const resizeCanvas = () => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      // Keep a 2x backing buffer for crisp pixel art while letting the CSS
      // canvas fill the complete responsive maze wrapper.
      const nextWidth = Math.max(1, Math.floor(bounds.width * 2));
      const nextHeight = Math.max(1, Math.floor(bounds.height * 2));
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;

      const nextZoom = computeMazeZoom();
      cameraRef.current.zoomX = nextZoom.zoomX;
      cameraRef.current.zoomY = nextZoom.zoomY;
    };

    resizeCanvas();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resizeCanvas)
      : null;
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const updateGame = () => {
      if (isPaused || lives <= 0) return;

      const player = playerRef.current;
      const previousX = player.x;
      const previousY = player.y;

      // 1. Move Player
      const targetPx = player.targetX * cellSize + cellSize / 2;
      const targetPy = player.targetY * cellSize + cellSize / 2;

      // Interpolate position
      if (player.x < targetPx) player.x = Math.min(player.x + player.speed, targetPx);
      else if (player.x > targetPx) player.x = Math.max(player.x - player.speed, targetPx);

      if (player.y < targetPy) player.y = Math.min(player.y + player.speed, targetPy);
      else if (player.y > targetPy) player.y = Math.max(player.y - player.speed, targetPy);

      // Decrement invincibility
      if (player.invincibleFrames > 0) {
        player.invincibleFrames--;
      }

      // Check if player has arrived at target tile
      if (player.x === targetPx && player.y === targetPy) {
        player.gridX = player.targetX;
        player.gridY = player.targetY;

        // Check if player stepped on a warp portal
        const steppedPortal = WARP_PORTALS.find(p => p.x === player.gridX && p.y === player.gridY);
        if (steppedPortal) {
          gameAudio.playPortalTeleport();
          player.x = steppedPortal.targetX * cellSize + cellSize / 2;
          player.y = steppedPortal.targetY * cellSize + cellSize / 2;
          player.gridX = steppedPortal.targetX;
          player.gridY = steppedPortal.targetY;
          player.targetX = steppedPortal.targetX;
          player.targetY = steppedPortal.targetY;
          player.dir = steppedPortal.exitDir as any;
          player.nextDir = steppedPortal.exitDir as any;
          player.invincibleFrames = Math.max(player.invincibleFrames, 30);
        }

        const desiredDir = getDesiredDirection();
        let dX = 0;
        let dY = 0;

        if (desiredDir) {
          if (desiredDir === 'up' && isWalkable(player.gridX, player.gridY - 1)) {
            dY = -1;
            player.facingDir = 'up';
          }
          else if (desiredDir === 'down' && isWalkable(player.gridX, player.gridY + 1)) {
            dY = 1;
            player.facingDir = 'down';
          }
          else if (desiredDir === 'left' && isWalkable(player.gridX - 1, player.gridY)) {
            dX = -1;
            player.facingDir = 'left';
          }
          else if (desiredDir === 'right' && isWalkable(player.gridX + 1, player.gridY)) {
            dX = 1;
            player.facingDir = 'right';
          }

          if (dX !== 0 || dY !== 0) {
            player.dir = desiredDir;
            player.targetX = player.gridX + dX;
            player.targetY = player.gridY + dY;
          } else {
            player.dir = 'none';
          }
        } else {
          player.dir = 'none';
        }
      }

      const moved = player.x !== previousX || player.y !== previousY;
      const nextTargetPx = player.targetX * cellSize + cellSize / 2;
      const nextTargetPy = player.targetY * cellSize + cellSize / 2;
      const targetAhead = player.x !== nextTargetPx || player.y !== nextTargetPy;
      const movementTime = performance.now();

      if (moved) {
        if (!player.isMoving) {
          player.walkFrame = 0;
          player.lastWalkFrameAt = movementTime;
        } else if (movementTime - player.lastWalkFrameAt >= WALK_FRAME_DURATION) {
          const elapsedFrames = Math.floor((movementTime - player.lastWalkFrameAt) / WALK_FRAME_DURATION);
          player.walkFrame = (player.walkFrame + elapsedFrames) % 2;
          player.lastWalkFrameAt += elapsedFrames * WALK_FRAME_DURATION;
        }

        player.isMoving = true;
        gameAudio.playFootstep();
      } else if (targetAhead) {
        if (!player.isMoving) {
          player.walkFrame = 0;
          player.lastWalkFrameAt = movementTime;
        }
        player.isMoving = true;
      } else {
        player.isMoving = false;
        player.walkFrame = 0;
        gameAudio.stopFootsteps();
      }

      // Update camera smooth follow with boundary clamping
      const camera = cameraRef.current;
      const isPortraitCamera = mobilePortraitRef.current;
      const deadZone = isPortraitCamera ? cellSize * 0.75 : 0;
      const cameraTargetX = isPortraitCamera
        ? player.x - Math.sign(player.x - camera.x) * Math.min(Math.abs(player.x - camera.x), deadZone)
        : player.x;
      const cameraTargetY = isPortraitCamera
        ? player.y - Math.sign(player.y - camera.y) * Math.min(Math.abs(player.y - camera.y), deadZone)
        : player.y;
      const teleported = Math.abs(player.x - previousX) > cellSize || Math.abs(player.y - previousY) > cellSize;
      const camLerp = isPortraitCamera ? 0.18 : 0.1;

      if (isPortraitCamera && teleported) {
        camera.x = player.x;
        camera.y = player.y;
      } else {
        camera.x += (cameraTargetX - camera.x) * camLerp;
        camera.y += (cameraTargetY - camera.y) * camLerp;
      }

      const zoomX = camera.zoomX;
      const zoomY = camera.zoomY;
      const visibleWidth = Math.min(MAZE_WORLD_SIZE, canvas.width / (2 * zoomX));
      const visibleHeight = Math.min(MAZE_WORLD_SIZE, canvas.height / (2 * zoomY));
      const minX = visibleWidth / 2;
      const maxX = MAZE_WORLD_SIZE - minX;
      const minY = visibleHeight / 2;
      const maxY = MAZE_WORLD_SIZE - minY;

      camera.x = minX < maxX ? Math.max(minX, Math.min(maxX, camera.x)) : MAZE_WORLD_SIZE / 2;
      camera.y = minY < maxY ? Math.max(minY, Math.min(maxY, camera.y)) : MAZE_WORLD_SIZE / 2;

      // Ghost Mode Timer (Scatter / Chase)
      const now = Date.now();
      const modeElapsed = now - ghostTimerRef.current;
      if (ghostModeRef.current === 'scatter' && modeElapsed > 7000) {
        ghostModeRef.current = 'chase';
        ghostTimerRef.current = now;
      } else if (ghostModeRef.current === 'chase' && modeElapsed > 20000) {
        ghostModeRef.current = 'scatter';
        ghostTimerRef.current = now;
      }

      // 2. Move Monsters (BFS pathfinding + Pac-Man personality system)
      const monsters = monstersRef.current;
      frameCountRef.current++;

      monsters.forEach((monster) => {
        const mTargetPx = monster.targetX * cellSize + cellSize / 2;
        const mTargetPy = monster.targetY * cellSize + cellSize / 2;

        // Interpolate position smoothly toward target tile
        if (monster.x < mTargetPx) monster.x = Math.min(monster.x + monster.speed, mTargetPx);
        else if (monster.x > mTargetPx) monster.x = Math.max(monster.x - monster.speed, mTargetPx);

        if (monster.y < mTargetPy) monster.y = Math.min(monster.y + monster.speed, mTargetPy);
        else if (monster.y > mTargetPy) monster.y = Math.max(monster.y - monster.speed, mTargetPy);

        // Arrived at target tile — pick the next tile to move to
        if (monster.x === mTargetPx && monster.y === mTargetPy) {
          monster.gridX = monster.targetX;
          monster.gridY = monster.targetY;

          // Determine the target cell based on mode + personality
          let goalCell = { x: player.gridX, y: player.gridY };

          if (ghostModeRef.current === 'scatter') {
            // Scatter: each monster retreats to its own corner
            if (monster.personality === 'chaser') goalCell = { x: 17, y: 1 };
            else if (monster.personality === 'ambusher') goalCell = { x: 1, y: 1 };
            else if (monster.personality === 'wanderer') goalCell = { x: 1, y: 17 };
          } else {
            // Chase: personality-driven targeting
            if (monster.personality === 'chaser') {
              // Blinky: directly targets the player
              goalCell = { x: player.gridX, y: player.gridY };
            } else if (monster.personality === 'ambusher') {
              // Inky: targets 4 tiles ahead of where the player is facing
              let pDx = 0, pDy = 0;
              if (player.facingDir === 'up') pDy = -4;
              if (player.facingDir === 'down') pDy = 4;
              if (player.facingDir === 'left') pDx = -4;
              if (player.facingDir === 'right') pDx = 4;
              goalCell = {
                x: Math.max(0, Math.min(18, player.gridX + pDx)),
                y: Math.max(0, Math.min(18, player.gridY + pDy))
              };
            } else if (monster.personality === 'wanderer') {
              // Clyde: chases most of the time, flanks when close
              const dist = Math.abs(monster.gridX - player.gridX) + Math.abs(monster.gridY - player.gridY);
              if (dist > 4) {
                // Far away: hunt the player directly
                goalCell = { x: player.gridX, y: player.gridY };
              } else {
                // Close: flank from the opposite side of the player
                const flankX = Math.max(0, Math.min(18, player.gridX + (player.gridX - monster.gridX)));
                const flankY = Math.max(0, Math.min(18, player.gridY + (player.gridY - monster.gridY)));
                goalCell = { x: flankX, y: flankY };
              }
            }
          }

          // Use BFS to find the best first step toward the goal
          const bfsResult = bfsFirstStep(
            monster.gridX, monster.gridY,
            goalCell.x, goalCell.y,
            (x, y) => isWalkable(x, y, true)
          );

          if (bfsResult) {
            // Prevent reversing direction unless it's the only option (dead end)
            const opposites: Record<string, string> = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const isReverse = monster.lastDir !== 'none' && bfsResult.dir === opposites[monster.lastDir];

            if (!isReverse) {
              monster.targetX = monster.gridX + bfsResult.dx;
              monster.targetY = monster.gridY + bfsResult.dy;
              monster.lastDir = bfsResult.dir as Monster['lastDir'];
            } else {
              // BFS wants to reverse — check if there are other walkable options
              const dirs = [
                { dx: 0, dy: -1, dir: 'up' },
                { dx: 0, dy: 1, dir: 'down' },
                { dx: -1, dy: 0, dir: 'left' },
                { dx: 1, dy: 0, dir: 'right' }
              ];
              const alternatives = dirs.filter(d =>
                d.dir !== opposites[monster.lastDir] &&
                isWalkable(monster.gridX + d.dx, monster.gridY + d.dy, true)
              );

              if (alternatives.length > 0) {
                // Pick a random alternative to avoid predictability
                const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
                monster.targetX = monster.gridX + alt.dx;
                monster.targetY = monster.gridY + alt.dy;
                monster.lastDir = alt.dir as Monster['lastDir'];
              } else {
                // True dead end — must reverse
                monster.targetX = monster.gridX + bfsResult.dx;
                monster.targetY = monster.gridY + bfsResult.dy;
                monster.lastDir = bfsResult.dir as Monster['lastDir'];
              }
            }
          }
          // If no BFS result, monster stays put (shouldn't happen in practice)
        }
      });

      // 3. Collision Checks (Player vs Monsters)
      if (player.invincibleFrames === 0) {
        monsters.forEach((monster) => {
          const dx = player.x - monster.x;
          const dy = player.y - monster.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Overlap check (hitbox 16px)
          if (dist < 16) {
            gameAudio.playHit();
            onLoseLife();

            // Flash and reset positions with extra invincibility (3s)
            player.invincibleFrames = 180;
            player.x = 9 * cellSize + cellSize / 2;
            player.y = 9 * cellSize + cellSize / 2;
            player.gridX = 9;
            player.gridY = 9;
            player.targetX = 9;
            player.targetY = 9;
            player.dir = 'none';
            player.nextDir = 'none';
            player.facingDir = 'left';

            // Reset monsters positions
            const spawnPositions = [
              { gx: 5, gy: 5 },
              { gx: 13, gy: 5 },
              { gx: 5, gy: 13 }
            ];
            monsters.forEach((m, i) => {
              const sp = spawnPositions[i];
              m.x = sp.gx * cellSize + cellSize / 2;
              m.y = sp.gy * cellSize + cellSize / 2;
              m.gridX = sp.gx;
              m.gridY = sp.gy;
              m.targetX = sp.gx;
              m.targetY = sp.gy;
              m.lastDir = 'none';
            });
          }
        });
      }

      // 4. Room Detection (Player inside corner rooms)
      activeRooms.forEach((room) => {
        // If player enters any tile within the 3x3 room
        if (Math.abs(player.gridX - room.x) <= 1 && Math.abs(player.gridY - room.y) <= 1) {
          const now = Date.now();
          const lastVisited = lastRoomVisitedRef.current;

          // Prevent immediate duplicate triggering
          if (lastVisited && lastVisited.id === room.id && now - lastVisited.time < 3000) {
            return;
          }

          const wordInRoom = words[room.id];
          lastRoomVisitedRef.current = { id: room.id, time: now };

          if (wordInRoom === correctWord) {
            player.isMoving = false;
            player.dir = 'none';
            player.targetX = player.gridX;
            player.targetY = player.gridY;
            gameAudio.stopFootsteps();
            onCorrect();
          } else {
            gameAudio.playWrong();
            onWrong(wordInRoom);

            // Teleport back to center on wrong answer
            player.x = 9 * cellSize + cellSize / 2;
            player.y = 9 * cellSize + cellSize / 2;
            player.gridX = 9;
            player.gridY = 9;
            player.targetX = 9;
            player.targetY = 9;
            player.dir = 'down';
            player.nextDir = 'down';

            // Give some invincibility frames so they aren't instantly killed if a monster is at the center
            player.invincibleFrames = Math.max(player.invincibleFrames, 60);
          }
        }
      });


    };

    const drawGame = () => {
      ctx.fillStyle = '#e8c994';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(2, 2);
      const zoomX = cameraRef.current.zoomX;
      const zoomY = cameraRef.current.zoomY;
      ctx.translate(canvas.width / 4, canvas.height / 4);
      ctx.scale(zoomX, zoomY);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      const stretchRatio = zoomY > 0 ? (zoomX / zoomY) : 1;

      const player = playerRef.current;
      const monsters = monstersRef.current;

      // Draw cached static background
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0, 19 * cellSize, 19 * cellSize);
      }

      // 2.5 Draw Warp Portals
      // Portal effects are intentionally kept lightweight on touch/mobile devices.
      // The old version created multiple gradients, shadow blurs, and 80 path points
      // for every portal on every animation frame, which caused a noticeable frame
      // drop when a portal entered the camera viewport.
      const now = Date.now();
      const visibleWorldWidth = canvas.width / (2 * zoomX);
      const visibleWorldHeight = canvas.height / (2 * zoomY);
      const halfVisibleWidth = visibleWorldWidth / 2;
      const halfVisibleHeight = visibleWorldHeight / 2;
      const isLowPowerDevice = lowPowerDeviceRef.current;

      WARP_PORTALS.forEach((portal) => {
        const px = portal.x * cellSize + cellSize / 2;
        const py = portal.y * cellSize + cellSize / 2;

        // Avoid doing any portal animation work while it is outside the camera.
        if (
          Math.abs(px - cameraRef.current.x) > halfVisibleWidth + cellSize ||
          Math.abs(py - cameraRef.current.y) > halfVisibleHeight + cellSize
        ) {
          return;
        }

        const baseAngle = (now / 600) % (Math.PI * 2);
        const radius = cellSize / 2;

        ctx.save();
        ctx.translate(px, py);
        if (stretchRatio !== 1) {
          ctx.scale(1 / stretchRatio, 1);
        }
        ctx.translate(-px, -py);

        if (isLowPowerDevice) {
          // A single rotating arc preserves the portal cue without the expensive
          // gradients and shadowBlur operations that are costly on mobile GPUs.
          ctx.save();
          ctx.fillStyle = '#237f7d';
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#e5bc7e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = portal.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, radius - 4, baseAngle, baseAngle + Math.PI * 1.35);
          ctx.stroke();

          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, radius + 2, baseAngle + Math.PI, baseAngle + Math.PI * 1.75);
          ctx.stroke();
          ctx.restore();
          ctx.restore();
          return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#237f7d';
        ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);

        for (let layer = 1; layer <= 2; layer++) {
          const layerAngle = baseAngle * (layer % 2 === 0 ? 1 : -1) / layer;
          const nebulaGrad = ctx.createRadialGradient(
            px + Math.cos(layerAngle) * radius * 0.25,
            py + Math.sin(layerAngle) * radius * 0.25,
            0,
            px, py, radius * 0.9
          );
          const alpha = 0.15 + Math.sin(now / 400 + layer) * 0.05;
          nebulaGrad.addColorStop(0, portal.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
          nebulaGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = nebulaGrad;
          ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
        }

        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        for (let arm = 0; arm < 2; arm++) {
          ctx.beginPath();
          for (let t = 0; t < 40; t++) {
            const angle = baseAngle * 2 + (arm * Math.PI) + (t * 0.15);
            const r = (t / 40) * radius;
            const x = px + Math.cos(angle) * r;
            const y = py + Math.sin(angle) * r;
            if (t === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        ctx.restore();

        ctx.save();
        ctx.shadowColor = '#795235';
        ctx.shadowBlur = 3;
        ctx.strokeStyle = '#e5bc7e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowColor = portal.color;
        ctx.shadowBlur = 5;
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, radius - 4, 0, Math.PI * 2);
        ctx.stroke();

        const pulse = 0.5 + Math.sin(now / 300) * 0.3;
        ctx.strokeStyle = portal.color + Math.floor(pulse * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, radius + 2 + Math.sin(now / 200) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      });

      // 3. Draw room answers; shrink long labels to keep them inside the room.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      activeRooms.forEach((room) => {
        const textX = room.x * cellSize + cellSize / 2;
        const textY = room.y * cellSize + cellSize / 2;
        const answerText = words[room.id] || '';
        const maxTextWidth = cellSize * 2.8;
        let fontSize = Math.min(24, cellSize * 0.75);

        ctx.save();
        ctx.translate(textX, textY);
        if (stretchRatio !== 1) {
          ctx.scale(1 / stretchRatio, 1);
        }
        ctx.translate(-textX, -textY);

        ctx.font = `bold ${fontSize}px FontGame`;
        while (fontSize > 9 && ctx.measureText(answerText).width > maxTextWidth) {
          fontSize -= 1;
          ctx.font = `bold ${fontSize}px FontGame`;
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f8e9cb';
        ctx.strokeText(answerText, textX, textY, maxTextWidth);
        ctx.fillStyle = '#60452d';
        ctx.fillText(answerText, textX, textY, maxTextWidth);
        ctx.restore();
      });

      // 4. Draw Player
      const isInvincible = player.invincibleFrames > 0;
      // Flashing effect during invincibility
      if (!isInvincible || Math.floor(player.invincibleFrames / 5) % 2 === 0) {

        const facing = player.facingDir as FacingDirection;
        const frames = CHARACTER_FRAMES[facing];
        const frameSrc = frames[player.isMoving ? player.walkFrame + 1 : 0];
        const selectedSrc = characterImagesRef.current[frameSrc] ? frameSrc : frames[0];
        const currentImg = characterImagesRef.current[selectedSrc];

        if (currentImg) {
          const [sourceLeft, sourceTop, sourceRight, sourceBottom] = CHARACTER_ALPHA_BOUNDS[selectedSrc];
          const spriteHeight = 36;
          const sourceWidth = sourceRight - sourceLeft;
          const sourceHeight = sourceBottom - sourceTop;
          const spriteWidth = sourceWidth * (spriteHeight / sourceHeight);

          ctx.save();
          ctx.translate(player.x, player.y);
          if (stretchRatio !== 1) {
            ctx.scale(1 / stretchRatio, 1);
          }
          ctx.fillStyle = 'rgba(92, 63, 35, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, cellSize / 2 - 1, spriteWidth * 0.43, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = isInvincible ? 0.9 : 1;
          ctx.drawImage(
            currentImg,
            sourceLeft,
            sourceTop,
            sourceWidth,
            sourceHeight,
            -spriteWidth / 2,
            cellSize / 2 - spriteHeight,
            spriteWidth,
            spriteHeight
          );
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(player.x, player.y);
          if (stretchRatio !== 1) {
            ctx.scale(1 / stretchRatio, 1);
          }
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#fff01f';
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Draw desert beetle guardians, retaining the existing enemy positions.
      const frame = frameCountRef.current;
      monsters.forEach((monster) => {
        const mx = monster.x;
        const my = monster.y;
        const legSwing = Math.sin(frame * 0.15) * 1.5;

        ctx.save();
        ctx.translate(mx, my);
        if (stretchRatio !== 1) {
          ctx.scale(1 / stretchRatio, 1);
        }
        ctx.translate(-mx, -my);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#795235';
        for (const side of [-1, 1]) {
          for (const leg of [-1, 0, 1]) {
            const legY = my + leg * 4;
            ctx.beginPath();
            ctx.moveTo(mx + side * 6, legY);
            ctx.lineTo(mx + side * (10 + legSwing * side), legY + leg * 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = '#795235';
        ctx.beginPath();
        ctx.ellipse(mx, my + 1, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = monster.color;
        ctx.beginPath();
        ctx.ellipse(mx, my - 1, 8, 7, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(mx + 8, my + 2);
        ctx.quadraticCurveTo(mx, my + 6, mx - 8, my + 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(248, 233, 203, 0.72)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx, my, 5, Math.PI + 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();

        ctx.fillStyle = '#f8e9cb';
        ctx.beginPath();
        ctx.arc(mx - 3, my - 1, 2, 0, Math.PI * 2);
        ctx.arc(mx + 3, my - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#423326';
        let pupilDx = 0;
        let pupilDy = 0;

        const mDir = monster.lastDir || 'none';

        if (mDir === 'up') pupilDy = -1.5;
        else if (mDir === 'down') pupilDy = 1.5;
        else if (mDir === 'left') pupilDx = -1.5;
        else if (mDir === 'right') pupilDx = 1.5;

        ctx.beginPath();
        ctx.arc(mx - 3 + pupilDx * 0.5, my - 1 + pupilDy * 0.5, 1, 0, Math.PI * 2);
        ctx.arc(mx + 3 + pupilDx * 0.5, my - 1 + pupilDy * 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
    };

    const runFrame = () => {
      updateGame();
      drawGame();
      animationId = requestAnimationFrame(runFrame);
    };

    runFrame();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();
    };
  }, [isPaused, lives, words, correctWord]);

  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || !pointerStartRef.current) return;
    
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (Math.abs(dx) > Math.abs(dy)) {
        activeDPadDirRef.current = dx > 0 ? 'right' : 'left';
      } else {
        activeDPadDirRef.current = dy > 0 ? 'down' : 'up';
      }
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointerStartRef.current = null;
    activeDPadDirRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className="maze-canvas-shell relative flex justify-center items-center rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(107,73,39,0.25)] bg-[#e8c994] border-2 border-[#b98149] touch-none select-none w-full h-full cursor-crosshair"
    >
      <canvas
        ref={canvasRef}
        width={19 * cellSize * 2}
        height={19 * cellSize * 2}
        className="block w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
};
