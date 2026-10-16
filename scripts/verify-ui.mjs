import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {simulateOffer} from '../src/engine.js';

const browser=await chromium.connectOverCDP(process.argv[2]);
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('http://127.0.0.1:'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.afterYou.state());
const point=(x,y)=>page.evaluate(([x,y])=>window.afterYou.screenPoint(x,y),[x,y]);
const clickPuck=async id=>{const p=(await state()).pucks.find(p=>p.id===id);const q=await point(p.x,p.y);await page.mouse.click(q.x,q.y);};
async function aim(ids,dx,dy,distance) {
  await clickPuck(ids[0]);await clickPuck(ids[1]);
  const p=(await state()).pucks.find(p=>p.id===ids[0]),norm=Math.hypot(dx,dy);
  const from=await point(p.x,p.y),to=await point(p.x+dx/norm*distance/2.2,p.y+dy/norm*distance/2.2);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:18});await page.mouse.up();
  await page.waitForFunction(()=>window.afterYou.state().phase==='choose');
}
try {
  await page.reload();await page.waitForFunction(()=>window.afterYou);
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').textContent(),'Sound off');
  await page.locator('#rules').click();assert.equal(await page.locator('#rules-dialog').evaluate(d=>d.open),true);
  await page.locator('#rules-close').click();
  const before=await page.evaluate(()=>window.afterYou.camera());
  await page.mouse.move(700,440);await page.mouse.down({button:'right'});await page.mouse.move(810,490,{steps:15});await page.mouse.up({button:'right'});
  await page.waitForTimeout(250);const after=await page.evaluate(()=>window.afterYou.camera());
  assert.ok(Math.hypot(...before.map((v,i)=>v-after[i]))>5,'right drag orbits');
  await page.mouse.wheel(0,-140);await page.waitForTimeout(250);
  const zoom=await page.evaluate(()=>window.afterYou.camera());assert.ok(Math.hypot(...zoom)<Math.hypot(...after),'wheel zooms');
  await page.locator('#overhead').click();await page.waitForTimeout(200);
  // A real drag that returns to its puck cancels without consuming a turn.
  await clickPuck(1);await clickPuck(2);const first=(await state()).pucks[0],p=await point(first.x,first.y);
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+60,p.y-20,{steps:10});await page.mouse.move(p.x,p.y,{steps:10});await page.mouse.up();
  assert.equal((await state()).phase,'select');await page.locator('#clear').click();
  // The exact two-stage teaching position uses only rendered button/pointer actions.
  await page.locator('#example').click();assert.equal((await state()).phase,'choose');
  await clickPuck(4);assert.equal((await state()).phase,'choose','unoffered puck cannot fire');
  await page.locator('#choose-b').click();
  await page.waitForFunction(()=>window.afterYou.state().phase==='choose'&&window.afterYou.state().player===1);
  assert.deepEqual((await state()).scores,[3,2]);
  await page.locator('#choose-b').click();
  await page.waitForFunction(()=>window.afterYou.state().phase==='select');assert.deepEqual((await state()).scores,[3,3]);
  // Finish the example through an aimed mouse shot and exercise the victory dialog.
  await page.locator('#overhead').click();await page.waitForTimeout(180);
  await aim([1,4],-5,-3,35);await page.locator('#choose-a').click();
  await page.waitForFunction(()=>window.afterYou.state().phase==='over');assert.deepEqual((await state()).scores,[4,3]);
  assert.equal(await page.locator('#end-dialog').evaluate(d=>d.open),true);
  await page.locator('#rematch').click();assert.deepEqual((await state()).scores,[0,0]);
  await page.locator('#overhead').click();await page.waitForTimeout(180);
  // Complete a fresh match: find legal direct scoring offers, then input them with the mouse.
  let offers=0;
  while((await state()).phase!=='over'&&offers<24) {
    const s=await state(),live=s.pucks.filter(p=>p.alive),goals=s.player===0?[[0,0],[100,60]]:[[100,0],[0,60]];
    let best=null;
    for(const p of live)for(const [x,y] of goals){
      const other=live.find(q=>q.id!==p.id),dx=x-p.x,dy=y-p.y,distance=Math.min(90,Math.hypot(dx,dy)+5);
      const result=simulateOffer(s,[p.id,other.id],dx,dy,distance,p.id);
      const value=(result.scores[s.player]-s.scores[s.player])*10-(result.scores[1-s.player]-s.scores[1-s.player])*12;
      if(!best||value>best.value)best={ids:[p.id,other.id],dx,dy,distance,value};
    }
    await aim(best.ids,best.dx,best.dy,best.distance);await page.locator('#choose-a').click();
    await page.waitForFunction(()=>['select','over'].includes(window.afterYou.state().phase));offers++;
  }
  const final=await state();assert.equal(final.phase,'over');assert.ok(offers>0);
  assert.equal(await page.locator('#end-dialog').evaluate(d=>d.open),true);
  await page.locator('#rematch').click();await page.locator('#perspective').click();
  assert.equal(await page.locator('#fatal').isVisible(),false,'renderer remains healthy');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,offers,finalScores:final.scores,checks:['rules','mute','orbit','zoom','cancel','invalid-choice','example-response','victory','full-match','rematch'],errors}));
} finally {await browser.close();}
