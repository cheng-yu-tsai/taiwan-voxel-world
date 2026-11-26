import * as THREE from 'three';
import { BLOCKS, CONTROL_DEFAULTS, WORLD_CONFIG } from './config.js';
import { blockForHotkey } from './hotbar.js';

export class FirstPersonPlayer {
  constructor(camera,canvas,world,ui){
    this.camera=camera;this.canvas=canvas;this.world=world;this.ui=ui;
    const spawn=world.getSpawnPoint(WORLD_CONFIG.spawn.islandId);
    this.position=new THREE.Vector3(spawn.x,spawn.y,spawn.z);
    this.currentIsland=spawn.island;
    this.velocityY=0;this.onGround=true;this.pitch=-.12;this.yaw=-Math.PI/2;
    this.keys=new Set();this.sensitivity=CONTROL_DEFAULTS.sensitivity;
    this.speed=CONTROL_DEFAULTS.movementSpeed;this.jump=CONTROL_DEFAULTS.jumpVelocity;
    this.gravity=CONTROL_DEFAULTS.gravity;this.sprint=CONTROL_DEFAULTS.sprintMultiplier;
    this.lastTouch=null;this.lookPointerId=null;
    this.camera.rotation.order='YXZ';
    this.bindEvents();this.syncCamera();
  }

  bindEvents(){
    document.addEventListener('pointerlockchange',()=>{
      const locked=document.pointerLockElement===this.canvas;
      document.getElementById('game').classList.toggle('locked',locked);
      if(!locked)this.keys.clear();
    });
    document.addEventListener('mousemove',event=>{
      if(document.pointerLockElement!==this.canvas)return;
      this.yaw-=event.movementX*this.sensitivity;
      this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch-event.movementY*this.sensitivity));
    });
    document.addEventListener('keydown',event=>this.keyDown(event));
    document.addEventListener('keyup',event=>this.keys.delete(event.code));
    window.addEventListener('blur',()=>this.keys.clear());
    this.canvas.addEventListener('contextmenu',event=>event.preventDefault());
    this.canvas.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'){
        this.lookPointerId=event.pointerId;this.lastTouch={x:event.clientX,y:event.clientY};
        return;
      }
      if(!this.ui.isModalOpen()&&document.pointerLockElement!==this.canvas)this.requestLock();
    });
    this.canvas.addEventListener('pointermove',event=>{
      if(event.pointerType!=='touch'||this.lookPointerId!==event.pointerId||!this.lastTouch)return;
      const dx=event.clientX-this.lastTouch.x,dy=event.clientY-this.lastTouch.y;
      this.lastTouch={x:event.clientX,y:event.clientY};
      this.yaw-=dx*this.sensitivity*1.7;this.pitch=Math.max(-1.35,Math.min(1.35,this.pitch-dy*this.sensitivity*1.7));
    });
    const releaseTouch=event=>{if(this.lookPointerId===event.pointerId){this.lookPointerId=null;this.lastTouch=null;}};
    this.canvas.addEventListener('pointerup',releaseTouch);this.canvas.addEventListener('pointercancel',releaseTouch);
  }

  keyDown(event){
    if(event.code==='Escape'){
      if(this.ui.closeTopModal())event.preventDefault();
      return;
    }
    if(this.ui.isModalOpen())return;
    if(event.code==='KeyM'){
      event.preventDefault();this.ui.openTravel();return;
    }
    if(event.code==='KeyH'){
      this.ui.openModal('help-modal');return;
    }
    const block=blockForHotkey(event.key,BLOCKS);
    if(block){this.ui.selectBlock(block.id);return;}
    if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight'].includes(event.code)){
      event.preventDefault();this.keys.add(event.code);
    }
  }

  requestLock(){
    if(this.ui.isModalOpen())return;
    try{
      const result=this.canvas.requestPointerLock();
      if(result?.catch)result.catch(()=>this.ui.showToast('瀏覽器沒有開啟滑鼠視角，仍可使用觸控操作'));
    }catch{this.ui.showToast('瀏覽器沒有開啟滑鼠視角');}
  }

  releaseLock(){if(document.pointerLockElement===this.canvas)document.exitPointerLock();}
  setSensitivity(value){this.sensitivity=value;}
  setTouchKey(code,down){if(down)this.keys.add(code);else this.keys.delete(code);}

  update(delta){
    const dt=Math.min(delta,.045);
    const forward=Number(this.keys.has('KeyW'))-Number(this.keys.has('KeyS'));
    const strafe=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA'));
    if(forward||strafe){
      const magnitude=Math.hypot(forward,strafe), multiplier=(this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'))?this.sprint:1;
      const fx=-Math.sin(this.yaw),fz=-Math.cos(this.yaw),rx=Math.cos(this.yaw),rz=-Math.sin(this.yaw);
      const dx=(fx*forward+rx*strafe)/magnitude*this.speed*multiplier*dt;
      const dz=(fz*forward+rz*strafe)/magnitude*this.speed*multiplier*dt;
      this.tryMove(dx,dz);
    }
    const island=this.world.getIslandAt(this.position.x,this.position.z);
    if(island)this.currentIsland=island;
    const currentGround=this.world.getGroundHeight(this.position.x,this.position.z);
    const floor=currentGround===null?WORLD_CONFIG.seaLevel+.34:currentGround+1;
    if(this.keys.has('Space')&&this.onGround){this.velocityY=this.jump;this.onGround=false;this.keys.delete('Space');}
    if(!this.onGround){
      this.velocityY-=this.gravity*dt;this.position.y+=this.velocityY*dt;
      if(this.position.y<=floor){this.position.y=floor;this.velocityY=0;this.onGround=true;}
    }else{
      const deltaToFloor=floor-this.position.y;
      if(deltaToFloor<-.08){this.onGround=false;this.velocityY=0;}
      else if(deltaToFloor>0)this.position.y=floor;
    }
    this.syncCamera();
  }

  tryMove(dx,dz){
    const currentGround=this.world.getGroundHeight(this.position.x,this.position.z);
    const currentFloor=currentGround===null?WORLD_CONFIG.seaLevel+.34:currentGround+1;
    const canStep=(x,z)=>{
      const ground=this.world.getGroundHeight(x,z);
      if(ground===null)return true;
      const nextFloor=ground+1;
      return this.position.y-currentFloor>.2||nextFloor-currentFloor<=1.05;
    };
    if(canStep(this.position.x+dx,this.position.z))this.position.x+=dx;
    if(canStep(this.position.x,this.position.z+dz))this.position.z+=dz;
  }

  syncCamera(){
    this.camera.position.set(this.position.x,this.position.y+1.52,this.position.z);
    this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  }

  teleport(island){
    const spawn=this.world.getSpawnPoint(island.id);
    this.position.set(spawn.x,spawn.y,spawn.z);this.currentIsland=spawn.island;
    this.velocityY=0;this.onGround=true;this.yaw=island.id==='main'?-Math.PI/2:Math.PI*.18;
    this.pitch=-.12;this.syncCamera();
  }
}
