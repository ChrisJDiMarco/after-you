import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORS = [0xc28a42, 0x4586a3];
const SHOT_COLORS = [0xffd085, 0x9bdfff];
const TAU = Math.PI * 2;

function canvasTexture(draw, size=512) {
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;return texture;
}

function surfaceTexture() {
  return canvasTexture((c,s)=>{
    c.fillStyle='#244b4b';c.fillRect(0,0,s,s);
    let seed=41;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<100000;i++){const v=random();c.fillStyle=v>.5?'#b9cec317':'#091e1c16';c.fillRect(random()*s,random()*s,1,1);}
    c.strokeStyle='#b2b99e70';c.lineWidth=1;c.strokeRect(15,25,s-30,s-50);
    c.save();c.translate(s/2,s/2);c.strokeStyle='#b2b99e45';c.lineWidth=1;
    c.beginPath();c.arc(0,0,84,0,TAU);c.stroke();c.beginPath();c.arc(0,0,78,0,TAU);c.stroke();
    c.fillStyle='#b4b69a70';c.textAlign='center';c.font='italic 33px Baskerville,Georgia';c.fillText('After You',0,7);
    c.font='8px Helvetica';c.fillStyle='#b4b69a65';c.fillText('T W O   P O S S I B I L I T I E S',0,31);c.restore();
  },1024);
}

function woodTexture() {
  return canvasTexture((c,s)=>{
    c.fillStyle='#59412d';c.fillRect(0,0,s,s);
    for(let i=0;i<s;i++){
      const v=Math.sin(i*.55)+Math.sin(i*.113)*1.2+Math.sin(i*2.3)*.25;
      c.strokeStyle=`rgba(${v>0?'162,118,72':'28,20,12'},${Math.abs(v)*.11})`;c.lineWidth=.8;
      c.beginPath();c.moveTo(0,i);for(let x=0;x<=s;x+=8)c.lineTo(x,i+Math.sin(x*.011+i*.02)*3+Math.sin(x*.03)*.7);c.stroke();
    }
  });
}

function diskLabel(id) {
  return canvasTexture((c,s)=>{
    c.clearRect(0,0,s,s);c.fillStyle='#d9d9ca';c.beginPath();c.arc(s/2,s/2,s*.48,0,TAU);c.fill();
    c.strokeStyle='#8b927e';c.lineWidth=2;c.beginPath();c.arc(s/2,s/2,s*.40,0,TAU);c.stroke();
    c.fillStyle='#303c30';c.textAlign='center';c.textBaseline='middle';c.font=`${s*.45}px Baskerville,Georgia`;c.fillText(String(id),s/2,s*.54);
  },128);
}

export class TableScene {
  constructor(container) {
    this.container=container;this.puckMeshes=new Map();this.effects=[];this.selected=[];this.hovered=null;this.offer=null;this.player=0;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e9e8df');this.scene.fog=new THREE.Fog('#e9e8df',170,350);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(37,1,.1,600);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.target.set(0,0,0);this.controls.enableDamping=true;this.controls.dampingFactor=.12;
    this.controls.minDistance=78;this.controls.maxDistance=180;this.controls.minPolarAngle=.01;this.controls.maxPolarAngle=Math.PI*.40;
    this.controls.enablePan=false;this.controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.controls.touches={ONE:null,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.raycaster=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.55);
    this.pointer=new THREE.Vector2();this.temp=new THREE.Vector3();this.clock=0;
    const pmrem=new THREE.PMREMGenerator(this.renderer);const room=new RoomEnvironment();
    this.environment=pmrem.fromScene(room,.04);this.scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
    this.scene.environmentIntensity=.7;
    this.lights();this.table();this.arrowGroup=new THREE.Group();this.scene.add(this.arrowGroup);
    this.setView('perspective');
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  }

