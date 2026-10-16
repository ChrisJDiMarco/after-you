import test from 'node:test';
import assert from 'node:assert/strict';
import {CONFIG, createGame, commitOffer, choosePuck, stepGame, simulateOffer} from '../src/engine.js';

const energy = s => s.pucks.reduce((sum,p) => sum + (p.alive ? p.vx*p.vx+p.vy*p.vy : 0),0);
const finish = s => {for(let i=0;s.phase==='moving'&&i<30000;i++)stepGame(s); assert.notEqual(s.phase,'moving');return s;};
const moving = (pucks,scores=[0,0]) => Object.assign(createGame(),{pucks:pucks.map((p,i)=>({id:i+1,alive:true,vx:0,vy:0,...p})),phase:'moving',scores});

test('initial board and alternating starter are explicit',()=>{
 const s=createGame({starter:1}); assert.equal(s.player,1);assert.equal(s.pucks.length,9);assert.deepEqual(s.scores,[0,0]);assert.equal(s.phase,'select');assert.equal(CONFIG.width,100);
});
test('invalid offers and choices leave state unchanged',()=>{
 const s=createGame();const before=JSON.stringify(s);
 for(const args of [[[1,1],1,0,20],[[1,99],1,0,20],[[1,2],0,0,20],[[1,2],NaN,1,20],[[1,2],1,0,NaN]])assert.equal(commitOffer(s,...args),false);
 assert.equal(JSON.stringify(s),before);assert.equal(choosePuck(s,1),false);
 assert.equal(commitOffer(s,[1,2],3,4,200),true);assert.equal(s.offer.distance,90);assert.equal(s.offer.dx,.6);assert.equal(s.offer.dy,.8);
 assert.equal(choosePuck(s,3),false);assert.equal(choosePuck(s,2),true);assert.ok(s.pucks[1].vx<0);assert.ok(s.pucks[1].vy<0);assert.equal(s.pucks[0].vx,0);
 assert.equal(commitOffer(s,[1,2],1,0,20),false);assert.equal(choosePuck(s,1),false);
});
test('minimum impulse clamp and exact unobstructed free run',()=>{
 const s=createGame();s.pucks=[{id:1,x:20,y:30,vx:0,vy:0,alive:true},{id:2,x:80,y:40,vx:0,vy:0,alive:true}];
 commitOffer(s,[1,2],1,0,-1);assert.equal(s.offer.distance,10);choosePuck(s,1);finish(s);
 assert.ok(Math.abs(s.pucks[0].x-30)<.001);assert.deepEqual(s.turns,[1,0]);assert.equal(s.player,1);assert.equal(s.phase,'select');assert.equal(s.offer,null);
});
test('every corner scores for its diagonal owner',()=>{
 for(const [x,y,vx,vy,owner] of [[4,4,-12,-12,0],[96,4,12,-12,1],[4,56,-12,12,1],[96,56,12,12,0]]){
 const s=moving([{x,y,vx:vx*4,vy:vy*4}]);const seen=[];
 while(s.phase==='moving'){stepGame(s);seen.push(...s.events);}
 assert.equal(s.scores[owner],1);assert.equal(s.pucks[0].alive,false);assert.equal(seen.filter(e=>e.type==='pocket').length,1);
 }
});
test('collision transfers velocity and never creates kinetic energy',()=>{
 const s=moving([{x:40,y:30,vx:65},{x:43,y:30},{x:47,y:30},{x:51,y:30}]);let previous=energy(s),hit=false;
 for(let i=0;i<3000&&s.phase==='moving';i++){stepGame(s);const next=energy(s);assert.ok(next<=previous+1e-8,`${next} > ${previous}`);previous=next;hit ||= s.events.some(e=>e.type==='collision');}
 assert.equal(hit,true);assert.ok(s.pucks[1].x>43);assert.equal(s.phase,'select');
});
test('rails reflect and dissipate velocity',()=>{
 const s=moving([{x:98.99,y:30,vx:60}]);stepGame(s);assert.ok(s.pucks[0].vx<0);assert.ok(energy(s)<3600);assert.ok(s.pucks[0].x<=99);
});
test('settlement evaluates the whole shot and permits a simultaneous draw',()=>{
 const s=moving([{x:2,y:2},{x:98,y:2}],[3,3]);stepGame(s);
 assert.deepEqual(s.scores,[4,4]);assert.equal(s.winner,'draw');assert.equal(s.phase,'over');assert.deepEqual(s.turns,[1,0]);assert.equal(s.events.at(-1).type,'settled');stepGame(s);assert.deepEqual(s.events,[]);
});
test('a fourth point does not stop remaining motion early',()=>{
 const s=moving([{x:2,y:2},{x:50,y:30,vx:30}],[3,2]);stepGame(s);assert.equal(s.scores[0],4);assert.equal(s.phase,'moving');assert.equal(s.winner,null);finish(s);assert.equal(s.winner,0);
});
test('turn limit and score determine end only after final offer settles',()=>{
 const s=moving([{x:50,y:30}],[2,3]);s.turns=[12,11];s.player=1;stepGame(s);assert.equal(s.phase,'over');assert.equal(s.winner,1);assert.deepEqual(s.turns,[12,12]);
 const draw=moving([{x:50,y:30}],[2,2]);draw.turns=[12,11];draw.player=1;stepGame(draw);assert.equal(draw.winner,'draw');
});
test('deterministic replay and fixed timestep batching agree',()=>{
 const a=createGame(),b=createGame();for(const s of [a,b]){commitOffer(s,[4,5],1,.2,75);choosePuck(s,4);}
 for(let i=0;i<900;i++){stepGame(a,1/60);for(let j=0;j<4;j++)stepGame(b,1/240);}
 const clean=s=>({...s,events:[]});assert.deepEqual(clean(a),clean(b));
 assert.deepEqual(simulateOffer(createGame(),[1,2],1,.2,75,1),simulateOffer(createGame(),[1,2],1,.2,75,1));
});
test('nonfinite or invalid timestep cannot poison the simulation',()=>{
 const s=moving([{x:50,y:30,vx:50}]);const before=JSON.stringify(s.pucks);for(const dt of [NaN,Infinity,-1,0])stepGame(s,dt);assert.equal(JSON.stringify(s.pucks),before);
});
test('worked example: either Amber choice forces a point',()=>{
 for(const choice of [1,2]){
  const s=simulateOffer(createGame({example:true}),[1,2],-5,-3,35,choice);
  assert.deepEqual(s.scores,[3,2]);assert.equal(s.player,1);assert.equal(s.phase,'select');assert.equal(s.pucks.find(p=>p.id===choice).alive,false);
 }
});
test('worked example: after B, either Blue counterchoice makes it 3-3',()=>{
 const initial=simulateOffer(createGame({example:true}),[1,2],-5,-3,35,2);
 for(const choice of [1,3]){
  const s=simulateOffer(initial,[1,3],5,-1,80,choice);
  assert.deepEqual(s.scores,[3,3]);assert.equal(s.player,0);assert.deepEqual(s.turns,[1,1]);assert.equal(s.phase,'select');
 }
});
