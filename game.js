// 微信小游戏入口 - 贪吃蛇
const GRID_SIZE = 20;

// 获取屏幕尺寸
const info = wx.getSystemInfoSync();
const CANVAS_WIDTH = info.windowWidth;
const CANVAS_HEIGHT = info.windowHeight;
const GRID_COLS = Math.floor(CANVAS_WIDTH / GRID_SIZE);
const GRID_ROWS = Math.floor(CANVAS_HEIGHT / GRID_SIZE);

// 创建canvas - 只能调用一次
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 居中显示游戏区域
const OFFSET_X = (CANVAS_WIDTH - GRID_COLS * GRID_SIZE) / 2;
const OFFSET_Y = (CANVAS_HEIGHT - GRID_ROWS * GRID_SIZE) / 2;

const levelConfigs = [
  { speed: 200, requiredFoods: 10, pattern: 'scatter' },
  { speed: 180, requiredFoods: 12, pattern: 'walls' },
  { speed: 160, requiredFoods: 15, pattern: 'corners' },
  { speed: 140, requiredFoods: 18, pattern: 'cross' },
  { speed: 120, requiredFoods: 20, pattern: 'maze' }
];

const skinColors = {
  green: { head: '#86efac', body: '#4ade80' },
  blue: { head: '#93c5fd', body: '#60a5fa' },
  red: { head: '#fca5a5', body: '#f87171' },
  purple: { head: '#d8b4fe', body: '#a78bfa' },
  gold: { head: '#fde68a', body: '#fbbf24' },
  cyan: { head: '#67e8f9', body: '#22d3ee' },
  pink: { head: '#f9a8d4', body: '#f472b6' },
  orange: { head: '#fed7aa', body: '#fdba74' },
  teal: { head: '#5eead4', body: '#2dd4bf' },
  magenta: { head: '#f472b6', body: '#f9a8d4' },
  'random-ball': { head: '#f97316', body: '#f472b6' },
  rainbow: { head: '#ff6b6b', body: '#48dbfb' }
};

const game = {
  state: 'MENU',
  mode: 'levels',
  level: 1,
  skin: 'green',
  score: 0,
  highScore: 0,
  snake: [],
  food: { x: 0, y: 0, color: '#ef4444' },
  obstacles: [],
  direction: 'right',
  nextDirection: 'right',
  tongueFrame: 0,
  foodsEaten: 0,
  requiredFoods: 10,
  baseSpeed: 200,
  isPaused: false,
  snakeBallColor: null,
  playerName: '',
  leaderboard: [],
  levelLeaderboards: [],
  currentLeaderLevel: 0,
  continuePlaying: false,
  achievementIcon: '',
  achievementTitle: '',
  achievementMessage: '',
  gameLoopTimer: null
};

// UI元素位置
const ui = {
  menuStartBtn: { x: CANVAS_WIDTH / 2 - 80, y: CANVAS_HEIGHT / 2 + 115, w: 160, h: 50 },
  menuNameBtn: { x: CANVAS_WIDTH / 2 - 70, y: 120, w: 140, h: 30 },
  menuModeLevelsBtn: { x: CANVAS_WIDTH / 2 - 80, y: 215, w: 70, h: 40 },
  menuModeEndlessBtn: { x: CANVAS_WIDTH / 2 + 10, y: 215, w: 70, h: 40 },
  menuLevelBtns: Array.from({ length: 5 }, (_, i) => ({ x: CANVAS_WIDTH / 2 - 75 + i * 32, y: 320, w: 28, h: 32 })),
  menuSkinBtns: Array.from({ length: 10 }, (_, i) => {
    const tileSize = Math.min(28, Math.max(22, Math.floor(CANVAS_WIDTH / 15)));
    const gap = Math.max(10, Math.floor(CANVAS_WIDTH / 24));
    return {
      x: CANVAS_WIDTH / 2 - ((tileSize * 5 + gap * 4) / 2) + (i % 5) * (tileSize + gap),
      y: 405 + Math.floor(i / 5) * (tileSize + 8),
      w: tileSize,
      h: tileSize
    };
  }),
  menuRandomBtn: { x: CANVAS_WIDTH / 2 - 60, y: 448, w: 54, h: 32 },
  menuRainbowBtn: { x: CANVAS_WIDTH / 2 + 6, y: 448, w: 54, h: 32 },
  gameOverReplayBtn: { x: CANVAS_WIDTH / 2 - 70, y: CANVAS_HEIGHT / 2 + 30, w: 140, h: 38 },
  gameOverHomeBtn: { x: CANVAS_WIDTH / 2 - 105, y: CANVAS_HEIGHT / 2 + 76, w: 95, h: 38 },
  gameOverLeaderboardBtn: { x: CANVAS_WIDTH / 2 + 10, y: CANVAS_HEIGHT / 2 + 76, w: 95, h: 38 },
  levelCompleteBtn: { x: CANVAS_WIDTH / 2 - 70, y: CANVAS_HEIGHT / 2 + 40, w: 140, h: 40 },
  achievementBtn: { x: CANVAS_WIDTH / 2 - 80, y: CANVAS_HEIGHT / 2 + 55, w: 160, h: 42 },
  leaderboardHomeBtn: { x: CANVAS_WIDTH / 2 - 95, y: CANVAS_HEIGHT / 2 + 85, w: 95, h: 38 },
  leaderboardPlayBtn: { x: CANVAS_WIDTH / 2 + 5, y: CANVAS_HEIGHT / 2 + 85, w: 95, h: 38 },
  levelDialogNextBtn: { x: CANVAS_WIDTH / 2 - 120, y: CANVAS_HEIGHT / 2 + 55, w: 110, h: 40 },
  levelDialogContinueBtn: { x: CANVAS_WIDTH / 2 + 10, y: CANVAS_HEIGHT / 2 + 55, w: 110, h: 40 },
  directionBtns: {
    up: { x: CANVAS_WIDTH - 120, y: CANVAS_HEIGHT - 130, w: 55, h: 55 },
    down: { x: CANVAS_WIDTH - 120, y: CANVAS_HEIGHT - 65, w: 55, h: 55 },
    left: { x: CANVAS_WIDTH - 185, y: CANVAS_HEIGHT - 97, w: 55, h: 55 },
    right: { x: CANVAS_WIDTH - 55, y: CANVAS_HEIGHT - 97, w: 55, h: 55 }
  },
  joystick: {
    centerX: 75,
    centerY: CANVAS_HEIGHT - 75,
    radius: 55,
    centerRadius: 18,
    activeDirection: null
  }
};

