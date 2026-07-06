/**
 * SlitherGrid Unit Tests
 * Run with: npm test
 * 
 * Runs assertions inside the game's eval context to avoid
 * JSDOM scope issues with let/const variables.
 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

let passed = 0, failed = 0;
function assert(c, m) { if (c) passed++; else { failed++; console.log(`  ✗ FAIL: ${m}`); } }
function assertEq(a, e, m) { if (a === e) passed++; else { failed++; console.log(`  ✗ FAIL: ${m} — expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`); } }
function describe(n, fn) { console.log(`\n${n}`); fn(); }

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const mockCtx = {
  fillStyle:null,fillRect:()=>{},strokeStyle:null,lineWidth:null,
  beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},stroke:()=>{},arc:()=>{},fill:()=>{},
  createRadialGradient:()=>({addColorStop:()=>{}}),roundRect:()=>{},save:()=>{},restore:()=>{},
  globalAlpha:null,shadowColor:null,shadowBlur:null,font:null,textAlign:null,
  textBaseline:null,fillText:()=>{},setTransform:()=>{},clearRect:()=>{},
  translate:()=>{},rotate:()=>{},scale:()=>{},drawImage:()=>{},
  getImageData:()=>({data:[]}),putImageData:()=>{}
};

const dom = new JSDOM(html, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
  beforeParse(win) {
    win.HTMLCanvasElement.prototype.getContext = () => mockCtx;
    win.setTimeout = () => {};
    win.clearTimeout = () => {};
    win.setInterval = () => ({});
    win.clearInterval = () => {};
    win.AudioContext = class {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
        const gain = { gain: { value: 0, exponentialRampToValueAtTime: () => {} }, connect: () => {} };
        this.createOscillator = () => ({ type: null, frequency: { value: 0 }, connect: () => gain, start: () => {}, stop: () => {} });
        this.createGain = () => gain;
      }
    };
    win.Audio=class{play(){return Promise.resolve();}pause(){}};
    win.localStorage.getItem=()=>null;
    win.localStorage.setItem=()=>{};
  }
});

const w = dom.window;

// Helper: get values from game context
function ctx(expr) {
  try { return w.eval(expr); }
  catch(e) { return '__ERROR: ' + e.message; }
}
function ctxStr(expr) {
  const v = ctx(expr);
  try { return JSON.stringify(v); } catch(e) { return String(v); }
}

// Convenience: get game state snapshot
function state() { return ctx('({snakes,ais,food,bombs,score,aiCount,playerBoost,playerBlink,snakeBlink,aiBoosts,powerUps,running,COLS,ROWS,_playerDir})'); }

function setupGrid() { ctx('COLS=40;ROWS=30;CELL=15;canvas.width=600;canvas.height=450'); }
function testInit(ai) { w.eval('aiCount='+(ai||2)+';speedVal=4;init()'); setupGrid(); }

// ===== TESTS =====

describe('Initialization', () => {
  testInit();
  const s = state();
  assertEq(s.snakes.length, 3, '3 snakes (1 player + 2 AI)');
  assertEq(s.aiCount, 2, '2 AI');
  assertEq(s.snakes[0].length, 3, 'Player starts at 3');
  assert(s.food !== null, 'Food spawned');
  assertEq(s.score, 0, 'Score 0');
});

describe('Movement', () => {
  testInit();
  const hx = ctx('snakes[0][0].x');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Move right does not kill');
  assertEq(ctx('snakes[0][0].x'), hx + 1, 'Head moves right by 1');
  assertEq(ctx('snakes[0][0].y'), ctx('snakes[0][1].y'), 'Y stays same');
});

describe('Wrap around', () => {
  testInit();
  w.eval('snakes[0][0].x=COLS-1');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Wrap does not kill');
  assertEq(ctx('snakes[0][0].x'), 0, 'Wraps to x=0');
});

describe('Food eating', () => {
  testInit();
  w.eval('snakes[0]=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];food={x:10,y:11}');
  const lenB = ctx('snakes[0].length');
  w.eval('window._playerDir={x:0,y:1};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Eat food does not kill');
  assertEq(ctx('snakes[0].length'), lenB + 1, 'Grows by 1');
  assertNeq(ctx('food.x'), 10, 'New food spawned');
});
function assertNeq(a, e, m) { if (a !== e) passed++; else { failed++; console.log(`  ✗ FAIL: ${m} — expected not ${JSON.stringify(e)}`); } }

describe('Self collision', () => {
  testInit();
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  w.eval('window._playerDir={x:-1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(r.dead, 'Self collision kills');
});

// ===== BODY COLLISION =====
describe('Body hit — survive 4→3', () => {
  testInit(1);
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  w.eval('snakes[1]=[{x:10,y:10},{x:6,y:5},{x:7,y:5},{x:8,y:5}]');
  w.eval('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  w.eval('playerBoost=0');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, '4→3 survives');
  assertEq(ctx('snakes[0].length'), 3, 'Now 3 segments');
  assert(ctx('playerBlink') > 0, 'Player blink set');
});

describe('Body hit — die at 3', () => {
  testInit(1);
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5}]');
  w.eval('snakes[1]=[{x:10,y:10},{x:6,y:5},{x:7,y:5}]');
  w.eval('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  w.eval('playerBoost=0');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(r.dead, '3→2 dies');
});

describe('Body hit — redirect to free cell', () => {
  testInit(1);
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5},{x:1,y:5}]');
  w.eval('snakes[1]=[{x:10,y:10},{x:6,y:5},{x:7,y:5}]');
  w.eval('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  w.eval('playerBoost=0');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Redirect survives');
  const s = state();
  const head = s.snakes[0][0];
  const onAI = s.snakes[1].some(s2 => s2.x === head.x && s2.y === head.y);
  assert(!onAI, 'Head not on AI');
  assertEq(s.snakes[0].length, 4, 'Size 5→4');
});

describe('Body hit — all blocked → die', () => {
  testInit(1);
  w.eval('snakes[0]=[{x:1,y:5},{x:0,y:5},{x:39,y:5},{x:38,y:5}]');
  w.eval('snakes[1]=[{x:10,y:10},{x:2,y:5},{x:1,y:4},{x:1,y:6},{x:0,y:5}]');
  w.eval('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  w.eval('playerBoost=0');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(r.dead, 'All blocked → die');
});

describe('Body hit — boost cuts other snake', () => {
  testInit(1);
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  w.eval('snakes[1]=[{x:10,y:10},{x:6,y:5},{x:7,y:5},{x:8,y:5},{x:9,y:5}]');
  w.eval('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  w.eval('playerBoost=10');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const aiLen = ctx('snakes[1].length');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Boost survives');
  assert(ctx('snakes[1].length') < aiLen, 'Other snake cut');
});

// ===== HEAD-ON =====
describe('Head-on — both face → both cut', () => {
  testInit(1);
  ctx('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  ctx('snakes[1]=[{x:7,y:5},{x:8,y:5},{x:9,y:5}]');
  ctx('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  ctx('playerBoost=0');
  const pLen = ctx('snakes[0].length');
  // AI moves first: 7,5→6,5 heading left
  ctx('ais[0].dir={x:-1,y:0};ais[0].nextDir={x:-1,y:0}');
  ctx('moveSnake(1,{x:-1,y:0})');
  // Player tries right: 5,5→6,5 = head-on
  ctx('window._playerDir={x:1,y:0}');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Both-face: player lives');
  assert(ctx('snakes[0].length') < pLen, 'Both-face: player cut');
});

describe('Head-on — player faces AI only → player cuts', () => {
  testInit(1);
  ctx('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  ctx('snakes[1]=[{x:6,y:4},{x:6,y:3},{x:6,y:2}]');
  ctx('ais[0]={dir:{x:0,y:1},nextDir:{x:0,y:1},score:0,name:"T"};aiBoosts[0]=0');
  ctx('playerBoost=0');
  const pLen = ctx('snakes[0].length');
  // AI moves down: 6,4→6,5 (set dir directly, bypass aiThink)
  ctx('ais[0].dir={x:0,y:1};ais[0].nextDir={x:0,y:1}');
  ctx('moveSnake(1,{x:0,y:1})');
  // Player tries right: 5,5→6,5 = head-on with AI head
  ctx('window._playerDir={x:1,y:0}');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Player-face: player lives');
  assert(ctx('snakes[0].length') < pLen, 'Player-face: player cut');
});

// ===== BOMB =====
describe('Bomb — survive 4→3', () => {
  testInit();
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  w.eval('bombs=[{x:6,y:5}]');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Bomb 4→3 survives');
  assertEq(ctx('snakes[0].length'), 3, 'Lost 1');
  assertEq(ctx('bombs.length'), 0, 'Bomb removed');
});

describe('Bomb — die at 3', () => {
  testInit();
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5}]');
  w.eval('bombs=[{x:6,y:5}]');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(r.dead, '3→2 dies');
});

// ===== POWER-UPS =====
describe('Rainbow power-up', () => {
  testInit();
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5}]');
  w.eval('powerUps.rainbow={x:6,y:5}');
  w.eval('playerBoost=0');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Rainbow OK');
  assert(ctx('playerBoost') > 0, 'Boost gained');
});

describe('Yellow power-up — grow 3', () => {
  testInit();
  w.eval('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5}]');
  w.eval('powerUps.yellow={x:6,y:5}');
  w.eval('window._playerDir={x:1,y:0};gameTick++;');
  const lenB = ctx('snakes[0].length');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Yellow OK');
  assertEq(ctx('snakes[0].length'), lenB + 3, 'Grew by 3');
});

// ===== CONFIG =====
describe('AI config', () => {
  ctx('aiCount=2');
  w.adjOpps(1); assertEq(ctx('aiCount'), 3, '+1');
  w.adjOpps(-1); assertEq(ctx('aiCount'), 2, '-1');
});

describe('Speed', () => {
  assertEq(w.getBaseTick(0), 170, 'speed 0');
  assertEq(w.getBaseTick(4), 156, 'speed 4 = 156ms (20% slower)');
  assertEq(w.getBaseTick(10), 70, 'speed 10');
});

describe('Multi AI init', () => {
  testInit(4); assertEq(ctx('snakes.length'), 5, '4 AI = 5');
  testInit(1); assertEq(ctx('snakes.length'), 2, '1 AI = 2');
});

// ===== RESULTS =====
const total = passed + failed;
console.log(`\n${'='.repeat(50)}`);
console.log(` Results: ${passed}/${total} passed`);
if (failed > 0) { console.log(` ✗ ${failed} failed`); process.exit(1); }
else console.log(' ✓ All tests passed!');
