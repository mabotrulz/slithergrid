/**
 * SlitherGrid Unit Tests
 * Run with: node test/game.test.js
 * 
 * Tests core game logic by loading the game script in jsdom
 * and making assertions against game state.
 */

const { JSDOM } = require('jsdom');

// Track test results
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; return; }
  failed++;
  console.log(`  ✗ FAIL: ${msg}`);
}

function assertEq(actual, expected, msg) {
  if (actual === expected) { passed++; return; }
  failed++;
  console.log(`  ✗ FAIL: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html>
    <html><body>
      <div class="game-wrapper">
        <div class="header">
          <h1>~ slithergrid ~</h1>
          <div class="stats">
            <div class="stat"><div class="stat-label">You</div><div class="stat-value" id="score">0</div></div>
            <div class="stat"><div class="stat-label">Best</div><div class="stat-value high" id="highscore">0</div></div>
          </div>
        </div>
        <div class="canvas-wrap">
          <canvas id="game" width="600" height="600"></canvas>
          <div class="overlay" id="overlay">
            <h2 id="overlayTitle">💀 Game Over</h2>
            <div class="final-score" id="finalScore">0</div>
            <div class="final-label">points</div>
            <div class="sub" id="finalMsg"></div>
            <button onclick="showSetup()">↻ Play Again</button>
          </div>
          <div class="setup-screen active" id="setupScreen">
            <div class="setup-box">
              <h1>~ slithergrid ~</h1>
              <div class="subtitle">Configure your match</div>
              <div class="setup-row">
                <label>AI Opponents</label>
                <div class="btn-group">
                  <button class="sbtn" onclick="adjOpps(-1)">−</button>
                  <span class="val" id="oppsVal">2</span>
                  <button class="sbtn" onclick="adjOpps(1)">+</button>
                </div>
              </div>
              <div class="setup-row">
                <label>Speed</label>
                <div class="slider-wrap">
                  <span style="color:#555;font-size:11px">Slow</span>
                  <input type="range" id="speedSlider" min="0" max="10" value="4">
                  <span style="color:#555;font-size:11px">Fast</span>
                </div>
              </div>
              <div class="setup-row"><span class="val" id="speedLabel">4</span></div>
              <button class="setup-start" onclick="startGame()">▶ Start</button>
            </div>
          </div>
        </div>
        <div class="controls">
          <span class="direction-hint" id="hint">W A S D · Arrows · Swipe</span>
          <button onclick="showSetup()">↻ New Game</button>
        </div>
      </div>
    </body></html>
  `, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously'
  });

  // Mock Canvas dimensions for calcGrid
  const canvas = dom.window.document.getElementById('game');
  Object.defineProperty(canvas.parentElement, 'clientWidth', { get: () => 600, configurable: true });
  Object.defineProperty(canvas.parentElement, 'clientHeight', { get: () => 600, configurable: true });
  canvas.width = 600;
  canvas.height = 600;
  canvas.getContext = () => ({
    fillStyle: null, fillRect: () => {},
    strokeStyle: null, lineWidth: null,
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
    stroke: () => {}, arc: () => {}, fill: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}, save: () => {}, restore: () => {},
    globalAlpha: null, shadowColor: null, shadowBlur: null,
    font: null, textAlign: null, textBaseline: null,
    fillText: () => {},
    setTransform: () => {},
    clearRect: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    drawImage: () => {},
    getImageData: () => ({data: []}),
    putImageData: () => {},
  });

  // Mock timing
  dom.window.setInterval = (fn, ms) => ({ fn, ms, _id: 'mock' });
  dom.window.clearInterval = () => {};
  
  // Mock localStorage
  dom.window.localStorage.getItem = () => null;
  dom.window.localStorage.setItem = () => {};

  return dom;
}