// 初始化
function init() {
  try {
    const storedName = wx.getStorageSync('snakePlayerName');
    game.playerName = storedName || '玩家' + Math.floor(Math.random() * 1000);
    game.highScore = wx.getStorageSync('snakeHighScore') || 0;
    game.leaderboard = wx.getStorageSync('snakeLeaderboard') || [];
    game.levelLeaderboards = [];
    for (let i = 1; i <= 5; i++) {
      const lb = wx.getStorageSync(`snakeLeaderboard_level_${i}`) || [];
      game.levelLeaderboards.push(lb);
    }
  } catch (e) {
    game.playerName = '玩家' + Math.floor(Math.random() * 1000);
    game.highScore = 0;
    game.leaderboard = [];
    game.levelLeaderboards = [[], [], [], [], []];
  }
  
  wx.onTouchStart((e) => {
    if (e.touches && e.touches.length > 0) {
      handleTouch(e.touches[0]);
    }
  });
  
  wx.onTouchMove((e) => {
    if (game.state !== 'PLAYING') return;
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      const jx = x - ui.joystick.centerX;
      const jy = y - ui.joystick.centerY;
      const dist = Math.sqrt(jx * jx + jy * jy);
      if (dist <= ui.joystick.radius) {
        const angle = Math.atan2(jy, jx) * 180 / Math.PI;
        let dir = null;
        if (angle >= -45 && angle < 45) dir = 'right';
        else if (angle >= 45 && angle < 135) dir = 'down';
        else if (angle >= -135 && angle < -45) dir = 'up';
        else dir = 'left';
        if (dir && dir !== ui.joystick.activeDirection) {
          changeDirection(dir);
          ui.joystick.activeDirection = dir;
        }
      }
    }
  });
  
  wx.onTouchEnd(() => {
    ui.joystick.activeDirection = null;
  });
  
  render();
}

function handleTouch(touch) {
  const x = touch.clientX;
  const y = touch.clientY;
  
  if (game.state === 'MENU') {
    const L = game._layout || getMenuLayout();
    if (isInside(x, y, L.nameBtn)) {
      editPlayerName();
      return;
    }
    if (isInside(x, y, L.startBtn)) {
      startGame();
      return;
    }
    if (isInside(x, y, L.modeLevelsBtn)) {
      game.mode = 'levels';
      return;
    }
    if (isInside(x, y, L.modeEndlessBtn)) {
      game.mode = 'endless';
      return;
    }
    if (L.levelBtns) {
      L.levelBtns.forEach((btn, index) => {
        if (isInside(x, y, btn)) {
          game.level = index + 1;
        }
      });
    }
    L.skinBtns.forEach((btn, index) => {
      if (isInside(x, y, btn)) {
        const skins = ['green', 'blue', 'red', 'purple', 'gold', 'cyan', 'pink', 'orange', 'teal', 'magenta'];
        game.skin = skins[index];
      }
    });
    if (isInside(x, y, L.randomBtn)) {
      game.skin = 'random-ball';
      return;
    }
    if (isInside(x, y, L.rainbowBtn)) {
      game.skin = 'rainbow';
      return;
    }
  } else if (game.state === 'PLAYING') {
    for (const [dir, btn] of Object.entries(ui.directionBtns)) {
      if (isInside(x, y, btn)) {
        changeDirection(dir);
        ui.joystick.activeDirection = null;
        return;
      }
    }
    const jx = x - ui.joystick.centerX;
    const jy = y - ui.joystick.centerY;
    const dist = Math.sqrt(jx * jx + jy * jy);
    if (dist <= ui.joystick.radius) {
      const angle = Math.atan2(jy, jx) * 180 / Math.PI;
      let dir = null;
      if (angle >= -45 && angle < 45) dir = 'right';
      else if (angle >= 45 && angle < 135) dir = 'down';
      else if (angle >= -135 && angle < -45) dir = 'up';
      else dir = 'left';
      if (dir) {
        changeDirection(dir);
        ui.joystick.activeDirection = dir;
      }
    }
  } else if (game.state === 'GAME_OVER') {
    if (isInside(x, y, ui.gameOverReplayBtn)) {
      startGame();
    } else if (isInside(x, y, ui.gameOverHomeBtn)) {
      goHome();
    } else if (isInside(x, y, ui.gameOverLeaderboardBtn)) {
      showLeaderboard();
    }
  } else if (game.state === 'LEADERBOARD') {
    if (game._leaderTabs) {
      game._leaderTabs.forEach((tab, index) => {
        if (isInside(x, y, tab)) {
          game.currentLeaderLevel = index;
        }
      });
    }
    if (isInside(x, y, ui.leaderboardHomeBtn)) {
      goHome();
    } else if (isInside(x, y, ui.leaderboardPlayBtn)) {
      startGame();
    }
  } else if (game.state === 'LEVEL_DIALOG') {
    if (isInside(x, y, ui.levelDialogNextBtn)) {
      nextLevel();
    } else if (isInside(x, y, ui.levelDialogContinueBtn)) {
      continuePlaying();
    }
  } else if (game.state === 'LEVEL_COMPLETE') {
    if (isInside(x, y, ui.levelCompleteBtn)) {
      nextLevel();
    }
  } else if (game.state === 'ACHIEVEMENT') {
    if (isInside(x, y, ui.achievementBtn)) {
      game.state = 'GAME_OVER';
    }
  }
}

function isInside(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function goHome() {
  if (game.gameLoopTimer) {
    clearInterval(game.gameLoopTimer);
    game.gameLoopTimer = null;
  }
  game.isPaused = false;
  game.state = 'MENU';
}

function editPlayerName() {
  if (typeof wx.showModal !== 'function') {
    return;
  }

  wx.showModal({
    title: '修改玩家姓名',
    content: game.playerName,
    editable: true,
    placeholderText: '请输入玩家姓名',
    confirmText: '保存',
    cancelText: '取消',
    success: (res) => {
      if (!res.confirm) return;
      const name = String(res.content || '').trim();
      if (name) {
        game.playerName = name;
        try {
          wx.setStorageSync('snakePlayerName', game.playerName);
        } catch (e) {}
      }
    }
  });
}

function showLeaderboard() {
  game.currentLeaderLevel = game.level - 1;
  game.state = 'LEADERBOARD';
}

function changeDirection(dir) {
  const opposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  };
  if (opposites[game.direction] !== dir) {
    game.nextDirection = dir;
  }
}

function startGame() {
  game.state = 'PLAYING';
  game.score = 0;
  game.foodsEaten = 0;
  game.isPaused = false;
  game.snakeBallColor = null;
  game.continuePlaying = false;
  
  const config = levelConfigs[game.level - 1];
  game.baseSpeed = game.mode === 'levels' ? config.speed : 200;
  game.requiredFoods = game.mode === 'levels' ? config.requiredFoods : 9999;
  
  generateObstacles(game.mode === 'levels' ? config.pattern : 'scatter');
  spawnFood();
  
  const centerX = Math.floor(GRID_COLS / 2);
  const centerY = Math.floor(GRID_ROWS / 2);
  game.snake = [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY }
  ];
  game.direction = 'right';
  game.nextDirection = 'right';
  
  if (game.gameLoopTimer) {
    clearInterval(game.gameLoopTimer);
  }
  game.gameLoopTimer = setInterval(gameLoop, game.baseSpeed);
}

