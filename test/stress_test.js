const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("index.html","utf8");
const mockCtx = { fillStyle:null,fillRect:()=>{},strokeStyle:null,beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},stroke:()=>{},arc:()=>{},fill:()=>{},createRadialGradient:()=>({addColorStop:()=>{}}),roundRect:()=>{},save:()=>{},restore:()=>{},globalAlpha:null,shadowColor:null,shadowBlur:null,font:null,textAlign:null,textBaseline:null,fillText:()=>{},setTransform:()=>{},clearRect:()=>{},translate:()=>{},rotate:()=>{},scale:()=>{},drawImage:()=>{},getImageData:()=>({data:[]}),putImageData:()=>{} };
const dom = new JSDOM(html,{url:"http://localhost",pretendToBeVisual:true,runScripts:"dangerously",beforeParse:function(win){win.HTMLCanvasElement.prototype.getContext=function(){return mockCtx};win.setTimeout=function(){};win.clearTimeout=function(){};win.setInterval=function(){return({})};win.clearInterval=function(){};win.AudioContext=function(){this.currentTime=0;this.destination={};var g={gain:{value:0,exponentialRampToValueAtTime:function(){}},connect:function(){return{}}};this.createOscillator=function(){return{type:null,frequency:{value:0},connect:function(){return g},start:function(){},stop:function(){}}};this.createGain=function(){return g}};win.Audio=function(){};win.Audio.prototype.play=function(){return Promise.resolve()};win.Audio.prototype.pause=function(){};win.localStorage.getItem=function(){return null};win.localStorage.setItem=function(){};}});

const w = dom.window;
function c(e){try{return w.eval(e)}catch(e2){return null}}

let deaths = 0;
let total = 0;

// Run many random steps and log any death with its context
for (let run = 0; run < 100; run++) {
  w.eval("aiCount=2;speedVal=4;init()");
  c("COLS=40;ROWS=30");
  
  for (let step = 0; step < 200; step++) {
    total++;
    
    // Random direction for player
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const nd = dirs[Math.floor(Math.random() * 4)];
    const curDir = c("window._playerDir") || {x:1,y:0};
    // Can't reverse
    if (!(nd.x === -curDir.x && nd.y === -curDir.y)) {
      c("window._playerDir={x:"+nd.x+",y:"+nd.y+"}");
    }
    
    // Snapshot before
    const sBefore = c("JSON.parse(JSON.stringify(snakes))");
    const bombsBefore = c("JSON.parse(JSON.stringify(bombs))");
    const aiCountBefore = c("aiCount");
    
    // Run one update step
    w.eval("gameTick++;if(playerBoost>0)playerBoost--;if(playerBlink>0)playerBlink--;for(var i=0;i<aiCount;i++){if(aiBoosts[i]>0)aiBoosts[i]--;if(snakeBlink[i]>0)snakeBlink[i]--;}");
    
    // AI moves
    const ac = c("aiCount");
    let aiDied = false;
    for (let i = (ac||0)-1; i >= 0; i--) {
      if (c("typeof ais["+i+"]") === 'undefined') continue;
      c("aiThink("+i+")");
      c("ais["+i+"].dir={...ais["+i+"].nextDir}");
      const r = c("moveSnake("+(i+1)+",ais["+i+"].dir)");
      if (r && r.dead) {
        c("snakes.splice("+(i+1)+",1);ais.splice("+i+",1);aiBoosts.splice("+i+",1);aiCount--");
      } else if (r && r.cutKill !== undefined) {
        const ck = r.cutKill;
        if (ck === 0) { aiDied = true; break; }
        c("snakes.splice("+ck+",1);var ak="+(ck-1)+";if(ak>=0&&ak<ais.length){ais.splice(ak,1);aiBoosts.splice(ak,1)};aiCount--");
      }
    }
    
    if (aiDied) { deaths++; break; }
    
    // Player moves
    const playerResult = c("moveSnake(0, window._playerDir||{x:1,y:0})");
    if (playerResult && playerResult.dead) {
      // Check if this was a valid death or a false positive
      const sAfter = c("JSON.parse(JSON.stringify(snakes))");
      const pHeadBefore = sBefore && sBefore[0] && sBefore[0][0];
      const bombsList = c("JSON.parse(JSON.stringify(bombs))");
      
      // Check minimum distance to any AI snake
      let minDist = 999;
      if (sBefore) {
        const pHead = sBefore[0] && sBefore[0][0];
        if (pHead) {
          for (let si = 1; si < sBefore.length; si++) {
            const aiSegs = sBefore[si];
            if (aiSegs) {
              for (const seg of aiSegs) {
                const dist = Math.abs(seg.x - pHead.x) + Math.abs(seg.y - pHead.y);
                if (dist < minDist) minDist = dist;
              }
            }
          }
        }
      }
      
      // Check self-collision possibility
      const pHead = sBefore && sBefore[0] && sBefore[0][0];
      let isSelfCollision = false;
      let isBombCollision = false;
      if (pHead && sBefore && sBefore[0]) {
        const intendedX = (pHead.x + nd.x + 40) % 40;
        const intendedY = (pHead.y + nd.y + 30) % 30;
        // Self collision?
        for (let si = 1; si < sBefore[0].length; si++) {
          if (sBefore[0][si].x === intendedX && sBefore[0][si].y === intendedY) {
            isSelfCollision = true; break;
          }
        }
        // Bomb?
        if (bombsBefore) {
          for (const b of bombsBefore) {
            if (b.x === intendedX && b.y === intendedY) isBombCollision = true;
          }
        }
      }
      
      console.log(`DEATH at step ${step} (run ${run})`);
      console.log(`  Player head: ${JSON.stringify(pHead)}`);
      console.log(`  Player dir: ${JSON.stringify(nd)}`);
      console.log(`  Min dist to AI: ${minDist}`);
      console.log(`  Self collision?: ${isSelfCollision}`);
      console.log(`  Bomb collision?: ${isBombCollision}`);
      console.log(`  AI snakes: ${sBefore ? sBefore.length - 1 : '?'}`);
      console.log(`  Player segments: ${sBefore ? sBefore[0].length : '?'}`);
      console.log(`  Player blink: ${c("playerBlink")}`);
      console.log(`  Player boost: ${c("playerBoost")}`);
      
      if (!isSelfCollision && !isBombCollision && minDist > 1) {
        console.log(`  *** SUSPICIOUS: no contact with anything! ***`);
        if (sBefore) {
          console.log(`  All snakes:`);
          for (let si = 0; si < sBefore.length; si++) {
            console.log(`    [${si}]: ${JSON.stringify(sBefore[si])}`);
          }
        }
        console.log(`  Bombs: ${JSON.stringify(bombsBefore)}`);
      }
      
      deaths++;
      break;
    }
    
    // Spawn occasional bombs to match game logic
    if (c("gameTick") % 60 === 0) c("spawnBomb()");
    if (c("powerUpTimers") && c("powerUpTimers.rainbow") >= 90) c("spawnPU('rainbow');powerUpTimers.rainbow=0");
    if (c("powerUpTimers") && c("powerUpTimers.yellow") >= 220) c("spawnPU('yellow');powerUpTimers.yellow=0");
  }
}

console.log(`\nTotal: ${total}, Deaths: ${deaths}`);
