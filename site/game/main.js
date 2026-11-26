import * as THREE from 'three';
import { BLOCKS, CONTROL_DEFAULTS, ISLANDS, WORLD_CONFIG } from './config.js';
import { VoxelWorld } from './world.js';
import { FirstPersonPlayer } from './player.js';
import { GameUI } from './ui.js';

const canvas=document.querySelector('#world');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#9acdc9');
scene.fog=new THREE.Fog('#9acdc9',48,WORLD_CONFIG.viewDistance);

const camera=new THREE.PerspectiveCamera(73,window.innerWidth/window.innerHeight,.1,180);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.setSize(window.innerWidth,window.innerHeight,false);

scene.add(new THREE.HemisphereLight('#e9f2dc','#54775a',2.15));
const sunlight=new THREE.DirectionalLight('#ffe2a8',2.4);
sunlight.position.set(-28,48,20);sunlight.castShadow=true;
sunlight.shadow.mapSize.set(1024,1024);
sunlight.shadow.camera.left=-46;sunlight.shadow.camera.right=46;
sunlight.shadow.camera.top=52;sunlight.shadow.camera.bottom=-52;
sunlight.shadow.camera.near=.1;sunlight.shadow.camera.far=110;
sunlight.shadow.bias=-.00035;
scene.add(sunlight);

function makeCloud(x,y,z,scale){
  const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);
  const material=new THREE.MeshLambertMaterial({color:'#f2f3e8',transparent:true,opacity:.68});
  const sphere=new THREE.SphereGeometry(1,8,6);
  [[0,0,0,1.3],[1,0,.1,1],[-1,0,.05,.9],[.3,.42,.15,.92],[-.65,.35,0,.65]].forEach(([px,py,pz,r])=>{
    const puff=new THREE.Mesh(sphere,material);puff.position.set(px,py,pz);puff.scale.set(r*.8,r*.42,r*.5);group.add(puff);
  });
  group.userData.speed=.12+Math.random()*.08;scene.add(group);return group;
}
const clouds=[makeCloud(-22,20,-17,2.8),makeCloud(12,23,4,2.2),makeCloud(32,17,-8,2.5),makeCloud(-6,18,24,1.8)];

let world,player,quality='high',lastLocation='',selectedBlock=BLOCKS[0];
function editHistory(redo){
  const changed=redo?world?.redo():world?.undo();
  if(changed)ui.showToast(redo?'已重做上一步':'已復原上一步');
}
const ui=new GameUI({
  start:()=>player?.requestLock(),
  releasePointer:()=>player?.releaseLock(),
  selectBlock:block=>{selectedBlock=block;},
  travel:(island,transport)=>{
    if(!player)return;
    player.releaseLock();player.teleport(island);lastLocation=island.shortName;
    ui.updatePlayer(player.position,island);
    const prefix=transport==='boat'?'搭船':'搭飛機';
    ui.showToast(`${prefix}抵達${island.name}`);
  },
  setSensitivity:value=>player?.setSensitivity(value),
  getSensitivity:()=>player?.sensitivity??CONTROL_DEFAULTS.sensitivity,
  setQuality:value=>{quality=value;setQuality();},
  exportWorld:()=>world?.exportSave(),
  undo:()=>editHistory(false),
  redo:()=>editHistory(true),
  importWorld:save=>{
    world.importSave(save);
    player.teleport(ISLANDS[0]);
    player.position.set(WORLD_CONFIG.spawn.x,world.getSpawnPoint('main').y,WORLD_CONFIG.spawn.z);
    player.syncCamera();lastLocation=ISLANDS[0].shortName;
    ui.updatePlayer(player.position,ISLANDS[0]);
  },
  touchKey:(key,down)=>player?.setTouchKey(key,down),
  touchAction:action=>{
    if(action==='mine')interact(0);
    if(action==='place')interact(2);
    if(action==='undo')editHistory(false);
    if(action==='redo')editHistory(true);
  },
  reset:()=>{
    if(!world||!player)return;
    world.reset();player.teleport(ISLANDS[0]);player.position.set(WORLD_CONFIG.spawn.x,world.getSpawnPoint('main').y,WORLD_CONFIG.spawn.z);
    player.syncCamera();lastLocation=ISLANDS[0].shortName;
  },
});

function setQuality(){
  const scale=quality==='low'?0.75:quality==='balanced'?0.9:1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6)*scale);
  sunlight.castShadow=quality!=='low';
}

function resize(){
  camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight,false);setQuality();
}
window.addEventListener('resize',resize);

world=new VoxelWorld(scene,info=>ui.updateWorld(info));
await world.generate();
player=new FirstPersonPlayer(camera,canvas,world,ui);
player.setSensitivity(Number(document.querySelector('#sensitivity').value));
ui.updateWorld({count:world.getBlockCount(),saved:true});
ui.updatePlayer(player.position,player.currentIsland);
ui.hideLoading();

const raycaster=new THREE.Raycaster();
raycaster.far=CONTROL_DEFAULTS.reach;
const screenCenter=new THREE.Vector2(0,0);

function interact(button){
  if(!player||ui.isModalOpen())return;
  raycaster.setFromCamera(screenCenter,camera);
  const hit=world.raycast(raycaster);
  if(!hit)return;
  if(button===0){
    const removed=world.removeBlock(hit.key);
    if(removed)ui.showToast(`挖到${BLOCKS.find(block=>block.id===removed.type)?.name||'方塊'}`);
  }else if(button===2){
    const [x,y,z]=hit.key.split(',').map(Number),n=hit.normal;
    const bx=x+Math.round(n.x),by=y+Math.round(n.y),bz=z+Math.round(n.z);
    const overlapsPlayer=bx===Math.floor(player.position.x)&&bz===Math.floor(player.position.z)&&by>=Math.floor(player.position.y)&&by<=Math.floor(player.position.y+1.8);
    if(!overlapsPlayer&&world.setBlock(bx,by,bz,selectedBlock.id))ui.showToast(`放置${selectedBlock.name}`);
  }
}

document.addEventListener('mousedown',event=>{
  if(document.pointerLockElement!==canvas)return;
  if(event.button===0||event.button===2){event.preventDefault();interact(event.button);}
});

const clock=new THREE.Clock();
let hudClock=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();
  player?.update(dt);
  if(player){
    const target=world.raycast((()=>{raycaster.setFromCamera(screenCenter,camera);return raycaster;})());
    ui.setTarget(target);
    hudClock+=dt;
    if(hudClock>.22){ui.updatePlayer(player.position,player.currentIsland);hudClock=0;}
  }
  for(const cloud of clouds){cloud.position.x+=cloud.userData.speed*dt;if(cloud.position.x>48)cloud.position.x=-48;}
  renderer.render(scene,camera);
}
animate();
