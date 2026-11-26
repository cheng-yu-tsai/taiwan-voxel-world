import * as THREE from 'three';
import { BLOCKS, CONFIG_VERSION, CONTROL_DEFAULTS, ISLANDS, WORLD_CONFIG } from './config.js';
import { terrainHeight } from './terrain.js';
import { ChunkBlockIndex } from './chunk-index.js';
import { validateWorldSave, MAX_WORLD_SAVE_BYTES } from './world-save.js';
import { islandAtPosition, isIslandPoint } from './island-geometry.js';
import { BlockEditHistory } from './block-edit-history.js';
import { canPlaceDecoration, decorationKey } from './world-objects.js';
import { createDecorationModel, disposeDecorationModel } from './decoration-models.js';
import { generateDefaultWorldContent } from './world-generation.js';
import {
  crosswalkBlockEntries,
  scooterBlockEntries,
  streetBenchBlockEntries,
  streetlampBlockEntries,
} from './street-props.js';
import { greenIslandTrailEntries, orchidIslandTrailEntries } from './island-trails.js';
import {
  greenIslandCoastalRockEntries,
  kinmenWindLionEntries,
  matsuCoastalOutcropEntries,
  matsuStoneTowerEntries,
  orchidIslandCoastalRockEntries,
  penghuBasaltColumnEntries,
  taiwanMountainLookoutEntries,
} from './island-landmarks.js';