function nextLevel() {
  if (game.level >= 5) {
    game.achievementIcon = '👑';
    game.achievementTitle = '全部通关!';
    game.achievementMessage = '你已征服所有关卡!';
    game.state = 'ACHIEVEMENT';
    return;
  }
  game.level += 1;
  game.continuePlaying = false;
  game.state = 'MENU';
}

function generateObstacles(pattern) {
  game.obstacles = [];
  const cx = Math.floor(GRID_COLS / 2);
  const cy = Math.floor(GRID_ROWS / 2);

  // 蛇身起始安全区（3格半径）
  const isSafe = (x, y) => Math.abs(x - cx) <= 3 && Math.abs(y - cy) <= 2;

  // 添加障碍物（去重 + 边界检查 + 安全区检查）
  const add = (x, y) => {
    if (x >= 1 && x < GRID_COLS - 1 && y >= 3 && y < GRID_ROWS - 1 && !isSafe(x, y)) {
      if (!game.obstacles.some(o => o.x === x && o.y === y)) {
        game.obstacles.push({ x, y });
      }
    }
  };

  // 随机散点
  const scatter = (count) => {
    const available = [];
    for (let x = 1; x < GRID_COLS - 1; x++) {
      for (let y = 3; y < GRID_ROWS - 1; y++) {
        if (!isSafe(x, y)) available.push({ x, y });
      }
    }
    for (let i = 0; i < Math.min(count, available.length); i++) {
      const idx = Math.floor(Math.random() * available.length);
      game.obstacles.push(available.splice(idx, 1)[0]);
    }
  };

  switch (pattern) {
    case 'walls': {
      // 关卡2：两道横墙，中间留缺口
      const w1 = Math.floor(cy * 0.45);
      const w2 = Math.floor(cy * 1.55);
      const gapL = cx - 2;
      const gapR = cx + 2;
      for (let x = 1; x < GRID_COLS - 1; x++) {
        if (x < gapL || x > gapR) {
          add(x, w1);
          add(x, w2);
        }
      }
      // 侧翼散点
      add(1, cy);
      add(GRID_COLS - 2, cy);
      scatter(2);
      break;
    }
    case 'corners': {
      // 关卡3：四角L型障碍 + 中央散点
      const margin = 2;
      // 左上 L
      add(margin, 4); add(margin + 1, 4); add(margin, 5);
      // 右上 L
      add(GRID_COLS - 1 - margin, 4); add(GRID_COLS - 2 - margin, 4); add(GRID_COLS - 1 - margin, 5);
      // 左下 L
      add(margin, GRID_ROWS - 5); add(margin + 1, GRID_ROWS - 5); add(margin, GRID_ROWS - 6);
      // 右下 L
      add(GRID_COLS - 1 - margin, GRID_ROWS - 5); add(GRID_COLS - 2 - margin, GRID_ROWS - 5); add(GRID_COLS - 1 - margin, GRID_ROWS - 6);
      // 中央两侧散点
      add(cx - 5, Math.floor(cy * 0.65));
      add(cx + 4, Math.floor(cy * 1.35));
      scatter(2);
      break;
    }
    case 'cross': {
      // 关卡4：双竖墙（交错缺口）+ 双横墙
      const vX1 = cx - 4;
      const vX2 = cx + 4;
      // 左竖墙：上半段有缺口
      for (let y = 4; y < GRID_ROWS - 2; y++) {
        if (y % 5 !== 0 && y % 5 !== 1) add(vX1, y);
      }
      // 右竖墙：下半段有缺口（与左墙错开）
      for (let y = 4; y < GRID_ROWS - 2; y++) {
        if (y % 5 !== 2 && y % 5 !== 3) add(vX2, y);
      }
      // 横墙
      const hY1 = Math.floor(cy * 0.5);
      const hY2 = Math.floor(cy * 1.5);
      for (let x = 1; x < GRID_COLS - 1; x++) {
        if (Math.abs(x - cx) > 2) {
          add(x, hY1);
          add(x, hY2);
        }
      }
      break;
    }
    case 'maze': {
      // 关卡5：三竖墙 + 两横墙 = 迷宫走廊
      // 左墙（底部有缺口）
      const vX1 = Math.floor(GRID_COLS * 0.28);
      for (let y = 4; y < GRID_ROWS - 2; y++) {
        if (y < GRID_ROWS - 6) add(vX1, y);
      }
      // 中墙（顶部和底部有缺口）
      for (let y = 5; y < GRID_ROWS - 3; y++) {
        if (y > 7 && y < GRID_ROWS - 5 && !isSafe(cx, y)) add(cx, y);
      }
      // 右墙（顶部有缺口）
      const vX3 = Math.floor(GRID_COLS * 0.72);
      for (let y = 4; y < GRID_ROWS - 2; y++) {
        if (y > 6) add(vX3, y);
      }
      // 横墙（交错缺口形成蛇形通道）
      const hY1 = Math.floor(cy * 0.65);
      const hY2 = Math.floor(cy * 1.35);
      for (let x = 1; x < GRID_COLS - 1; x++) {
        if (x !== cx - 1 && x !== cx) add(x, hY1);
        if (x !== cx + 1 && x !== cx + 2) add(x, hY2);
      }
      // 角落封锁
      add(1, 4); add(GRID_COLS - 2, 4);
      break;
    }
    default:
      // 关卡1 & 无穷模式：散点
      scatter(5);
  }
}

function spawnFood() {
  const occupied = new Set([
    ...game.snake.map(s => `${s.x},${s.y}`),
    ...game.obstacles.map(o => `${o.x},${o.y}`)
  ]);
  const available = [];
  for (let x = 0; x < GRID_COLS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      if (!occupied.has(`${x},${y}`)) available.push({ x, y });
    }
  }
  if (available.length === 0) {
    game.food = { x: 0, y: 0, color: '#ef4444' };
    return;
  }
  const chosen = available[Math.floor(Math.random() * available.length)];
  const color = game.skin === 'random-ball' ? getRandomBallColor() : '#ef4444';
  game.food = { x: chosen.x, y: chosen.y, color };
}

