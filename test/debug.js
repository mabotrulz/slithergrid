const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.log('NO SCRIPT MATCH'); process.exit(1); }

const script = scriptMatch[1];

const dom = new JSDOM(`<!DOCTYPE html><html><body>
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
        <h2 id="overlayTitle">Game Over</h2>
        <div class="final-score" id="finalScore">0</div>
        <div class="final-label">points</div>
        <div class="sub" id="finalMsg"></div>
        <button>Play Again</button>
      </div>
      <div class="setup-screen active" id="setupScreen">
        <div class="setup-box">
          <h1>~ slithergrid ~</h1>
          <div class="subtitle">Configure</div>
          <span class="val" id="oppsVal">2</span>
          <input type="range" id="speedSlider" min="0" max="10" value="4">
          <span class="val" id="speedLabel">4</span>
          <button>Start</button>
        </div>
      </div>
    </div>
    <div class="controls">
      <span class="direction-hint" id="hint">WASD</span>
      <span id="musicBtn">🔊</span>
      <button>New Game</button>
    </div>
  </div>
</body></html>`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

const canvas = dom.window.document.getElementById('game');
const parent = canvas.parentElement;
Object.defineProperty(parent, 'clientWidth', { get: () => 600, configurable: true });
Object.defineProperty(parent, 'clientHeight', { get: () => 600, configurable: true });
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
  fillText: () => {}, setTransform: () => {}, clearRect: () => {},
  translate: () => {}, rotate: () => {}, scale: () => {},
  drawImage: () => {}, getImageData: () => ({data:[]}), putImageData: () => {}
});
dom.window.setInterval = () => ({});
dom.window.clearInterval = () => {};
dom.window.setTimeout = () => ({});
dom.window.AudioContext = function() {};
dom.window.Audio = function() {};
dom.window.localStorage.getItem = () => null;
dom.window.localStorage.setItem = () => {};

try {
  dom.window.eval(script);
  console.log('EVAL COMPLETED');
  
  // Check variables
  const checks = ['snakes','ais','food','bombs','particles','gameTick','gameLoop','running','COLS','ROWS'];
  for (const v of checks) {
    console.log(`  ${v}:`, typeof dom.window.eval(`typeof ${v}`), '=', dom.window.eval(`${v}`));
  }
  
  // Call init
  dom.window.eval('aiCount=2;speedVal=4;init()');
  console.log('INIT OK');
  console.log('  snakes.length:', dom.window.eval('snakes.length'));
  
  // Test moveSnake
  dom.window.eval('window._playerDir={x:1,y:0}');
  const r = dom.window.eval('moveSnake(0, {x:1,y:0})');
  console.log('moveSnake result:', JSON.stringify(r));
  console.log('snakes[0].length:', dom.window.eval('snakes[0].length'));
  
} catch(e) {
  console.log('ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
  process.exit(1);
}