  lights() {
    this.scene.add(new THREE.HemisphereLight(0xfff4da,0x8c9c80,1.4));
    const key=new THREE.DirectionalLight(0xffedd2,3.4);key.position.set(-40,85,25);key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-85,right:85,top:70,bottom:-70,near:1,far:190});
    key.shadow.bias=-.00015;key.shadow.normalBias=.04;key.shadow.radius=3;this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xc8e5f0,1.5);fill.position.set(65,45,-50);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffd5a0,1);rim.position.set(-50,15,-80);this.scene.add(rim);
  }

  box(w,h,d,x,y,z,material,radius=.25) {
    const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,radius),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;
  }

  table() {
    const wood=new THREE.MeshStandardMaterial({map:woodTexture(),color:0x9f8968,roughness:.4,metalness:.02});
    const darkWood=new THREE.MeshStandardMaterial({color:0x302d25,roughness:.55});
    const brass=new THREE.MeshStandardMaterial({color:0xbca377,metalness:.77,roughness:.31});
    const cushion=new THREE.MeshStandardMaterial({color:0x5b6755,roughness:.85});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:0xe3e3d9,roughness:.94}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-9;floor.receiveShadow=true;this.scene.add(floor);
    // A shallow shadow underneath the floating plinth grounds the whole table.
    const contact=canvasTexture((c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'#252d2055');g.addColorStop(.55,'#252d2033');g.addColorStop(1,'#252d2000');c.fillStyle=g;c.fillRect(0,0,s,s);});
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(165,117),new THREE.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-8.95;this.scene.add(shadow);
    this.box(108,4,68,0,-4,0,wood,1.2);
    this.box(105,.4,65,0,-6.25,0,brass,.15);
    this.box(99,1.6,59,0,-7.25,0,darkWood,.6);
    this.box(105,1.7,65,0,-1.8,0,wood,.6);
    const shape=new THREE.Shape();
    shape.moveTo(-47,-30);shape.lineTo(47,-30);shape.absarc(50,-30,3,Math.PI,Math.PI/2,true);
    shape.lineTo(50,27);shape.absarc(50,30,3,-Math.PI/2,-Math.PI,true);
    shape.lineTo(-47,30);shape.absarc(-50,30,3,0,-Math.PI/2,true);
    shape.lineTo(-50,-27);shape.absarc(-50,-30,3,Math.PI/2,0,true);shape.closePath();
    const geo=new THREE.ShapeGeometry(shape,40);
    const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+50)/100,(pos.getY(i)+30)/60);
    const top=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:surfaceTexture(),roughness:.88,metalness:0,side:THREE.DoubleSide}));
    top.rotation.x=-Math.PI/2;top.receiveShadow=true;this.scene.add(top);
    for(const sign of [-1,1]){
      this.box(94,2.1,5.5,0,-.1,sign*32.75,wood,.5);
      this.box(5.5,2.1,54,sign*52.75,-.1,0,wood,.5);
      this.box(94,.7,.48,0,.32,sign*30.22,cushion,.15);
      this.box(.48,.7,54,sign*50.22,.32,0,cushion,.15);
      this.box(91,.045,.075,0,1.01,sign*33.5,brass,.015);
      this.box(.075,.045,51,sign*53.5,1.01,0,brass,.015);
      for(let i=-3;i<=3;i++){
        const dot=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.06,12),brass);dot.position.set(i*12,1.02,sign*32.5);this.scene.add(dot);
      }
    }
    this.pockets=[];
    for(const [x,z,owner] of [[-50,-30,0],[50,-30,1],[-50,30,1],[50,30,0]]){
      const color=COLORS[owner];
      const well=new THREE.Mesh(new THREE.CylinderGeometry(3,2.5,3,64,1,true),new THREE.MeshStandardMaterial({color:0x262f2b,roughness:.35,metalness:.4,side:THREE.DoubleSide}));well.position.set(x,-1.4,z);this.scene.add(well);
      const bottom=new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshBasicMaterial({color:0x10211d}));bottom.rotation.x=-Math.PI/2;bottom.position.set(x,-.35,z);this.scene.add(bottom);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(3.18,.17,12,72),new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.27,emissive:color,emissiveIntensity:.12}));
      ring.rotation.x=Math.PI/2;ring.position.set(x,.15,z);this.scene.add(ring);this.pockets.push(ring);
      const glow=new THREE.Mesh(new THREE.TorusGeometry(2.7,.055,8,64),new THREE.MeshBasicMaterial({color}));glow.rotation.x=Math.PI/2;glow.position.set(x,-.8,z);this.scene.add(glow);
      const label=canvasTexture((c,s)=>{c.fillStyle=owner===0?'#9c7039':'#527d8e';c.font='bold 30px Helvetica';c.textAlign='center';c.fillText(owner===0?'AMBER':'BLUE',s/2,s/2+10);},256);
      const plaque=new THREE.Mesh(new THREE.PlaneGeometry(8,3),new THREE.MeshBasicMaterial({map:label,transparent:true,depthWrite:false}));plaque.rotation.x=-Math.PI/2;plaque.position.set(x*.83,1.1,z*1.11);this.scene.add(plaque);
    }
    // A brass maker's plate is inset into the front edge.
    const name=canvasTexture((c,s)=>{c.fillStyle='#bba77c';c.fillRect(0,0,s,s);c.fillStyle='#483e2d';c.textAlign='center';c.font='40px Baskerville';c.fillText('AFTER YOU',s/2,s/2+12);},512);
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(14,1.8),new THREE.MeshStandardMaterial({map:name,metalness:.5,roughness:.4}));plaque.position.set(0,-3.9,34.03);this.scene.add(plaque);
  }

  makePuck(id) {
    const group=new THREE.Group();
    const points=[new THREE.Vector2(0,0),new THREE.Vector2(.86,0),new THREE.Vector2(.98,.10),new THREE.Vector2(1,.19),new THREE.Vector2(1,.54),new THREE.Vector2(.92,.69),new THREE.Vector2(0,.69)];
    const body=new THREE.Mesh(new THREE.LatheGeometry(points,48),new THREE.MeshStandardMaterial({color:0xbec5bd,metalness:.9,roughness:.23}));body.castShadow=true;body.receiveShadow=true;group.add(body);
    const face=new THREE.Mesh(new THREE.CircleGeometry(.78,48),new THREE.MeshBasicMaterial({map:diskLabel(id)}));face.rotation.x=-Math.PI/2;face.position.y=.7;group.add(face);
    const ridge=new THREE.Mesh(new THREE.TorusGeometry(.995,.025,6,48),new THREE.MeshStandardMaterial({color:0x4c594c,metalness:.65,roughness:.35}));ridge.rotation.x=Math.PI/2;ridge.position.y=.28;group.add(ridge);
    const halo=new THREE.Mesh(new THREE.RingGeometry(1.27,1.46,64),new THREE.MeshBasicMaterial({color:COLORS[0],transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.07;halo.visible=false;group.add(halo);
    this.scene.add(group);const entry={group,halo,face,alive:true,sink:0,id};this.puckMeshes.set(id,entry);return entry;
  }

  sync(state, selected=[], offer=null, hovered=null) {
    this.selected=selected;this.offer=offer;this.hovered=hovered;this.player=state.phase==='choose'?1-state.player:state.player;
    const present=new Set(state.pucks.map(p=>p.id));
    for(const [id,m] of this.puckMeshes)if(!present.has(id))m.group.visible=false;
    for(const p of state.pucks){
      const m=this.puckMeshes.get(p.id)||this.makePuck(p.id);
      if(p.alive){m.group.visible=true;m.sink=0;m.group.scale.setScalar(1);m.group.position.set(p.x-50,.03,p.y-30);}
      else if(m.alive){m.sink=.001;}
      m.alive=p.alive;
      const isSelected=selected.includes(p.id),isHover=hovered===p.id;
      m.halo.visible=p.alive&&(isSelected||isHover);m.halo.material.color.setHex(SHOT_COLORS[state.player]);m.halo.material.opacity=isSelected?.95:.4;
    }
    this.updateArrows(state,offer);
  }

  updateArrows(state,offer) {
    const key=offer?`${offer.ids.join()}:${offer.dx.toFixed(4)}:${offer.dy.toFixed(4)}:${offer.distance.toFixed(2)}:${state.player}`:'';
    if(key===this.arrowKey)return;this.arrowKey=key;
    while(this.arrowGroup.children.length){const object=this.arrowGroup.children.pop();object.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});object.parent=null;}
    if(!offer)return;
    const color=SHOT_COLORS[state.player];
    offer.ids.forEach((id,index)=>{
      const p=state.pucks.find(p=>p.id===id);if(!p?.alive)return;
      const sign=index===0?1:-1,dx=offer.dx*sign,dz=offer.dy*sign;
      const length=4+offer.distance*.28;
      const direction=new THREE.Vector3(dx,0,dz),origin=new THREE.Vector3(p.x-50+dx*1.7,.8,p.y-30+dz*1.7);
      const arrow=new THREE.ArrowHelper(direction,origin,length,color,1.6,.85);arrow.line.material.transparent=true;arrow.line.material.opacity=.8;this.arrowGroup.add(arrow);
      const ribbon=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,Math.max(.1,length-1),8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false}));
      ribbon.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);ribbon.position.set(origin.x+dx*(length-1)/2,.8,origin.z+dz*(length-1)/2);this.arrowGroup.add(ribbon);
    });
  }

  pocketEffect(event) {
    const mesh=new THREE.Mesh(new THREE.RingGeometry(2.8,3.2,64),new THREE.MeshBasicMaterial({color:COLORS[event.owner],transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(event.x-50,.25,event.y-30);this.scene.add(mesh);this.effects.push({mesh,life:0});
  }

  tablePoint(clientX,clientY) {
    const r=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.ray.intersectPlane(this.plane,new THREE.Vector3());
    return hit?{x:hit.x+50,y:hit.z+30}:null;
  }

  pick(clientX,clientY,state) {
    // Screen-space hit targets remain usable when the table is tilted or zoomed.
    let best=null,distance=26;
    for(const p of state.pucks){if(!p.alive)continue;const screen=this.screenPoint(p.x,p.y);const d=Math.hypot(screen.x-clientX,screen.y-clientY);if(d<distance){distance=d;best=p.id;}}
    return best;
  }

  screenPoint(x,y) {
    const r=this.renderer.domElement.getBoundingClientRect();const v=new THREE.Vector3(x-50,.7,y-30).project(this.camera);
    return{x:r.left+(v.x+1)*.5*r.width,y:r.top+(1-v.y)*.5*r.height};
  }

  setView(mode) {
    this.view=mode;this.controls.target.set(0,0,0);
    this.camera.position.set(...(mode==='overhead'?[0,113,.02]:[3,79,82]));this.controls.update();this.resize();
  }

  resize() {
    const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;
    this.renderer.setSize(width,height);this.camera.aspect=width/height;
    // Smaller windows retain enough horizontal field for the entire rim.
    this.camera.fov=this.camera.aspect<1.65?43:37;this.camera.updateProjectionMatrix();
  }

  render(dt) {
    this.clock+=dt;
    for(const m of this.puckMeshes.values()){
      if(m.sink>0&&m.group.visible){m.sink+=dt;m.group.position.y=.03-m.sink*9;m.group.scale.setScalar(Math.max(0,1-m.sink*1.7));if(m.sink>.55)m.group.visible=false;}
    }
    this.effects=this.effects.filter(effect=>{effect.life+=dt;effect.mesh.scale.setScalar(1+effect.life*3);effect.mesh.material.opacity=Math.max(0,1-effect.life*1.6);if(effect.life>.65){this.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();return false;}return true;});
    this.controls.update();this.renderer.render(this.scene,this.camera);
  }
}
