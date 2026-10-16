import {createGame,commitOffer,choosePuck,stepGame,CONFIG} from './engine.js';
import {TableScene} from './scene.js';

const $=id=>document.getElementById(id);
const names=['Amber','Blue'];
const colors=['#ac6d29','#397b99'];
let game=createGame({starter:Math.random()<.5?0:1});
let starter=game.player,selected=[],drag=null,preview=null,hovered=null,exampleStep=0;
let scene,audioContext,muted=false,toastTimer=0,exampleTimer=0,lastCollisionTime=0;

function tone(frequency,duration=.09,volume=.04,type='sine') {
  if(muted)return;
  try {
    audioContext??=new AudioContext();
    if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*.75,now+duration);
    gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(volume,now+.005);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.01);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{/* Audio is optional; a device failure must not interrupt a match. */}
}

function toast(message,duration=2800) {
  clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');
  toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);
}

function activeOffer(){return game.phase==='choose'?game.offer:preview;}
function syncScene(){scene.sync(game,selected,activeOffer(),hovered);}

function updateUI() {
  const chooser=game.phase==='choose',active=chooser?1-game.player:game.player;
  document.documentElement.style.setProperty('--player',colors[active]);
  for(let i=0;i<2;i++){
    $(`score-${i}`).textContent=game.scores[i];
    $(`${i===0?'amber':'blue'}-score`).classList.toggle('active',active===i);
    const pips=$(`${i===0?'amber':'blue'}-pips`);pips.replaceChildren();
    for(let p=0;p<4;p++){const dot=document.createElement('i');if(p<game.scores[i])dot.className='filled';pips.append(dot);}
  }
  $('round').textContent=`Offer ${Math.min(24,game.turns[0]+game.turns[1]+1)} of 24`;
  $('match-mode').textContent=exampleStep?'GUIDED EXAMPLE':'TWO PEOPLE · ONE TABLE';
  $('turn-owner').textContent=game.phase==='over'?'MATCH COMPLETE':`${names[active].toUpperCase()}’S ${chooser?'CHOICE':'OFFER'}`;
  let title,hint;
  if(game.phase==='moving'){
    title='Let the table decide.';hint='Every pocket scores for its owner. Watch what stays behind.';
  }else if(game.phase==='over'){
    title=game.winner==='draw'?'A draw. Another round?':`${names[game.winner]} wins. Your move next time.`;hint='Start a rematch to trade the first offer.';
  }else if(chooser){
    title=`${names[active]}, which one goes?`;hint='Click a highlighted puck to release it. The other possibility stays on the table.';
  }else if(drag){
    title='One direction. Two possibilities.';hint='Drag farther for more force. Release to give your opponent the choice.';
  }else if(selected.length===2){
    title=`Drag forward from puck ${selected[0]}.`;hint=`Puck ${selected[1]} gets the opposite arrow. Release to commit the offer.`;
  }else if(selected.length===1){
    title='Now choose the other possibility.';hint='Click a second puck. It will receive the equal, opposite shot.';
  }else{
    title='Choose your two possibilities.';hint='Click any two pucks. They belong to both of you.';
  }
  if(exampleStep===1&&chooser){title='Both shots score for Amber.';hint='Blue: release puck 2 to keep puck 1. Or choose puck 1 and see what you lose.';}
  if(exampleStep===2&&chooser){title='The puck you kept answers back.';hint='Pucks 1 and 3 now both score for Blue. Amber: choose either one.';}
  if(exampleStep===3&&game.phase==='select'){title='That is the art of the offer.';hint='The point you gave away kept an answering threat. Start a new match to try it yourself.';}
  if(exampleStep===4&&game.phase==='select'){title='You gave away the useful puck.';hint='Amber scored, and puck 1 is gone. Retry the example and release puck 2 instead.';}
  $('instruction').textContent=title;$('hint').textContent=hint;
  const offer=activeOffer();
  $('pick-a').textContent=selected[0]??'—';$('pick-b').textContent=selected[1]??'—';
  $('pick-a').classList.toggle('selected',selected.length>0);$('pick-b').classList.toggle('selected',selected.length>1);
  $('clear').disabled=game.phase!=='select'||selected.length===0||!!drag;
  $('power-fill').style.width=offer?`${offer.distance/CONFIG.maxDistance*100}%`:'0%';
  $('power-value').textContent=offer?`${Math.round(offer.distance)} / 90`:'—';
  $('choice-actions').hidden=!chooser;
  if(chooser){$('choose-a').textContent=`Release ${game.offer.ids[0]}`;$('choose-b').textContent=`Release ${game.offer.ids[1]}`;}
  $('footer-note').textContent=exampleStep?'Guided example · These are real shots, using the same physics.':'Every puck is shared. Each corner has an owner.';
  $('example').textContent=exampleStep?'Restart the example ↗':'Try the clever bit ↗';
  syncScene();
}