const faces = [
  { n: [1,0,0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { n: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { n: [0,1,0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { n: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { n: [0,0,1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { n: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];
const shade = [0.76, 0.76, 1, 0.62, 0.88, 0.68];
const keyOf = (x,y,z) => `${x},${y},${z}`;
const parseKey = key => key.split(',').map(Number);

export class VoxelWorld {
  constructor(scene,onChange=()=>{}){
    this.scene=scene;
    this.onChange=onChange;
    this.blocks=new Map();
    this.decorations=new Map();
    this.decorationMeshes=new Map();
    this.chunks=new Map();
    this.chunkIndex=new ChunkBlockIndex(WORLD_CONFIG.chunkSize);
    this.topHeights=new Map();
    this.colorCache=new Map();
    this.saveTimer=0;
    this.editHistory=new BlockEditHistory(100);
    this.islandById=new Map(ISLANDS.map(island=>[island.id,island]));
    this.colorMaterial=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
    this.ocean=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshBasicMaterial({color:'#4faaa5'}));
    this.ocean.rotation.x=-Math.PI/2;
    this.ocean.position.y=WORLD_CONFIG.seaLevel;
    this.ocean.receiveShadow=true;
    this.scene.add(this.ocean);
  }

  async generate(){
    this.blocks.clear();
    this.decorations.clear();
    this.clearDecorationMeshes();
    this.editHistory.clear();
    generateDefaultWorldContent(this);
    this.restoreSave();
    this.reindexColumns();
    this.rebuildAll();
    this.notifyChange({count:this.blocks.size,saved:false});
  }

  generateIsland(island){
    const addShape=shape=>{
      let minX,maxX,minZ,maxZ;
      if(island.type==='polygon'){
        minX=Math.floor(Math.min(...island.shape.map(p=>p[0]))); maxX=Math.ceil(Math.max(...island.shape.map(p=>p[0])));
        minZ=Math.floor(Math.min(...island.shape.map(p=>p[1]))); maxZ=Math.ceil(Math.max(...island.shape.map(p=>p[1])));
      }else{
        minX=Math.floor(shape.x-shape.rx); maxX=Math.ceil(shape.x+shape.rx);
        minZ=Math.floor(shape.z-shape.rz); maxZ=Math.ceil(shape.z+shape.rz);
      }
      for(let x=minX;x<=maxX;x++) for(let z=minZ;z<=maxZ;z++){
        if(!this.isInside(island,x+.5,z+.5,shape)) continue;
        const height=this.terrainHeight(island,x+.5,z+.5);
        for(let y=0;y<height;y++){
          const top=y===height-1;
          const surface=top&&island.id==='penghu'?'stone':top?'grass':'soil';
          this.blocks.set(keyOf(x,y,z),surface);
        }
      }
    };
    if(island.type==='cluster') island.shape.forEach(addShape);
    else addShape(island.shape);
  }

  isInside(island,x,z,shape=island.shape){
    return isIslandPoint(island,x,z,island.type==='cluster'?shape:undefined);
  }

  getIslandAt(x,z){return islandAtPosition(ISLANDS,x,z);}

  terrainHeight(island,x,z){
    return terrainHeight(island,x,z);
  }

  seedTaiwanStreet(){
    // A compact, level building pad keeps the first play session friendly.
    for(let x=-7;x<=-2;x++) for(let z=-4;z<=5;z++){
      for(let y=1;y<32;y++) this.blocks.delete(keyOf(x,y,z));
      this.blocks.set(keyOf(x,1,z),(x===-5||x===-4)?'road':'concrete');
    }
    this.buildShop(-7,-2,2,3,'brick','roof','sign');
    this.buildShop(-3,2,2,3,'wood','roof','sign');
    for(const [key,type] of crosswalkBlockEntries(-5,1,-3)) this.blocks.set(key,type);
    for(const [key,type] of streetlampBlockEntries(-2,1,-3)) this.blocks.set(key,type);
    for(const [key,type] of scooterBlockEntries(-3,1,-1)) this.blocks.set(key,type);
    for(const [key,type] of streetBenchBlockEntries(-7,1,3)) this.blocks.set(key,type);
    // A small coast-side row of wave breakers makes the Taiwan shoreline legible.
    for(let z=-2;z<=2;z++){
      const x=-8;
      this.blocks.set(keyOf(x,1,z),'wave');
    }
  }

  seedIslandTrails(){
    const trails=[
      ['green',greenIslandTrailEntries()],
      ['orchid',orchidIslandTrailEntries()],
    ];
    for(const [islandId,entries] of trails){
      const island=this.islandById.get(islandId);
      for(const [key,type] of entries){
        const [x,y,z]=parseKey(key);
        const surfaceY=terrainHeight(island,x+.5,z+.5)-1;
        for(let above=y+1;above<=surfaceY;above++) this.blocks.delete(keyOf(x,above,z));
        this.blocks.set(key,type);
      }
    }
  }

  seedPenghuLandmark(){
    for(const [key,type] of penghuBasaltColumnEntries()) this.blocks.set(key,type);
  }

  seedTaiwanMountainLookout(){
    for(const [key,type] of taiwanMountainLookoutEntries()) this.blocks.set(key,type);
  }

  seedKinmenLandmark(){
    for(const [key,type] of kinmenWindLionEntries()) this.blocks.set(key,type);
  }

  seedMatsuLandmark(){
    for(const [key,type] of matsuStoneTowerEntries()) this.blocks.set(key,type);
  }

  seedMatsuCoastalOutcrop(){
    for(const [key,type] of matsuCoastalOutcropEntries()) this.blocks.set(key,type);
  }

  seedGreenIslandCoastalRocks(){
    for(const [key,type] of greenIslandCoastalRockEntries()) this.blocks.set(key,type);
  }

  seedOrchidIslandCoastalRocks(){
    for(const [key,type] of orchidIslandCoastalRockEntries()) this.blocks.set(key,type);
  }

  buildShop(x0,z0,width,depth,wall,roof,sign){
    const floorY=2, wallTop=4;
    for(let x=x0;x<x0+width;x++) for(let z=z0;z<z0+depth;z++){
      this.blocks.set(keyOf(x,floorY,z),'concrete');
      for(let y=floorY+1;y<=wallTop;y++){
        const edge=x===x0||x===x0+width-1||z===z0||z===z0+depth-1;
        if(edge) this.blocks.set(keyOf(x,y,z),wall);
      }
      this.blocks.set(keyOf(x,wallTop+1,z),roof);
    }
    // Bright signs face the street. Leave one doorway open in each facade.
    const doorX=x0+Math.floor(width/2);
    this.blocks.delete(keyOf(doorX,floorY+1,z0+depth-1));
    this.blocks.delete(keyOf(doorX,floorY+2,z0+depth-1));
    this.blocks.set(keyOf(x0+Math.floor(width/2),wallTop+1,z0+depth-1),sign);
  }

  restoreSave(){
    try{
      const raw=localStorage.getItem(WORLD_CONFIG.saveKey);
      if(!raw) return;
      const save=validateWorldSave(JSON.parse(raw));
      this.blocks=new Map(save.blocks);
      this.decorations=new Map(save.decorations.map(([key,type,rotation])=>[key,{type,rotation}]));
      this.renderDecorations();
    }catch(error){
      console.warn('Could not restore saved voxel world:',error);
      this.notifyChange({message:'讀取存檔失敗，已建立新世界'});
    }
  }

  reindexColumns(){
    this.topHeights.clear();
    this.chunkIndex.clear();
    for(const key of this.blocks.keys()){
      const [x,y,z]=parseKey(key), column=`${x},${z}`;
      if(!this.topHeights.has(column)||this.topHeights.get(column)<y) this.topHeights.set(column,y);
      this.chunkIndex.add(key);
    }
  }

  getGroundHeight(x,z){
    return this.topHeights.get(`${Math.floor(x)},${Math.floor(z)}`) ?? null;
  }

  notifyChange(info={}){this.onChange({decorationCount:this.decorations.size,...info,...this.editHistory.status});}

  getBlockCount(){return this.blocks.size;}
  getBlock(key){return this.blocks.get(key);}
  hasDecorationAt(x,y,z){return this.decorations.has(keyOf(x,y,z));}
  hasDecorationAboveBlock(key){
    const [x,y,z]=parseKey(key);
    return this.decorations.has(keyOf(x,y+1,z));
  }
  exportSave(){
    const decorations=[...this.decorations].map(([key,{type,rotation}])=>[key,type,rotation]);
    return validateWorldSave({version:CONFIG_VERSION,blocks:[...this.blocks],decorations});
  }
  importSave(save){
    const normalized=validateWorldSave(save);
    const raw=JSON.stringify(normalized);
    if(new TextEncoder().encode(raw).byteLength>MAX_WORLD_SAVE_BYTES)throw new RangeError('存檔超過 32 MB 上限');
    try{localStorage.setItem(WORLD_CONFIG.saveKey,raw);}
    catch(error){throw new Error('瀏覽器儲存空間不足，匯入未套用；目前世界仍保留', {cause:error});}
    clearTimeout(this.saveTimer);
    this.blocks=new Map(normalized.blocks);
    this.decorations=new Map(normalized.decorations.map(([key,type,rotation])=>[key,{type,rotation}]));
    this.editHistory.clear();
    this.reindexColumns();
    this.rebuildAll();
    this.renderDecorations();
    this.notifyChange({count:this.blocks.size,saved:true});
  }
  setBlock(x,y,z,type){
    const coords=[Math.floor(x),Math.floor(y),Math.floor(z)];
    const key=keyOf(...coords);
    if(this.blocks.has(key)||this.decorations.has(key)) return false;
    this.applyBlockChange(key,type);
    this.editHistory.record({key,before:null,after:type});
    this.notifyChange({count:this.blocks.size,saved:false});
    return true;
  }

  removeBlock(key){
    if(!this.blocks.has(key)) return null;
    const [x,y,z]=parseKey(key), type=this.blocks.get(key);
    if(this.decorations.has(keyOf(x,y+1,z))) return null;
    this.applyBlockChange(key,null);
    this.editHistory.record({key,before:type,after:null});
    this.notifyChange({count:this.blocks.size,saved:false});
    return {x,y,z,type};
  }

  applyBlockChange(key,type){
    const [x,y,z]=parseKey(key),column=`${x},${z}`;
    if(type===null){
      this.blocks.delete(key);
      this.chunkIndex.remove(key);
      if(this.topHeights.get(column)===y){
        let next=null;
        for(let check=y-1;check>=0;check--)if(this.blocks.has(keyOf(x,check,z))){next=check;break;}
        if(next===null)this.topHeights.delete(column);else this.topHeights.set(column,next);
      }
    }else{
      this.blocks.set(key,type);
      this.chunkIndex.add(key);
      if(!this.topHeights.has(column)||y>this.topHeights.get(column))this.topHeights.set(column,y);
    }
    this.rebuildAround(x,y,z);
    this.scheduleSave();
  }

  undo(){
    const edit=this.editHistory.undo();
    if(!edit)return false;
    if(edit.kind==='decoration')this.applyDecorationChange(edit.key,edit.before);
    else this.applyBlockChange(edit.key,edit.before);
    return true;
  }

  redo(){
    const edit=this.editHistory.redo();
    if(!edit)return false;
    if(edit.kind==='decoration')this.applyDecorationChange(edit.key,edit.after);
    else this.applyBlockChange(edit.key,edit.after);
    return true;
  }

  placeDecoration(x,y,z,type,rotation=0){
    let key;
    try{key=decorationKey(x,y,z);}catch{return false;}
    if(!canPlaceDecoration(this.blocks,this.decorations,key,type,rotation))return false;
    const decoration={type,rotation};
    this.applyDecorationChange(key,decoration);
    this.editHistory.record({kind:'decoration',key,before:null,after:decoration});
    this.notifyChange({count:this.blocks.size,saved:false});
    return true;
  }

  removeDecoration(key){
    const decoration=this.decorations.get(key);
    if(!decoration)return null;
    const [x,y,z]=parseKey(key);
    this.applyDecorationChange(key,null);
    this.editHistory.record({kind:'decoration',key,before:decoration,after:null});
    this.notifyChange({count:this.blocks.size,saved:false});
    return {x,y,z,...decoration};
  }

  applyDecorationChange(key,decoration){
    if(decoration===null)this.decorations.delete(key);
    else this.decorations.set(key,decoration);
    this.renderDecoration(key);
    this.scheduleSave();
  }

  renderDecoration(key){
    const previous=this.decorationMeshes.get(key);
    if(previous){this.scene.remove(previous);disposeDecorationModel(previous);this.decorationMeshes.delete(key);}
    const decoration=this.decorations.get(key);
    if(!decoration)return;
    const [x,y,z]=parseKey(key);
    const model=createDecorationModel(decoration,key);
    model.position.set(x+.5,y,z+.5);
    this.scene.add(model);
    this.decorationMeshes.set(key,model);
  }

  renderDecorations(){
    this.clearDecorationMeshes();
    for(const key of this.decorations.keys())this.renderDecoration(key);
  }

  clearDecorationMeshes(){
    for(const model of this.decorationMeshes.values()){
      this.scene.remove(model);
      disposeDecorationModel(model);
    }
    this.decorationMeshes.clear();
  }

  rebuildAround(x,y,z){
    const cx=Math.floor(x/WORLD_CONFIG.chunkSize), cz=Math.floor(z/WORLD_CONFIG.chunkSize);
    this.rebuildChunk(cx,cz);
    if(x%WORLD_CONFIG.chunkSize===0) this.rebuildChunk(cx-1,cz);
    if((x+1)%WORLD_CONFIG.chunkSize===0) this.rebuildChunk(cx+1,cz);
    if(z%WORLD_CONFIG.chunkSize===0) this.rebuildChunk(cx,cz-1);
    if((z+1)%WORLD_CONFIG.chunkSize===0) this.rebuildChunk(cx,cz+1);
  }

  rebuildAll(){
    for(const chunk of this.chunks.values()){this.scene.remove(chunk);chunk.geometry.dispose();}
    this.chunks.clear();
    for(const chunkKey of this.chunkIndex.chunkKeys()){
      const [cx,cz]=chunkKey.split(',').map(Number);this.rebuildChunk(cx,cz);
    }
  }

  rebuildChunk(cx,cz){
    const chunkKey=`${cx},${cz}`, previous=this.chunks.get(chunkKey);
    if(previous){this.scene.remove(previous);previous.geometry.dispose();this.chunks.delete(chunkKey);}
    const positions=[],normals=[],colors=[],indices=[],faceBlocks=[];
    const blockKeys=this.chunkIndex.get(chunkKey);
    if(!blockKeys?.size) return;
    for(const key of blockKeys){
      const [x,y,z]=parseKey(key);
      const type=this.blocks.get(key);
      const palette=BLOCKS.find(block=>block.id===type)||BLOCKS[1];
      const faceColors=this.getFaceColors(type,palette);
      for(let f=0;f<faces.length;f++){
        const face=faces[f], [nx,ny,nz]=face.n;
        if(this.blocks.has(keyOf(x+nx,y+ny,z+nz))) continue;
        const start=positions.length/3;
        for(const [vx,vy,vz] of face.corners){
          positions.push(x+vx,y+vy,z+vz);
          normals.push(nx,ny,nz);
          const color=faceColors[f];colors.push(color.r,color.g,color.b);
        }
        indices.push(start,start+1,start+2,start,start+2,start+3);
        faceBlocks.push(key);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    geometry.userData.faceBlocks=faceBlocks;
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,this.colorMaterial);
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.chunkKey=chunkKey;
    this.scene.add(mesh);this.chunks.set(chunkKey,mesh);
  }

  getFaceColors(type,palette){
    if(this.colorCache.has(type)) return this.colorCache.get(type);
    const base=new THREE.Color(palette.color), side=new THREE.Color(palette.sideColor||palette.color);
    const colorFaces=faces.map((face,index)=>{
      const color=index===2||index===3?base.clone():side.clone();
      return color.multiplyScalar(shade[index]);
    });
    this.colorCache.set(type,colorFaces);return colorFaces;
  }

  raycast(raycaster){
    const hits=raycaster.intersectObjects([...this.chunks.values()],false);
    const hit=hits[0];
    if(!hit||hit.distance>7) return null;
    const key=hit.object.geometry.userData.faceBlocks[Math.floor(hit.faceIndex/2)];
    if(!key) return null;
    return {key,distance:hit.distance,normal:hit.face.normal.clone(),point:hit.point,type:this.blocks.get(key)};
  }

  raycastDecoration(raycaster){
    const hits=raycaster.intersectObjects([...this.decorationMeshes.values()],true);
    const hit=hits[0];
    if(!hit||hit.distance>CONTROL_DEFAULTS.reach)return null;
    let object=hit.object;
    while(object&&!object.userData.decorationKey)object=object.parent;
    const key=object?.userData.decorationKey;
    const decoration=this.decorations.get(key);
    return decoration?{key,...decoration,distance:hit.distance}:null;
  }

  getSpawnPoint(islandId){
    const island=this.islandById.get(islandId)||ISLANDS[0];
    const start=island.spawn;
    const baseX=Math.floor(start.x),baseZ=Math.floor(start.z);
    for(let radius=0;radius<9;radius++){
      for(let dx=-radius;dx<=radius;dx++) for(let dz=-radius;dz<=radius;dz++){
        if(Math.abs(dx)!==radius&&Math.abs(dz)!==radius) continue;
        const x=baseX+dx,z=baseZ+dz;
        const y=this.getGroundHeight(x,z);
        if(y!==null) return {x:x+.5,y:y+1,z:z+.5,island};
      }
    }
    const y=this.getGroundHeight(baseX,baseZ)??1;
    return {x:baseX+.5,y:y+1,z:baseZ+.5,island};
  }

  scheduleSave(){
    clearTimeout(this.saveTimer);
    this.notifyChange({count:this.blocks.size,saved:false});
    this.saveTimer=setTimeout(()=>{
      try{
        localStorage.setItem(WORLD_CONFIG.saveKey,JSON.stringify(this.exportSave()));
        this.notifyChange({count:this.blocks.size,saved:true});
      }catch(error){
        console.warn('Could not save voxel world:',error);
        this.notifyChange({message:'儲存空間不足，請匯出或重設世界'});
      }
    },220);
  }

  reset(){
    clearTimeout(this.saveTimer);
    localStorage.removeItem(WORLD_CONFIG.saveKey);
    this.generate();
  }

  getMeshes(){return [...this.chunks.values()];}
}