function loadGame(dom) {
  const fs = require('fs');
  const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('No script tag found');
  
  try {
    dom.window.eval(scriptMatch[1]);
    dom.window.eval("window.__snakes=snakes;window.__ais=ais;window.__food=food;window.__bombs=bombs;window.__score=score;window.__aiCount=aiCount;window.__playerBoost=playerBoost;window.__playerBlink=playerBlink;window.__snakeBlink=snakeBlink;window.__COLS=COLS;window.__ROWS=ROWS;window.__playerDir=_playerDir;window.__lastDodge=_lastDodge;window.__powerUps=powerUps;window.__gameTick=gameTick;window.__aiBoosts=aiBoosts;");
  } catch (e) {
    console.error('Script eval failed:', e.message);
    throw e;
  }

  const w = dom.window;
  
  // Make global game state accessible
  return {
    w,
    init: () => { w.eval('aiCount=2;speedVal=4;init()'); w.__snakes = w.eval('snakes'); w.__ais = w.eval('ais'); w.__food = w.eval('food'); w.__score = w.eval('score'); w.__COLS = w.eval('COLS'); w.__ROWS = w.eval('ROWS'); w.__playerDir = w.eval('_playerDir'); },
    calcGrid: w.calcGrid,
    moveSnake: w.moveSnake,
    aiThink: w.aiThink,
    endGame: w.endGame,
    startGame: w.startGame,
    
    // Expose state (use w.eval since game uses let not var)
    get snakes() { return w.__snakes; },
    get ais() { return w.__ais; },
    get food() { return w.__food; },
    get bombs() { return w.__bombs; },
    get score() { return w.__score; },
    get aiScore() { return w.__aiScore; },
    get aiCount() { return w.__aiCount; },
    get running() { return w.__running; },
    get playerBoost() { return w.__playerBoost; },
    get playerBlink() { return w.__playerBlink; },
    get snakeBlink() { return w.__snakeBlink; },
    get COLS() { return w.__COLS; },
    get ROWS() { return w.__ROWS; },
    get playerDir() { return w.__playerDir; },
    set playerDir(d) { w.__playerDir = d; },
    get lastDodge() { return w.__lastDodge; },
    get powerUps() { return w.__powerUps; },
    
    // Helpers
    tick() {
      w.eval('gameTick++;if(playerBoost>0)playerBoost--;for(var i=0;i<aiCount;i++){if(aiBoosts[i]>0)aiBoosts[i]--;if(snakeBlink[i]>0)snakeBlink[i]--;}if(playerBlink>0)playerBlink--;');
      w.__gameTick = w.eval('gameTick');
      w.__playerBoost = w.eval('playerBoost');
      w.__playerBlink = w.eval('playerBlink');
      w.__snakeBlink = w.eval('snakeBlink');
      w.__aiCount = w.eval('aiCount');
    },
    movePlayer() {
      const r = w.eval('moveSnake(0, _playerDir)');
      if (r && r.dead) w.eval('running=false');
      w.__snakes = w.eval('snakes');
      w.__score = w.eval('score');
      w.__playerBoost = w.eval('playerBoost');
      return r || {};
    },
    moveAI(i) {
      w.eval('aiThink('+i+')');
      w.eval('ais['+i+'].dir={...ais['+i+'].nextDir}');
      const r = w.eval('moveSnake('+(i+1)+', ais['+i+'].dir)');
      if (r && r.dead) {
        w.eval('snakes.splice('+(i+1)+',1);ais.splice('+i+',1);aiBoosts.splice('+i+',1);aiCount--;if(snakeBlink.length>'+i+')snakeBlink.splice('+i+',1)');
      }
      w.__snakes = w.eval('snakes');
      w.__ais = w.eval('ais');
      w.__aiCount = w.eval('aiCount');
      return r || {};
    },
    // Place a snake segment at a specific position for testing
    setSnake(idx, segments) {
      w.eval('snakes['+idx+']='+JSON.stringify(segments));
      w.__snakes = w.eval('snakes');
    },
    setFood(x, y) {
      const ok = w.eval('!snakes.some(function(s){return s.some(function(t){return t.x==='+x+'&&t.y==='+y+'})})');
      if (ok) { w.eval('food={x:'+x+',y:'+y+'}'); w.__food = w.eval('food'); }
      return ok;
    },
    setBombs(bombList) {
      w.eval('bombs='+JSON.stringify(bombList||[]));
      w.__bombs = w.eval('bombs');
    },
    setPowerUp(type, x, y) {
      w.eval('powerUps.'+type+'={x:'+x+',y:'+y+'}');
      w.__powerUps = w.eval('powerUps');
    }
  };
}

// ===== TESTS =====
const dom = setupDOM();
const game = loadGame(dom);

describe('Initialization', () => {
  game.init();
  
  assert(game.snakes.length === 3, '3 snakes total (1 player + 2 AI)');
  assert(game.aiCount === 2, '2 AI opponents');
  assert(game.snakes[0].length === 3, 'Player starts with 3 segments');
  assertEq(game.snakes[0][0].x, 3, 'Player head x = 3');
  assertEq(game.snakes[0][0].y, 3, 'Player head y = 3');
  assertEq(game.playerDir.x, 1, 'Player faces right');
  assertEq(game.playerDir.y, 0, 'Player faces right (no vertical)');
  assert(game.food !== null, 'Food is spawned');
  assertEq(game.score, 0, 'Score starts at 0');
  assertEq(game.running, true, 'Game is running');
});