function reset({example=false}={}) {
  clearTimeout(exampleTimer);clearTimeout(toastTimer);$('toast').classList.remove('visible');
  if(drag){try{scene.renderer.domElement.releasePointerCapture(drag.pointerId);}catch{/* Capture may already have ended. */}}
  for(const id of ['end-dialog','rules-dialog','confirm-dialog'])$(id).close();
  if(!example)starter=1-starter;
  game=createGame({starter,example});selected=[];drag=null;preview=null;hovered=null;exampleStep=example?1:0;
  if(example){selected=[1,2];commitOffer(game,selected,-5,-3,35);}
  scene.setView('perspective');updateCameraButtons('perspective');updateUI();
  if(example)toast('A point is inevitable. Which puck should survive?',4000);
}

function launch(id) {
  if(!choosePuck(game,id))return;
  if(exampleStep===1)exampleStep=id===2?1:4;
  selected=[];preview=null;hovered=null;tone(180,.15,.06);updateUI();
}

function settled() {
  selected=[];preview=null;drag=null;
  if(game.phase==='over'){
    $('end-title').textContent=game.winner==='draw'?'A beautiful standoff.':`${names[game.winner]} wins.`;
    $('end-score').textContent=`${game.scores[0]}  —  ${game.scores[1]}`;
    updateUI();$('end-dialog').showModal();return;
  }
  if(exampleStep===1){
    exampleStep=2;
    exampleTimer=setTimeout(()=>{if(exampleStep!==2||game.phase!=='select')return;selected=[1,3];commitOffer(game,selected,5,-1,80);updateUI();toast('Keeping puck 1 created Blue’s answering offer.',4000);},900);
  }else if(exampleStep===2){exampleStep=3;toast('3–3. The choice changed what came next.',4000);}
  updateUI();
}

function updateCameraButtons(view){
  for(const mode of ['perspective','overhead']){$(mode).classList.toggle('active',mode===view);$(mode).setAttribute('aria-pressed',String(mode===view));}
}

function bindPointer() {
  const canvas=scene.renderer.domElement;
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||document.querySelector('dialog[open]'))return;
    const id=scene.pick(event.clientX,event.clientY,game);
    if(game.phase==='choose'){if(id!==null)launch(id);return;}
    if(game.phase!=='select'||id===null||exampleStep===2)return;
    if(selected.length===2&&id===selected[0]){
      drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);updateUI();return;
    }
    if(selected.includes(id))selected=selected.filter(p=>p!==id);
    else if(selected.length<2)selected.push(id);
    else selected=[id];
    preview=null;tone(selected.length===2?570:440,.08,.035);updateUI();
  });
  canvas.addEventListener('pointermove',event=>{
    if(drag){
      const p=game.pucks.find(p=>p.id===selected[0]),point=scene.tablePoint(event.clientX,event.clientY);
      if(!point||!p)return;
      const dx=point.x-p.x,dy=point.y-p.y,distance=Math.hypot(dx,dy);
      drag.moved=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;
      preview=distance>1.2?{ids:[...selected],dx:dx/distance,dy:dy/distance,distance:Math.min(90,Math.max(10,distance*2.2))}:null;
      updateUI();
    }else{
      hovered=scene.pick(event.clientX,event.clientY,game);
      const selectable=(game.phase==='select'||game.phase==='choose'&&game.offer.ids.includes(hovered));
      canvas.style.cursor=hovered!==null&&selectable?'pointer':'default';syncScene();
    }
  });
  canvas.addEventListener('pointerup',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    const shouldCommit=drag.moved&&preview;const offer=preview;drag=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(shouldCommit){commitOffer(game,selected,offer.dx,offer.dy,offer.distance);tone(660,.12,.035);toast(`Pass the choice to ${names[1-game.player]}.`);}
    preview=null;updateUI();
  });
  canvas.addEventListener('pointercancel',()=>{drag=null;preview=null;updateUI();});
  canvas.addEventListener('lostpointercapture',()=>{if(drag){drag=null;preview=null;updateUI();}});
  canvas.addEventListener('pointerleave',()=>{if(!drag){hovered=null;syncScene();}});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&game.phase==='select'){
      if(drag){const id=drag.pointerId;drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
      preview=null;selected=[];updateUI();
    }
  });
}