function getRandomBallColor() {
  const colors = ['#f97316', '#38bdf8', '#f472b6', '#a855f7', '#16a34a', '#facc15', '#22c55e', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function gameLoop() {
  if (game.isPaused || game.state !== 'PLAYING') return;
  
  game.direction = game.nextDirection;
  const head = { ...game.snake[0] };
  
  switch (game.direction) {
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }
  
  if (head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS) {
    onGameOver();
    return;
  }
  
  if (game.snake.some(s => s.x === head.x && s.y === head.y)) {
    onGameOver();
    return;
  }
  
  if (game.obstacles.some(o => o.x === head.x && o.y === head.y)) {
    onGameOver();
    return;
  }
  
  game.snake.unshift(head);
  
  if (head.x === game.food.x && head.y === game.food.y) {
    game.score += 10;
    game.foodsEaten += 1;
    if (game.skin === 'random-ball') {
      game.snakeBallColor = game.food.color;
    }
    spawnFood();
    
    if (game.snake.length % 5 === 0 && game.baseSpeed > 80 && game.mode === 'levels') {
      game.baseSpeed -= 10;
      if (game.gameLoopTimer) {
        clearInterval(game.gameLoopTimer);
        game.gameLoopTimer = setInterval(gameLoop, game.baseSpeed);
      }
    }
    
    if (game.mode === 'endless' && game.foodsEaten % 5 === 0) {
      game.baseSpeed = Math.max(80, game.baseSpeed - 5);
      if (game.gameLoopTimer) {
        clearInterval(game.gameLoopTimer);
        game.gameLoopTimer = setInterval(gameLoop, game.baseSpeed);
      }
    }
    
    if (game.mode === 'levels' && !game.continuePlaying && game.foodsEaten >= game.requiredFoods) {
      onLevelComplete();
      return;
    }
  } else {
    game.snake.pop();
  }
}

function onGameOver() {
  game.state = 'GAME_OVER';
  if (game.gameLoopTimer) {
    clearInterval(game.gameLoopTimer);
  }
  
  const wasHighScore = game.score > game.highScore;
  if (wasHighScore) {
    game.highScore = game.score;
    try { wx.setStorageSync('snakeHighScore', game.highScore); } catch(e) {}
  }
  
  const rank = submitScore(game.score, game.level);
  
  if (wasHighScore || rank <= 3) {
    showAchievement(wasHighScore, rank, game.score);
  }
}

function onLevelComplete() {
  if (game.gameLoopTimer) {
    clearInterval(game.gameLoopTimer);
  }
  
  const bonus = game.level * 50;
  game.score += bonus;
  
  const wasHighScore = game.score > game.highScore;
  if (wasHighScore) {
    game.highScore = game.score;
    try { wx.setStorageSync('snakeHighScore', game.highScore); } catch(e) {}
  }
  
  const rank = submitScore(game.score, game.level);
  
  game.state = 'LEVEL_DIALOG';
  
  if (wasHighScore || rank <= 3) {
    game.achievementIcon = rank === 1 ? '🏆' : (rank === 2 ? '🥈' : '🥉');
    game.achievementTitle = `Lv${game.level} 达成!`;
    game.achievementMessage = wasHighScore ? '新纪录!' : `恭喜进入排行榜第${rank}名!`;
  } else {
    game.achievementIcon = '🎉';
    game.achievementTitle = `Lv${game.level} 完成!`;
    game.achievementMessage = '选择下一步挑战';
  }
}

function continuePlaying() {
  game.state = 'PLAYING';
  game.continuePlaying = true;
  
  if (game.gameLoopTimer) {
    clearInterval(game.gameLoopTimer);
  }
  game.gameLoopTimer = setInterval(gameLoop, game.baseSpeed);
}

function submitScore(score, level) {
  const name = game.playerName || '玩家';
  const entry = { name, score };
  
  // 全局排行榜
  game.leaderboard = [...game.leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10);
  try { wx.setStorageSync('snakeLeaderboard', game.leaderboard); } catch(e) {}
  
  // 每关独立排行榜
  const lbKey = level - 1;
  if (lbKey >= 0 && lbKey < game.levelLeaderboards.length) {
    game.levelLeaderboards[lbKey] = [...game.levelLeaderboards[lbKey], entry]
      .sort((a, b) => b.score - a.score).slice(0, 10);
    try { wx.setStorageSync(`snakeLeaderboard_level_${level}`, game.levelLeaderboards[lbKey]); } catch(e) {}
  }
  
  const currentLb = game.levelLeaderboards[lbKey] || game.leaderboard;
  const rank = currentLb.findIndex(e => e.name === name && e.score === score);
  return rank >= 0 ? rank + 1 : currentLb.length;
}

function showAchievement(isHighScore, rank, finalScore) {
  game.state = 'ACHIEVEMENT';
  game.score = finalScore;
  
  if (isHighScore && rank === 1) {
    game.achievementIcon = '🏆';
    game.achievementTitle = '新纪录!';
    game.achievementMessage = '恭喜你创造了新的最高分! 你现在是第一名!';
  } else if (isHighScore) {
    game.achievementIcon = '🎉';
    game.achievementTitle = '新纪录!';
    game.achievementMessage = '恭喜你创造了新的最高分!';
  } else if (rank === 1) {
    game.achievementIcon = '🥇';
    game.achievementTitle = '第一名!';
    game.achievementMessage = '恭喜你登上排行榜第一名!';
  } else if (rank === 2) {
    game.achievementIcon = '🥈';
    game.achievementTitle = '第二名!';
    game.achievementMessage = '恭喜你获得排行榜第二名!';
  } else if (rank === 3) {
    game.achievementIcon = '🥉';
    game.achievementTitle = '第三名!';
    game.achievementMessage = '恭喜你获得排行榜第三名!';
  } else {
    game.achievementIcon = '🎊';
    game.achievementTitle = '成就达成!';
    game.achievementMessage = '恭喜你取得了好成绩!';
  }
}

// 渲染
function render() {
  // 清屏
  ctx.fillStyle = '#0f0c29';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  if (game.state === 'MENU') {
    drawMenu();
  } else if (game.state === 'LEADERBOARD') {
    drawLeaderboard();
  } else if (game.state === 'PLAYING' || game.state === 'GAME_OVER' || game.state === 'LEVEL_DIALOG' || game.state === 'LEVEL_COMPLETE' || game.state === 'ACHIEVEMENT') {
    drawGame();
    drawUI();
  }
  
  requestAnimationFrame(render);
}

// 动态计算菜单布局，确保绘制和触摸使用同一套坐标（横屏紧凑布局）
function getMenuLayout() {
  const L = {};
  const panelX = 24;
  const panelW = CANVAS_WIDTH - 48;

  // 顶部信息行（标题 + 玩家名 + 最高分 合并一行）
  L.nameBtn = { x: CANVAS_WIDTH / 2 - 80, y: 6, w: 160, h: 22 };

  // 模式面板
  const modePanelY = 38;
  const modePanelH = 50;
  L.modePanel = { x: panelX, y: modePanelY, w: panelW, h: modePanelH };
  L.modeLevelsBtn = { x: CANVAS_WIDTH / 2 - 80, y: modePanelY + 20, w: 70, h: 26 };
  L.modeEndlessBtn = { x: CANVAS_WIDTH / 2 + 10, y: modePanelY + 20, w: 70, h: 26 };

  // 关卡面板（仅关卡模式）
  let skinPanelY;
  if (game.mode === 'levels') {
    const levelPanelY = modePanelY + modePanelH + 6;
    const levelPanelH = 46;
    L.levelPanel = { x: panelX, y: levelPanelY, w: panelW, h: levelPanelH };
    L.levelBtns = [];
    for (let i = 0; i < 5; i++) {
      L.levelBtns.push({
        x: CANVAS_WIDTH / 2 - 78 + i * 32,
        y: levelPanelY + 18,
        w: 28,
        h: 24
      });
    }
    skinPanelY = levelPanelY + levelPanelH + 6;
  } else {
    skinPanelY = modePanelY + modePanelH + 6;
  }

  // 皮肤面板
  const tileSize = Math.min(24, Math.max(16, Math.floor((panelW - 50) / 7)));
  const tileGap = Math.max(8, Math.floor((panelW - 24 - tileSize * 5) / 4));
  const gridStartY = skinPanelY + 20;
  const rowGap = 6;
  const btnGap = 6;
  const btnH = 26;
  const textGap = 12;
  const bottomPad = 8;

  const gridRows = 2;
  const gridH = gridRows * tileSize + (gridRows - 1) * rowGap;
  const skinPanelH = 20 + gridH + btnGap + btnH + textGap + bottomPad;

  L.skinPanel = { x: panelX, y: skinPanelY, w: panelW, h: skinPanelH };

  // 皮肤色块 5x2
  const gridStartX = CANVAS_WIDTH / 2 - ((tileSize * 5 + tileGap * 4) / 2);
  L.skinBtns = [];
  for (let i = 0; i < 10; i++) {
    L.skinBtns.push({
      x: gridStartX + (i % 5) * (tileSize + tileGap),
      y: gridStartY + Math.floor(i / 5) * (tileSize + rowGap),
      w: tileSize,
      h: tileSize
    });
  }

  // 随机/彩虹按钮
  const btnY = gridStartY + gridH + btnGap;
  L.randomBtn = { x: CANVAS_WIDTH / 2 - 62, y: btnY, w: 56, h: btnH };
  L.rainbowBtn = { x: CANVAS_WIDTH / 2 + 6, y: btnY, w: 56, h: btnH };

  // 皮肤名称
  L.skinNameY = btnY + btnH + 10;

  // 开始按钮
  L.startBtn = { x: CANVAS_WIDTH / 2 - 80, y: skinPanelY + skinPanelH + 8, w: 160, h: 36 };

  return L;
}

function drawMenu() {
  const L = getMenuLayout();
  game._layout = L; // 保存供 touch 使用

  // 面板背景
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(12, 34, CANVAS_WIDTH - 24, CANVAS_HEIGHT - 56, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 顶部信息行：标题、玩家名、最高分 一行显示
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🐍 贪吃蛇', 24, 24);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`玩家: ${game.playerName}`, CANVAS_WIDTH / 2, 22);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`最高分: ${game.highScore}`, CANVAS_WIDTH - 24, 24);

  // 模式面板
  drawMenuPanel(L.modePanel.x, L.modePanel.y, L.modePanel.w, L.modePanel.h, '模式选择');
  drawMenuButton(L.modeLevelsBtn.x, L.modeLevelsBtn.y, L.modeLevelsBtn.w, L.modeLevelsBtn.h, '关卡模式', game.mode === 'levels', '#a78bfa', 'rgba(255,255,255,0.12)');
  drawMenuButton(L.modeEndlessBtn.x, L.modeEndlessBtn.y, L.modeEndlessBtn.w, L.modeEndlessBtn.h, '无穷模式', game.mode === 'endless', '#a78bfa', 'rgba(255,255,255,0.12)');

  // 关卡面板（仅关卡模式）
  if (game.mode === 'levels' && L.levelPanel) {
    drawMenuPanel(L.levelPanel.x, L.levelPanel.y, L.levelPanel.w, L.levelPanel.h, '选择关卡');
    for (let i = 0; i < 5; i++) {
      const btn = L.levelBtns[i];
      drawMenuButton(btn.x, btn.y, btn.w, btn.h, String(i + 1), game.level === i + 1, '#4ade80', 'rgba(255,255,255,0.12)');
    }
  }

  // 皮肤面板
  drawMenuPanel(L.skinPanel.x, L.skinPanel.y, L.skinPanel.w, L.skinPanel.h, '选择皮肤');
  const skins = ['green', 'blue', 'red', 'purple', 'gold', 'cyan', 'pink', 'orange', 'teal', 'magenta'];
  const skinLabels = {
    green: '青草绿', blue: '天空蓝', red: '炽热红', purple: '紫罗兰',
    gold: '金色', cyan: '青色', pink: '粉色', orange: '橙色',
    teal: '青绿', magenta: '洋红'
  };
  for (let i = 0; i < skins.length; i++) {
    const colors = skinColors[skins[i]];
    const btn = L.skinBtns[i];
    const selected = game.skin === skins[i];

    // 选中时用原色填充 + 金色边框，不使用白色填充
    ctx.fillStyle = colors.body;
    roundRect(btn.x, btn.y, btn.w, btn.h, 6);
    ctx.fill();

    if (selected) {
      // 金色外框 + 半透明黑色内框，避免白色冲突
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 内部高亮提示
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      roundRect(btn.x + 3, btn.y + 3, btn.w - 6, btn.h - 6, 4);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 随机/彩虹按钮
  drawMenuButton(L.randomBtn.x, L.randomBtn.y, L.randomBtn.w, L.randomBtn.h, '随机', game.skin === 'random-ball', '#f97316', 'rgba(255,255,255,0.12)');
  drawMenuButton(L.rainbowBtn.x, L.rainbowBtn.y, L.rainbowBtn.w, L.rainbowBtn.h, '彩虹', game.skin === 'rainbow', '#ec4899', 'rgba(255,255,255,0.12)');

  // 当前皮肤名称
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  const skinName = game.skin === 'random-ball' ? '随机彩球' : game.skin === 'rainbow' ? '彩虹' : (skinLabels[game.skin] || '青草绿');
  ctx.fillText(`当前皮肤: ${skinName}`, CANVAS_WIDTH / 2, L.skinNameY);

  // 开始按钮
  drawMenuButton(L.startBtn.x, L.startBtn.y, L.startBtn.w, L.startBtn.h, '开始游戏', true, '#a78bfa', '#8b5cf6');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px sans-serif';
  ctx.fillText('点击屏幕控制方向', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 16);
}

function drawGame() {
  // 游戏区域背景
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(OFFSET_X, OFFSET_Y, GRID_COLS * GRID_SIZE, GRID_ROWS * GRID_SIZE);
  
  // 网格
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(OFFSET_X + x * GRID_SIZE, OFFSET_Y);
    ctx.lineTo(OFFSET_X + x * GRID_SIZE, OFFSET_Y + GRID_ROWS * GRID_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(OFFSET_X, OFFSET_Y + y * GRID_SIZE);
    ctx.lineTo(OFFSET_X + GRID_COLS * GRID_SIZE, OFFSET_Y + y * GRID_SIZE);
    ctx.stroke();
  }
  
  // 障碍物
  ctx.fillStyle = '#6b7280';
  game.obstacles.forEach(obs => {
    ctx.fillRect(
      OFFSET_X + obs.x * GRID_SIZE + 2, 
      OFFSET_Y + obs.y * GRID_SIZE + 2, 
      GRID_SIZE - 4, 
      GRID_SIZE - 4
    );
  });
  
  // 食物
  ctx.fillStyle = game.food.color;
  ctx.beginPath();
  ctx.arc(
    OFFSET_X + game.food.x * GRID_SIZE + GRID_SIZE / 2,
    OFFSET_Y + game.food.y * GRID_SIZE + GRID_SIZE / 2,
    GRID_SIZE / 2 - 3,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  // 蛇
  game.tongueFrame = (game.tongueFrame + 1) % 20;
  const colors = skinColors[game.skin];
  const halfGrid = GRID_SIZE / 2;
  
  for (let i = game.snake.length - 1; i >= 0; i--) {
    const segment = game.snake[i];
    const x = OFFSET_X + segment.x * GRID_SIZE;
    const y = OFFSET_Y + segment.y * GRID_SIZE;
    
    if (i === 0) {
      drawSnakeHead(x, y, colors);
    } else if (i === game.snake.length - 1) {
      drawSnakeTail(x, y, i, colors);
    } else {
      drawSnakeBody(x, y, i, colors);
    }
  }
}

function drawSnakeHead(x, y, colors) {
  const skin = game.skin;
  const headColor = skin === 'rainbow' ? `hsl(0, 80%, 60%)` : (game.snakeBallColor || colors.head);
  const borderColor = 'rgba(0, 0, 0, 0.4)';
  const bellyColor = 'rgba(255, 255, 255, 0.35)';
  const scaleColor = 'rgba(0, 0, 0, 0.25)';
  const eyeWhite = '#FFFFFF';
  const eyeBlack = '#000000';
  const tongueColor = '#E91E63';
  const halfGrid = GRID_SIZE / 2;
  
  ctx.fillStyle = headColor;
  ctx.fillRect(x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6);
  
  ctx.fillStyle = headColor;
  ctx.fillRect(x + 4, y + 2, GRID_SIZE - 8, 1);
  ctx.fillRect(x + 4, y + GRID_SIZE - 3, GRID_SIZE - 8, 1);
  ctx.fillRect(x + 2, y + 4, 1, GRID_SIZE - 8);
  ctx.fillRect(x + GRID_SIZE - 3, y + 4, 1, GRID_SIZE - 8);
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6);
  
  ctx.fillStyle = scaleColor;
  if (game.direction === 'right' || game.direction === 'left') {
    ctx.fillRect(x + 6, y + 5, 2, 2);
    ctx.fillRect(x + 12, y + 5, 2, 2);
    ctx.fillRect(x + 6, y + 13, 2, 2);
    ctx.fillRect(x + 12, y + 13, 2, 2);
  } else {
    ctx.fillRect(x + 5, y + 6, 2, 2);
    ctx.fillRect(x + 13, y + 6, 2, 2);
    ctx.fillRect(x + 5, y + 12, 2, 2);
    ctx.fillRect(x + 13, y + 12, 2, 2);
  }
  
  let eye1X, eye1Y, eye2X, eye2Y;
  const eyeSize = 4;
  const pupilSize = 2;
  
  if (game.direction === 'right') {
    eye1X = x + 13; eye1Y = y + 5;
    eye2X = x + 13; eye2Y = y + 11;
  } else if (game.direction === 'left') {
    eye1X = x + 3; eye1Y = y + 5;
    eye2X = x + 3; eye2Y = y + 11;
  } else if (game.direction === 'up') {
    eye1X = x + 5; eye1Y = y + 3;
    eye2X = x + 11; eye2Y = y + 3;
  } else {
    eye1X = x + 5; eye1Y = y + 13;
    eye2X = x + 11; eye2Y = y + 13;
  }
  
  ctx.fillStyle = eyeWhite;
  ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
  ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
  
  ctx.fillStyle = eyeBlack;
  ctx.fillRect(eye1X + 1, eye1Y + 1, pupilSize, pupilSize);
  ctx.fillRect(eye2X + 1, eye2Y + 1, pupilSize, pupilSize);
  
  if (game.tongueFrame < 10) {
    const tongueLen = Math.floor(game.tongueFrame / 2);
    ctx.fillStyle = tongueColor;
    
    if (game.direction === 'right') {
      for (let i = 0; i <= tongueLen; i++) {
        ctx.fillRect(x + GRID_SIZE - 2 + i * 2, y + halfGrid - 1, 2, 2);
      }
      if (tongueLen > 2) {
        ctx.fillRect(x + GRID_SIZE - 2 + tongueLen * 2, y + halfGrid - 3, 1, 1);
        ctx.fillRect(x + GRID_SIZE - 2 + tongueLen * 2, y + halfGrid + 1, 1, 1);
      }
    } else if (game.direction === 'left') {
      for (let i = 0; i <= tongueLen; i++) {
        ctx.fillRect(x + 2 - i * 2, y + halfGrid - 1, 2, 2);
      }
      if (tongueLen > 2) {
        ctx.fillRect(x + 2 - tongueLen * 2, y + halfGrid - 3, 1, 1);
        ctx.fillRect(x + 2 - tongueLen * 2, y + halfGrid + 1, 1, 1);
      }
    } else if (game.direction === 'up') {
      for (let i = 0; i <= tongueLen; i++) {
        ctx.fillRect(x + halfGrid - 1, y + 2 - i * 2, 2, 2);
      }
      if (tongueLen > 2) {
        ctx.fillRect(x + halfGrid - 3, y + 2 - tongueLen * 2, 1, 1);
        ctx.fillRect(x + halfGrid + 1, y + 2 - tongueLen * 2, 1, 1);
      }
    } else {
      for (let i = 0; i <= tongueLen; i++) {
        ctx.fillRect(x + halfGrid - 1, y + GRID_SIZE - 2 + i * 2, 2, 2);
      }
      if (tongueLen > 2) {
        ctx.fillRect(x + halfGrid - 3, y + GRID_SIZE - 2 + tongueLen * 2, 1, 1);
        ctx.fillRect(x + halfGrid + 1, y + GRID_SIZE - 2 + tongueLen * 2, 1, 1);
      }
    }
  }
}

function drawSnakeBody(x, y, index, colors) {
  const skin = game.skin;
  const bodyColor = (index % 2 === 0)
    ? (skin === 'rainbow' ? `hsl(${(index * 30) % 360}, 80%, 60%)` : (game.snakeBallColor || colors.head))
    : (skin === 'rainbow' ? `hsl(${(index * 30 + 30) % 360}, 80%, 60%)` : (game.snakeBallColor || colors.body));
  const borderColor = 'rgba(0, 0, 0, 0.4)';
  const bellyColor = 'rgba(255, 255, 255, 0.35)';
  const scaleColor = 'rgba(0, 0, 0, 0.25)';
  
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6);
  
  ctx.fillStyle = bellyColor;
  ctx.fillRect(x + 7, y + 7, GRID_SIZE - 14, GRID_SIZE - 14);
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6);
  
  ctx.fillStyle = scaleColor;
  ctx.fillRect(x + 5, y + 5, 2, 2);
  ctx.fillRect(x + 13, y + 5, 2, 2);
  ctx.fillRect(x + 5, y + 13, 2, 2);
  ctx.fillRect(x + 13, y + 13, 2, 2);
}

function drawSnakeTail(x, y, index, colors) {
  const skin = game.skin;
  const bodyColor = (index % 2 === 0)
    ? (skin === 'rainbow' ? `hsl(${(index * 30) % 360}, 80%, 60%)` : (game.snakeBallColor || colors.head))
    : (skin === 'rainbow' ? `hsl(${(index * 30 + 30) % 360}, 80%, 60%)` : (game.snakeBallColor || colors.body));
  const borderColor = 'rgba(0, 0, 0, 0.4)';
  
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 5, y + 5, GRID_SIZE - 10, GRID_SIZE - 10);
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, GRID_SIZE - 10, GRID_SIZE - 10);
  
  ctx.fillRect(x + 8, y + 8, GRID_SIZE - 16, GRID_SIZE - 16);
}

function drawUI() {
  // 顶部信息栏
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 55);
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`得分: ${game.score}`, 15, 35);
  
  ctx.textAlign = 'center';
  ctx.fillText(`最高分: ${game.highScore}`, CANVAS_WIDTH / 2, 35);
  
  if (game.mode === 'levels') {
    const levelNames = ['散点', '短墙', '角落', '十字', '迷宫'];
    ctx.textAlign = 'right';
    ctx.fillText(`Lv${game.level} ${levelNames[game.level - 1]}`, CANVAS_WIDTH - 15, 35);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText('无穷模式', CANVAS_WIDTH - 15, 35);
  }
  
  // 进度条（关卡模式）
  if (game.mode === 'levels' && game.state === 'PLAYING' && !game.continuePlaying) {
    const progress = game.foodsEaten / game.requiredFoods;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(15, 60, CANVAS_WIDTH - 30, 8);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(15, 60, (CANVAS_WIDTH - 30) * progress, 8);
  } else if (game.mode === 'levels' && game.continuePlaying && game.state === 'PLAYING') {
    // 继续游玩模式 - 显示渐变条
    const time = Date.now() / 500;
    const hue = (time * 50) % 360;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(15, 60, CANVAS_WIDTH - 30, 8);
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.fillRect(15, 60, CANVAS_WIDTH - 30, 8);
    // 标签
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥 极限挑战中', CANVAS_WIDTH / 2, 58);
  }
  
  // 方向按钮
  if (game.state === 'PLAYING') {
    drawDirectionBtn(ui.directionBtns.up, '↑');
    drawDirectionBtn(ui.directionBtns.down, '↓');
    drawDirectionBtn(ui.directionBtns.left, '←');
    drawDirectionBtn(ui.directionBtns.right, '→');
    drawJoystick();
  }
  
  // 关卡对话弹窗
  if (game.state === 'LEVEL_DIALOG') {
    drawLevelDialog();
  }
  
  // 游戏结束弹窗
  if (game.state === 'GAME_OVER') {
    drawGameOver();
  }
  
  // 关卡完成弹窗
  if (game.state === 'LEVEL_COMPLETE') {
    drawLevelComplete();
  }
  
  // 成就弹窗
  if (game.state === 'ACHIEVEMENT') {
    drawAchievement();
  }
}

