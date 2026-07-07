describe('Head-on — AI moves first, cannot move into player', () => {
  testInit(1);
  // Player at (5,5), AI at (6,5) heading left.
  // AI moves first: AI tries (5,5) = player head. AI should stay put.
  ctx('snakes[0]=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}]');
  ctx('snakes[1]=[{x:6,y:5},{x:7,y:5},{x:8,y:5}]');
  ctx('ais[0]={dir:{x:-1,y:0},nextDir:{x:-1,y:0},score:0,name:"T"};aiBoosts[0]=0');
  ctx('playerBoost=0');
  const aiLenBefore = ctx('snakes[1].length');
  const aiXBefore = ctx('snakes[1][0].x');
  // AI tries to move left into player
  ctx('gameTick++;ais[0].dir={x:-1,y:0};ais[0].nextDir={x:-1,y:0}');
  const aiR = ctx('moveSnake(1,{x:-1,y:0})');
  // AI should survive and stay put
  assert(!aiR.dead, 'AI survives head-on vs player');
  assert(ctx('snakes[1][0].x') === aiXBefore, 'AI stays in place (x unchanged)');
  assert(ctx('snakes[1].length') === aiLenBefore, 'AI keeps same length');
  // Player moves normally
  ctx('window._playerDir={x:1,y:0}');
  const r = ctx('moveSnake(0,window._playerDir)');
  assert(!r.dead, 'Player survives after AI head-on block');
});