function bindControls() {
  $('clear').addEventListener('click',()=>{selected=[];preview=null;updateUI();});
  $('choose-a').addEventListener('click',()=>{if(game.offer)launch(game.offer.ids[0]);});
  $('choose-b').addEventListener('click',()=>{if(game.offer)launch(game.offer.ids[1]);});
  for(const view of ['perspective','overhead'])$(view).addEventListener('click',()=>{scene.setView(view);updateCameraButtons(view);syncScene();});
  $('rules').addEventListener('click',()=>$('rules-dialog').showModal());
  $('rules-close').addEventListener('click',()=>$('rules-dialog').close());
  $('rules-example').addEventListener('click',()=>reset({example:true}));
  $('example').addEventListener('click',()=>{
    if(game.turns.some(t=>t>0)&&!exampleStep&&game.phase!=='over'){
      $('confirm-dialog').querySelector('h2').textContent='Try the example?';$('confirm-dialog').querySelector('p').textContent='This will end your current match.';
      $('confirm-new').textContent='Play example';$('confirm-new').dataset.example='true';$('confirm-dialog').showModal();
    }else reset({example:true});
  });
  $('new-game').addEventListener('click',()=>{
    if(game.phase==='over'||exampleStep){reset();return;}
    $('confirm-dialog').querySelector('h2').textContent='A fresh table?';$('confirm-dialog').querySelector('p').textContent='The current match will end.';
    $('confirm-new').textContent='New match';$('confirm-new').dataset.example='false';$('confirm-dialog').showModal();
  });
  $('confirm-cancel').addEventListener('click',()=>$('confirm-dialog').close());
  $('confirm-new').addEventListener('click',()=>reset({example:$('confirm-new').dataset.example==='true'}));
  $('rematch').addEventListener('click',()=>reset());$('end-close').addEventListener('click',()=>$('end-dialog').close());
  const soundButton=()=>{$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('sound').title=muted?'Enable sound':'Mute sound';};
  soundButton();$('sound').addEventListener('click',()=>{muted=!muted;soundButton();if(!muted)tone(550,.13);});
  $('retry').addEventListener('click',()=>location.reload());
}

function fail(error) {
  console.error(error);$('fatal-detail').textContent='The 3D renderer encountered a problem. Restart the table to try again.';$('fatal').hidden=false;
}

try {
  scene=new TableScene($('stage'));bindPointer();bindControls();updateUI();
  scene.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(new Error('WebGL context lost'));});
  // Read-only inspection is available to the local test harness, never a mutation API.
  Object.defineProperty(window,'afterYou',{value:Object.freeze({state:()=>structuredClone(game),screenPoint:(x,y)=>scene.screenPoint(x,y),camera:()=>scene.camera.position.toArray()}),writable:false});
  let last=performance.now(),accumulator=0;
  function frame(now) {
    const dt=Math.min((now-last)/1000,.1);last=now;
    try {
      if(game.phase==='moving'){
        accumulator+=dt;
        while(accumulator>=1/240&&game.phase==='moving'){
          stepGame(game,1/240);accumulator-=1/240;
          for(const event of game.events){
            if(event.type==='pocket'){scene.pocketEffect(event);tone(event.owner===0?740:880,.35,.055);toast(`${names[event.owner]} scores.`);}
            if(event.type==='collision'&&event.speed>3&&now-lastCollisionTime>35){tone(170+Math.min(450,event.speed*6),.045,Math.min(.075,event.speed*.002));lastCollisionTime=now;}
            if(event.type==='settled')settled();
          }
        }
        syncScene();
      }else accumulator=0;
      scene.render(dt);requestAnimationFrame(frame);
    }catch(error){fail(error);}
  }
  requestAnimationFrame(frame);
}catch(error){bindControls();fail(error);}