function drawDirectionBtn(rect, arrow) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(arrow, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

function drawJoystick() {
  const j = ui.joystick;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(j.centerX, j.centerY, j.radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  const arrowSize = 8;
  const arrowDist = 32;
  
  const drawArrow = (angle) => {
    const ax = j.centerX + Math.cos(angle) * arrowDist;
    const ay = j.centerY + Math.sin(angle) * arrowDist;
    const perpAngle = angle + Math.PI / 2;
    
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(angle) * arrowSize, ay + Math.sin(angle) * arrowSize);
    ctx.lineTo(ax + Math.cos(perpAngle) * arrowSize, ay + Math.sin(perpAngle) * arrowSize);
    ctx.lineTo(ax - Math.cos(perpAngle) * arrowSize, ay - Math.sin(perpAngle) * arrowSize);
    ctx.closePath();
    ctx.fill();
  };
  
  drawArrow(-Math.PI / 2);
  drawArrow(0);
  drawArrow(Math.PI / 2);
  drawArrow(Math.PI);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(j.centerX, j.centerY, j.centerRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  
  if (j.activeDirection) {
    ctx.fillStyle = 'rgba(74, 144, 226, 0.5)';
    const sector = getJoystickSector(j.activeDirection);
    ctx.beginPath();
    ctx.moveTo(j.centerX, j.centerY);
    ctx.arc(j.centerX, j.centerY, j.radius, sector.start, sector.end);
    ctx.closePath();
    ctx.fill();
  }
}

function getJoystickSector(direction) {
  switch (direction) {
    case 'up': return { start: -Math.PI * 0.75, end: -Math.PI * 0.25 };
    case 'right': return { start: -Math.PI * 0.25, end: Math.PI * 0.25 };
    case 'down': return { start: Math.PI * 0.25, end: Math.PI * 0.75 };
    case 'left': return { start: Math.PI * 0.75, end: Math.PI * 1.25 };
  }
  return { start: 0, end: 0 };
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 弹窗背景
  const popupH = Math.min(220, CANVAS_HEIGHT - 30);
  const popupY = CANVAS_HEIGHT / 2 - popupH / 2;
  ctx.fillStyle = '#1f2937';
  roundRect(CANVAS_WIDTH / 2 - 130, popupY, 260, popupH, 15);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', CANVAS_WIDTH / 2, popupY + 40);

  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  const modeText = game.mode === 'levels' ? `关卡 ${game.level}` : '无尽模式';
  ctx.fillText(modeText, CANVAS_WIDTH / 2, popupY + 65);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`得分: ${game.score}`, CANVAS_WIDTH / 2, popupY + 92);

  if (game.continuePlaying) {
    ctx.fillStyle = '#f97316';
    ctx.font = '12px sans-serif';
    ctx.fillText('🔥 极限挑战', CANVAS_WIDTH / 2, popupY + 112);
  }

  drawButton(ui.gameOverReplayBtn.x, ui.gameOverReplayBtn.y, ui.gameOverReplayBtn.w, ui.gameOverReplayBtn.h, '再来一局', '#a78bfa');
  drawButton(ui.gameOverHomeBtn.x, ui.gameOverHomeBtn.y, ui.gameOverHomeBtn.w, ui.gameOverHomeBtn.h, '返回主页', '#4ade80');
  drawButton(ui.gameOverLeaderboardBtn.x, ui.gameOverLeaderboardBtn.y, ui.gameOverLeaderboardBtn.w, ui.gameOverLeaderboardBtn.h, '查看排行', '#fbbf24');
}

function drawLeaderboard() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const popupH = Math.min(310, CANVAS_HEIGHT - 20);
  const popupY = CANVAS_HEIGHT / 2 - popupH / 2;
  const popupW = 310;
  const popupX = CANVAS_WIDTH / 2 - popupW / 2;

  ctx.fillStyle = '#1f2937';
  roundRect(popupX, popupY, popupW, popupH, 16);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('排行榜', CANVAS_WIDTH / 2, popupY + 28);

  // 关卡标签选择
  const levelNames = ['Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5'];
  const tabY = popupY + 42;
  const tabW = 46;
  const tabH = 24;
  const totalTabW = tabW * 5 + 6 * 4;
  const tabStartX = CANVAS_WIDTH / 2 - totalTabW / 2;

  for (let i = 0; i < 5; i++) {
    const tx = tabStartX + i * (tabW + 6);
    const active = game.currentLeaderLevel === i;
    ctx.fillStyle = active ? '#a78bfa' : 'rgba(255,255,255,0.1)';
    roundRect(tx, tabY, tabW, tabH, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(levelNames[i], tx + tabW / 2, tabY + 16);
  }

  // 保存tab位置供点击检测
  game._leaderTabs = [];
  for (let i = 0; i < 5; i++) {
    game._leaderTabs.push({ x: tabStartX + i * (tabW + 6), y: tabY, w: tabW, h: tabH });
  }

  // 显示当前关卡排行榜
  const currentLb = game.levelLeaderboards[game.currentLeaderLevel] || [];
  const listTop = tabY + 38;
  const rowH = Math.min(22, Math.floor((popupH - 130) / 8));
  const maxRows = Math.min(8, Math.floor((popupH - 130) / rowH));

  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';

  if (currentLb.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('暂无记录', CANVAS_WIDTH / 2, listTop);
  } else {
    currentLb.slice(0, maxRows).forEach((entry, index) => {
      const y = listTop + index * rowH;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      ctx.fillStyle = index < 3 ? '#fbbf24' : '#fff';
      ctx.fillText(`${medal} ${index + 1}. ${entry.name} - ${entry.score}`, CANVAS_WIDTH / 2, y);
    });
  }

  drawButton(ui.leaderboardHomeBtn.x, ui.leaderboardHomeBtn.y, ui.leaderboardHomeBtn.w, ui.leaderboardHomeBtn.h, '返回主页', '#4ade80');
  drawButton(ui.leaderboardPlayBtn.x, ui.leaderboardPlayBtn.y, ui.leaderboardPlayBtn.w, ui.leaderboardPlayBtn.h, '再来一局', '#a78bfa');
}

function drawLevelComplete() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const popupH = Math.min(180, CANVAS_HEIGHT - 30);
  const popupY = CANVAS_HEIGHT / 2 - popupH / 2;
  ctx.fillStyle = '#1f2937';
  roundRect(CANVAS_WIDTH / 2 - 120, popupY, 240, popupH, 15);
  ctx.fill();

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 过关!', CANVAS_WIDTH / 2, popupY + 50);

  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`得分: ${game.score}`, CANVAS_WIDTH / 2, popupY + 80);

  drawButton(ui.levelCompleteBtn.x, ui.levelCompleteBtn.y, ui.levelCompleteBtn.w, ui.levelCompleteBtn.h, '下一关', '#a78bfa');
}