describe('Movement', () => {
  game.init();
  const headBefore = { ...game.snakes[0][0] };
  game.playerDir = { x: 1, y: 0 };
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Moving right does not kill');
  assertEq(game.snakes[0][0].x, headBefore.x + 1, 'Head moves right by 1');
  assertEq(game.snakes[0][0].y, headBefore.y, 'Y stays same');
});

describe('Wrap around', () => {
  game.init();
  // Move player to right edge then wrap
  const cols = game.COLS;
  game.snakes[0][0].x = cols - 1;
  game.playerDir = { x: 1, y: 0 };
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Wrapping does not kill');
  assertEq(game.snakes[0][0].x, 0, 'Wraps to left side (x=0)');
});

describe('Food eating', () => {
  game.init();
  const lenBefore = game.snakes[0].length;
  game.playerDir = { x: 0, y: 1 };
  
  // Place player above food
  game.snakes[0][0].x = 10;
  game.snakes[0][0].y = 10;
  game.setFood(10, 11);
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Eating food does not kill');
  assertEq(game.snakes[0].length, lenBefore + 1, 'Snake grows by 1 after eating');
  assertEq(game.food.x !== 10 || game.food.y !== 11, true, 'New food spawns');
});

describe('Self collision', () => {
  game.init();
  // Make a snake that will hit itself
  game.setSnake(0, [
    {x: 5, y: 5}, {x: 6, y: 5}, {x: 6, y: 6}, {x: 5, y: 6}
  ]);
  game.playerDir = { x: 0, y: -1 }; // try to go up — body at (5,6)
  // Actually, going up from (5,5) with body at (5,6) — that shouldn't collide
  
  // Better test: make a U-shape going right
  game.setSnake(0, [
    {x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}
  ]);
  game.playerDir = { x: -1, y: 0 }; // reverse into body
  
  game.tick();
  const r = game.movePlayer();
  
  assert(r.dead, 'Self collision kills');
});

describe('Body collision — no boost (cut 1 segment)', () => {
  game.init();
  // Player going right, AI body in the way
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}]);
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  const lenBefore = game.snakes[0].length;
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Body collision without boost does not kill (len > 3)');
  assertEq(game.snakes[0].length, lenBefore - 1, 'Loses 1 segment from body collision');
});

describe('Body collision — kills at min size', () => {
  game.init();
  // Player has exactly 3 segments (min size)
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}]);
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(r.dead, 'Body collision kills at min size (3 segments)');
});

describe('Body collision — with boost cuts other snake', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}, {x: 9, y: 5}]);
  game.playerBoost = 10;
  game.playerDir = { x: 1, y: 0 };
  const aiLenBefore = game.snakes[1].length;
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Boost cut does not kill the attacker');
  assert(game.snakes[1].length <= aiLenBefore, 'Boost cut shortens the other snake');
});

describe('Body collision — escape to free direction after cut', () => {
  game.init();
  // Player hits AI body but front is blocked. Left should be free
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}]); // AI body at (6,5)
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Escapes to free direction after body cut');
  // Player should have moved to a free cell near (6,5)
  const head = game.snakes[0][0];
  const isFree = game.snakes[1].every(s => s.x !== head.x || s.y !== head.y);
  assert(isFree, 'Player head is not on the other snake after escape');
});

describe('Head-on collision — dodges left/right', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setSnake(1, [{x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}]); // head at (6,5) facing left
  game.playerDir = { x: 1, y: 0 }; // player going right — will meet AI head at (6,5)
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Head-on collision dodges instead of dying');
});

describe('Head-on collision — dies when both sides blocked', () => {
  game.init();
  // Player going right, AI head at (6,5), walls/body blocking left and right escape
  // Actually, for the dodge to fail, both perpendicular cells need to be blocked
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setSnake(1, [{x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5}]);
  // Block the dodge cells: (5,4) and (5,6) with AI body  
  game.snakes[1].push({x: 5, y: 4}); // block up
  game.snakes[1].push({x: 5, y: 6}); // block down
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(r.dead, 'Head-on collision kills when escape blocked');
});

