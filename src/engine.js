// Positions and velocities use table units. Physics has no clock, renderer, or randomness.
export const CONFIG = Object.freeze({width:100,height:60,radius:1,pocketRadius:3,friction:30,minDistance:10,maxDistance:90});
const FIXED_STEP = 1/240;
const POCKETS = [{x:0,y:0,owner:0},{x:100,y:0,owner:1},{x:0,y:60,owner:1},{x:100,y:60,owner:0}];
const INITIAL = [[20,15],[47,10],[78,14],[32,27],[56,31],[82,34],[17,45],[43,49],[70,47]];
const EXAMPLE = [[25,15],[75,45],[37.5,52.5],[48,20],[51,41]];

export function createGame({starter=0,example=false}={}) {
  return {
    pucks:(example?EXAMPLE:INITIAL).map(([x,y],i)=>({id:i+1,x,y,vx:0,vy:0,alive:true})),
    scores:example?[2,2]:[0,0],player:example?0:(starter===1?1:0),turns:[0,0],
    phase:'select',offer:null,winner:null,events:[],
  };
}

export function commitOffer(state,ids,dx,dy,distance) {
  if(state.phase!=='select'||!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1])return false;
  if(![dx,dy,distance].every(Number.isFinite))return false;
  const magnitude=Math.hypot(dx,dy);
  if(!Number.isFinite(magnitude)||magnitude<1e-9)return false;
  if(!ids.every(id=>state.pucks.some(p=>p.id===id&&p.alive)))return false;
  state.offer={ids:[...ids],dx:dx/magnitude,dy:dy/magnitude,distance:Math.max(CONFIG.minDistance,Math.min(CONFIG.maxDistance,distance))};
  state.phase='choose';state.events=[];
  return true;
}

export function choosePuck(state,id) {
  if(state.phase!=='choose'||!state.offer)return false;
  const {ids,dx,dy,distance}=state.offer;
  const index=ids.indexOf(id),puck=state.pucks.find(p=>p.id===id&&p.alive);
  if(index<0||!puck)return false;
  const speed=Math.sqrt(2*CONFIG.friction*distance)*(index===0?1:-1);
  puck.vx=dx*speed;puck.vy=dy*speed;
  state.phase='moving';state.events=[];
  return true;
}

function capture(state,puck,fromX=puck.x,fromY=puck.y) {
  // Test the entire traveled segment so a fast puck cannot jump across a pocket.
  for(const pocket of POCKETS) {
    const dx=puck.x-fromX,dy=puck.y-fromY,length2=dx*dx+dy*dy;
    const t=length2?Math.max(0,Math.min(1,((pocket.x-fromX)*dx+(pocket.y-fromY)*dy)/length2)):0;
    if(Math.hypot(fromX+t*dx-pocket.x,fromY+t*dy-pocket.y)<=CONFIG.pocketRadius) {
      puck.alive=false;puck.vx=0;puck.vy=0;state.scores[pocket.owner]++;
      state.events.push({type:'pocket',id:puck.id,owner:pocket.owner,x:pocket.x,y:pocket.y});
      return true;
    }
  }
  return false;
}

function rails(state,puck) {
  let speed=0;
  if(puck.x<1){puck.x=1;if(puck.vx<0){speed=Math.max(speed,-puck.vx);puck.vx*=-.86;}}
  if(puck.x>99){puck.x=99;if(puck.vx>0){speed=Math.max(speed,puck.vx);puck.vx*=-.86;}}
  if(puck.y<1){puck.y=1;if(puck.vy<0){speed=Math.max(speed,-puck.vy);puck.vy*=-.86;}}
  if(puck.y>59){puck.y=59;if(puck.vy>0){speed=Math.max(speed,puck.vy);puck.vy*=-.86;}}
  if(speed>0)state.events.push({type:'collision',speed,x:puck.x,y:puck.y});
}

function advance(state,dt) {
  for(const p of state.pucks) {
    if(!p.alive)continue;
    const fromX=p.x,fromY=p.y,speed=Math.hypot(p.vx,p.vy);
    if(speed>0) {
      const movingTime=Math.min(dt,speed/CONFIG.friction);
      const travel=speed*movingTime-.5*CONFIG.friction*movingTime*movingTime;
      p.x+=p.vx/speed*travel;p.y+=p.vy/speed*travel;
      const remaining=Math.max(0,speed-CONFIG.friction*dt);
      p.vx*=remaining/speed;p.vy*=remaining/speed;
    }
    // Capture precedes rail resolution: pocket mouths never behave like solid corners.
    if(!capture(state,p,fromX,fromY))rails(state,p);
  }
  // A few positional passes resolve contact chains without adding velocity/energy.
  for(let pass=0;pass<3;pass++) {
    for(let i=0;i<state.pucks.length;i++) {
      const a=state.pucks[i];if(!a.alive)continue;
      for(let j=i+1;j<state.pucks.length;j++) {
        const b=state.pucks[j];if(!b.alive)continue;
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d>=2)continue;
        const nx=d>1e-9?dx/d:1,ny=d>1e-9?dy/d:0;
        const correction=(2-d)/2;
        a.x-=nx*correction;a.y-=ny*correction;b.x+=nx*correction;b.y+=ny*correction;
        const closing=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
        if(closing>0) {
          const impulse=(1+.94)*closing/2;
          a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
          state.events.push({type:'collision',speed:closing,x:(a.x+b.x)/2,y:(a.y+b.y)/2});
        }
      }
    }
    for(const p of state.pucks)if(p.alive&&!capture(state,p))rails(state,p);
  }
  if(state.pucks.every(p=>!p.alive||(p.vx===0&&p.vy===0))) {
    state.turns[state.player]++;
    state.player=1-state.player;state.offer=null;
    const matchOver=state.scores.some(score=>score>=4)||state.turns.every(turns=>turns>=12);
    state.phase=matchOver?'over':'select';
    if(matchOver)state.winner=state.scores[0]===state.scores[1]?'draw':state.scores[0]>state.scores[1]?0:1;
    state.events.push({type:'settled'});
  }
}

export function stepGame(state,dt=FIXED_STEP) {
  state.events=[];
  if(state.phase!=='moving'||!Number.isFinite(dt)||dt<=0)return state;
  // A whole number of fixed ticks produces identical results across render rates.
  // Bound accepted elapsed time to one second so suspended windows cannot freeze the UI.
  const elapsed=Math.min(dt,1),ticks=Math.floor(elapsed/FIXED_STEP+1e-10);
  for(let i=0;i<ticks&&state.phase==='moving';i++)advance(state,FIXED_STEP);
  const remainder=elapsed-ticks*FIXED_STEP;
  if(remainder>1e-10&&state.phase==='moving')advance(state,remainder);
  return state;
}

export function simulateOffer(state,ids,dx,dy,distance,choiceId) {
  const copy=structuredClone(state);
  if(!commitOffer(copy,ids,dx,dy,distance)||!choosePuck(copy,choiceId))throw new Error('Invalid offer or choice');
  for(let i=0;i<30000&&copy.phase==='moving';i++)stepGame(copy);
  if(copy.phase==='moving')throw new Error('Physics failed to settle');
  return copy;
}