function drawLevelDialog() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const popupW = CANVAS_WIDTH - 50;
  const popupH = Math.min(260, CANVAS_HEIGHT - 20);
  const popupX = 25;
  const popupY = CANVAS_HEIGHT / 2 - popupH / 2;

  ctx.fillStyle = '#1f2937';
  roundRect(popupX, popupY, popupW, popupH, 20);
  ctx.fill();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';

  // 图标
  ctx.font = '48px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(game.achievementIcon || '🎉', CANVAS_WIDTH / 2, popupY + 60);

  // 标题
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(game.achievementTitle || `Lv${game.level} 完成!`, CANVAS_WIDTH / 2, popupY + 95);

  // 消息
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(game.achievementMessage || '请选择下一步', CANVAS_WIDTH / 2, popupY + 118);

  // 得分
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`得分: ${game.score}`, CANVAS_WIDTH / 2, popupY + 142);

  // 说明文字
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px sans-serif';
  ctx.fillText('选择继续挑战下一关，或挑战极限看小蛇能多长', CANVAS_WIDTH / 2, popupY + 162);

  // 挑战下一关按钮
  drawButton(ui.levelDialogNextBtn.x, ui.levelDialogNextBtn.y, ui.levelDialogNextBtn.w, ui.levelDialogNextBtn.h, '挑战下一关', '#a78bfa');

  // 继续游玩按钮
  drawButton(ui.levelDialogContinueBtn.x, ui.levelDialogContinueBtn.y, ui.levelDialogContinueBtn.w, ui.levelDialogContinueBtn.h, '继续游玩', '#f97316');
}