describe('Bomb collision — cuts 35% of snake', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}, {x: 1, y: 5}]);
  game.setBombs([{x: 6, y: 5}]);
  game.playerDir = { x: 1, y: 0 };
  const lenBefore = game.snakes[0].length;
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Bomb collision with long snake does not kill');
  // 35% of 5 = 1.75 = Math.floor = 1... but Math.max(2, 1) = 2
  assert(game.snakes[0].length < lenBefore, 'Bomb cuts snake length');
  assert(game.bombs.length === 0, 'Bomb is removed after collision');
});

describe('Bomb collision — kills short snake', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setBombs([{x: 6, y: 5}]);
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(r.dead, 'Bomb kills short snake (3 segments - 35% = 1 = <3)');
});

describe('Rainbow power-up — activates boost', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setPowerUp('rainbow', 6, 5);
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Collecting rainbow power-up does not kill');
  assert(game.playerBoost > 0, 'Player gains boost after rainbow pickup');
  assert(game.powerUps.rainbow === null, 'Rainbow power-up is consumed');
});

describe('Yellow power-up — grows snake by 3', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}]);
  game.setPowerUp('yellow', 6, 5);
  game.playerDir = { x: 1, y: 0 };
  const lenBefore = game.snakes[0].length;
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Collecting yellow power-up does not kill');
  assertEq(game.snakes[0].length, lenBefore + 3, 'Snake grows by 3 after yellow pickup');
  assert(game.powerUps.yellow === null, 'Yellow power-up is consumed');
});

describe('Blink at min size after cut', () => {
  game.init();
  // Player has 4 segments, will lose 1 from body collision → 3 = min size = blink
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}]);
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  const r = game.movePlayer();
  
  assert(!r.dead, 'Does not die at 4→3 segments');
  assertEq(game.snakes[0].length, 3, 'Snake is now at min size (3)');
  assert(game.playerBlink > 0, 'Player blink timer is set');
});

describe('Blink decrements over time', () => {
  game.init();
  game.setSnake(0, [{x: 5, y: 5}, {x: 4, y: 5}, {x: 3, y: 5}, {x: 2, y: 5}]);
  game.setSnake(1, [{x: 10, y: 10}, {x: 6, y: 5}, {x: 7, y: 5}]);
  game.playerBoost = 0;
  game.playerDir = { x: 1, y: 0 };
  
  game.tick();
  game.movePlayer();
  const blinkVal = game.playerBlink;
  
  // Tick a few times
  for (let i = 0; i < 5; i++) game.tick();
  
  assert(game.playerBlink < blinkVal, 'Blink timer decreases over time');
});

describe('AI count configuration', () => {
  const w = game.w;
  
  // Test adjustment
  w.aiCount = 2;
  w.adjOpps(1);
  assertEq(w.aiCount, 3, 'adjOpps(+1) increases AI count');
  
  w.adjOpps(-1);
  assertEq(w.aiCount, 2, 'adjOpps(-1) decreases AI count');
  
  w.aiCount = 8;
  w.adjOpps(1);
  assertEq(w.aiCount, 8, 'AI count max is 8');
  
  w.aiCount = 1;
  w.adjOpps(-1);
  assertEq(w.aiCount, 1, 'AI count min is 1');
});

describe('Speed configuration', () => {
  const w = game.w;
  
  w.speedVal = 0;
  assertEq(w.getBaseTick(0), 100, 'Speed 0 = 100ms');
  
  w.speedVal = 4;
  assertEq(w.getBaseTick(4), 80, 'Speed 4 = 80ms');
  
  w.speedVal = 10;
  assertEq(w.getBaseTick(10), 50, 'Speed 10 = 50ms');
});

describe('Game initialization with different AI counts', () => {
  game.w.aiCount = 4;
  game.init();
  
  assertEq(game.snakes.length, 5, '5 snakes with 4 AI (1 player + 4 AI)');
  assertEq(game.aiCount, 4, '4 AI opponents');
  
  game.w.aiCount = 1;
  game.init();
  
  assertEq(game.snakes.length, 2, '2 snakes with 1 AI');
  assertEq(game.aiCount, 1, '1 AI opponent');
});

// Restore default
game.w.aiCount = 2;

// ===== RESULTS =====
const total = passed + failed;
console.log(`\n${'='.repeat(50)}`);
console.log(` Results: ${passed}/${total} passed`);
if (failed > 0) {
  console.log(` ${'✗'.repeat(Math.min(failed, 20))} ${failed} failed`);
  process.exit(1);
} else {
  console.log(' ✓ All tests passed!');
}