function drawAchievement() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 弹窗
  const popupW = CANVAS_WIDTH - 80;
  const popupH = Math.min(260, CANVAS_HEIGHT - 20);
  const popupX = 40;
  const popupY = CANVAS_HEIGHT / 2 - popupH / 2;

  // 背景
  ctx.fillStyle = 'rgba(167, 139, 250, 0.2)';
  roundRect(popupX, popupY, popupW, popupH, 20);
  ctx.fill();

  // 边框
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';

  // 图标
  ctx.font = '56px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(game.achievementIcon, CANVAS_WIDTH / 2, popupY + 75);

  // 标题
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(game.achievementTitle, CANVAS_WIDTH / 2, popupY + 115);

  // 消息
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText(game.achievementMessage, CANVAS_WIDTH / 2, popupY + 140);

  // 得分
  ctx.fillStyle = '#4ade80';
  ctx.font = '18px sans-serif';
  ctx.fillText(`得分: ${game.score}`, CANVAS_WIDTH / 2, popupY + 168);

  // 按钮
  drawButton(ui.achievementBtn.x, ui.achievementBtn.y, ui.achievementBtn.w, ui.achievementBtn.h, '太棒了!', '#fbbf24');
}

function drawMenuPanel(x, y, w, h, title) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.83)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 12, y + 18);
}

function drawMenuButton(x, y, w, h, text, isActive, activeColor, inactiveColor) {
  ctx.fillStyle = isActive ? activeColor : inactiveColor;
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  
  ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

function drawButton(x, y, w, h, text, color) {
  ctx.fillStyle = color;
  roundRect(x, y, w, h, 12);
  ctx.fill();
  
  ctx.fillStyle = (color === '#fbbf24' || color === '#4ade80' || color === '#22c55e') ? '#000' : '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 启动游戏
init();
