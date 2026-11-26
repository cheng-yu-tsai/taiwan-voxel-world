import * as THREE from 'three';
import { DECORATIONS } from './world-objects.js';

const soleBottomGeometry=new THREE.BoxGeometry(.24,.038,.48);
const soleTopGeometry=new THREE.BoxGeometry(.21,.012,.445);
const strapGeometry=new THREE.BoxGeometry(.018,.018,.22);
const toePostGeometry=new THREE.SphereGeometry(.014,8,6);
const batBarrelGeometry=new THREE.CylinderGeometry(.062,.03,.52,10);
const batHandleGeometry=new THREE.CylinderGeometry(.024,.021,.18,8);
const batGripGeometry=new THREE.CylinderGeometry(.026,.024,.105,8);
const batBandGeometry=new THREE.CylinderGeometry(.032,.032,.012,8);
const batKnobGeometry=new THREE.CylinderGeometry(.032,.025,.03,8);
const pistolBodyGeometry=new THREE.BoxGeometry(.33,.13,.28);
const pistolSlideGeometry=new THREE.BoxGeometry(.25,.045,.27);
const pistolBarrelGeometry=new THREE.CylinderGeometry(.047,.047,.09,8);
const pistolGripGeometry=new THREE.BoxGeometry(.13,.22,.13);
const pistolGripPanelGeometry=new THREE.BoxGeometry(.138,.11,.018);
const breakwaterCoreGeometry=new THREE.DodecahedronGeometry(.075,0);
const breakwaterArmGeometry=new THREE.CylinderGeometry(.045,.068,.28,6);
const mascotBodyGeometry=new THREE.BoxGeometry(.085,.12,.055);
const mascotHeadGeometry=new THREE.SphereGeometry(.042,8,6);
const mascotHatGeometry=new THREE.SphereGeometry(.05,8,4,0,Math.PI*2,0,Math.PI/2);
const mascotArmGeometry=new THREE.BoxGeometry(.024,.105,.03);
const mascotLegGeometry=new THREE.BoxGeometry(.03,.095,.035);
const soleBottomMaterial=new THREE.MeshLambertMaterial({color:'#245e7d'});
const soleTopMaterial=new THREE.MeshLambertMaterial({color:'#5b9cba'});
const strapMaterial=new THREE.MeshLambertMaterial({color:'#f5f0dc'});
const batMaterial=new THREE.MeshLambertMaterial({color:'#bd7d43'});
const batGripMaterial=new THREE.MeshLambertMaterial({color:'#47372e'});
const batGripAccentMaterial=new THREE.MeshLambertMaterial({color:'#ece4d0'});
const pistolBodyMaterial=new THREE.MeshLambertMaterial({color:'#28a9bd'});
const pistolSlideMaterial=new THREE.MeshLambertMaterial({color:'#f3cf58'});
const pistolMuzzleMaterial=new THREE.MeshLambertMaterial({color:'#fa7e42'});
const pistolGripMaterial=new THREE.MeshLambertMaterial({color:'#e45f65'});
const pistolGripPanelMaterial=new THREE.MeshLambertMaterial({color:'#ffe8a0'});
const breakwaterMaterial=new THREE.MeshLambertMaterial({color:'#89938e'});
const mascotBodyMaterial=new THREE.MeshLambertMaterial({color:'#50a6a0'});
const mascotHeadMaterial=new THREE.MeshLambertMaterial({color:'#f1d4a1'});
const mascotHatMaterial=new THREE.MeshLambertMaterial({color:'#f0ae50'});
const mascotLegMaterial=new THREE.MeshLambertMaterial({color:'#425b5d'});
const mergedMaterial=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});

function mergedGeometry(parts){
  const positions=[],normals=[],colors=[],indices=[];
  for(const {geometry,material,position,rotationX=0,rotationY=0,rotationZ=0,scale=1} of parts){
    const transform=new THREE.Matrix4().makeRotationY(rotationY);
    if(rotationX)transform.multiply(new THREE.Matrix4().makeRotationX(rotationX));
    if(rotationZ)transform.multiply(new THREE.Matrix4().makeRotationZ(rotationZ));
    if(scale!==1)transform.scale(new THREE.Vector3(scale,scale,scale));
    transform.setPosition(...position);
    const positionAttribute=geometry.getAttribute('position');
    const normalAttribute=geometry.getAttribute('normal');
    const color=material.color;
    const offset=positions.length/3;
    for(let index=0;index<positionAttribute.count;index++){
      const vertex=new THREE.Vector3().fromBufferAttribute(positionAttribute,index).applyMatrix4(transform);
      const normal=new THREE.Vector3().fromBufferAttribute(normalAttribute,index).transformDirection(transform);
      positions.push(vertex.x,vertex.y,vertex.z);
      normals.push(normal.x,normal.y,normal.z);
      colors.push(color.r,color.g,color.b);
    }
    const sourceIndices=geometry.getIndex();
    if(sourceIndices){
      for(const index of sourceIndices.array)indices.push(offset+index);
    }else{
      for(let index=0;index<positionAttribute.count;index++)indices.push(offset+index);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function createFlipFlops(key,rotation){
  const parts=[];
  for(const centerX of [-.15,.15]){
    parts.push(
      {geometry:soleBottomGeometry,material:soleBottomMaterial,position:[centerX,.023,0]},
      {geometry:soleTopGeometry,material:soleTopMaterial,position:[centerX,.048,0]},
      {geometry:strapGeometry,material:strapMaterial,position:[centerX-.044,.066,.085],rotationY:-.52},
      {geometry:strapGeometry,material:strapMaterial,position:[centerX+.044,.066,.085],rotationY:.52},
      {geometry:toePostGeometry,material:strapMaterial,position:[centerX,.066,.185]},
    );
  }
  const group=new THREE.Group();
  group.rotation.y=rotation*Math.PI/2;
  group.userData.decorationKey=key;
  const model=new THREE.Mesh(mergedGeometry(parts),mergedMaterial);
  model.castShadow=true;
  model.receiveShadow=true;
  model.userData.decorationKey=key;
  group.add(model);
  return group;
}

function createBaseballBat(key,rotation){
  const parts=[
    {geometry:batBarrelGeometry,material:batMaterial,position:[0,.064,0],rotationX:Math.PI/2},
    {geometry:batHandleGeometry,material:batMaterial,position:[0,.064,-.34],rotationX:Math.PI/2},
    {geometry:batGripGeometry,material:batGripMaterial,position:[0,.064,-.375],rotationX:Math.PI/2},
    {geometry:batBandGeometry,material:batGripAccentMaterial,position:[0,.064,-.26],rotationX:Math.PI/2},
    {geometry:batKnobGeometry,material:batMaterial,position:[0,.064,-.46],rotationX:Math.PI/2},
  ];
  const group=new THREE.Group();
  group.rotation.y=rotation*Math.PI/2;
  group.userData.decorationKey=key;
  const model=new THREE.Mesh(mergedGeometry(parts),mergedMaterial);
  model.castShadow=true;
  model.receiveShadow=true;
  model.userData.decorationKey=key;
  group.add(model);
  return group;
}

function createToyPistol(key,rotation){
  const parts=[
    {geometry:pistolBodyGeometry,material:pistolBodyMaterial,position:[0,.12,.055]},
    {geometry:pistolSlideGeometry,material:pistolSlideMaterial,position:[0,.207,.06]},
    {geometry:pistolBarrelGeometry,material:pistolMuzzleMaterial,position:[0,.145,.245],rotationX:Math.PI/2},
    {geometry:pistolGripGeometry,material:pistolGripMaterial,position:[0,.11,-.035],rotationX:-.16},
    {geometry:pistolGripPanelGeometry,material:pistolGripPanelMaterial,position:[0,.11,-.102],rotationX:-.16},
  ];
  const group=new THREE.Group();
  group.rotation.y=rotation*Math.PI/2;
  group.userData.decorationKey=key;
  const model=new THREE.Mesh(mergedGeometry(parts),mergedMaterial);
  model.castShadow=true;
  model.receiveShadow=true;
  model.userData.decorationKey=key;
  group.add(model);
  return group;
}

function addBreakwater(parts,x,z,scale){
  parts.push(
    {geometry:breakwaterCoreGeometry,material:breakwaterMaterial,position:[x,.085*scale,z],scale},
    {geometry:breakwaterArmGeometry,material:breakwaterMaterial,position:[x,.22*scale,z],scale},
    {geometry:breakwaterArmGeometry,material:breakwaterMaterial,position:[x+.095*scale,.085*scale,z],rotationY:Math.PI/2,scale},
    {geometry:breakwaterArmGeometry,material:breakwaterMaterial,position:[x-.095*scale,.085*scale,z],rotationY:-Math.PI/2,scale},
    {geometry:breakwaterArmGeometry,material:breakwaterMaterial,position:[x,.085*scale,z+.095*scale],rotationX:Math.PI/2,scale},
  );
}

function createBreakwaterDiorama(key,rotation){
  const parts=[];
  addBreakwater(parts,-.29,.18,.66);
  addBreakwater(parts,.29,.18,.66);
  addBreakwater(parts,0,-.31,.66);
  parts.push(
    {geometry:mascotLegGeometry,material:mascotLegMaterial,position:[-.022,.047,-.055]},
    {geometry:mascotLegGeometry,material:mascotLegMaterial,position:[.022,.047,-.055]},
    {geometry:mascotBodyGeometry,material:mascotBodyMaterial,position:[0,.145,-.055]},
    {geometry:mascotHeadGeometry,material:mascotHeadMaterial,position:[0,.237,-.055]},
    {geometry:mascotHatGeometry,material:mascotHatMaterial,position:[0,.267,-.055]},
    {geometry:mascotArmGeometry,material:mascotBodyMaterial,position:[-.055,.15,-.055],rotationZ:.22},
    {geometry:mascotArmGeometry,material:mascotBodyMaterial,position:[.055,.15,-.055],rotationZ:-.22},
  );
  const group=new THREE.Group();
  group.rotation.y=rotation*Math.PI/2;
  group.userData.decorationKey=key;
  const model=new THREE.Mesh(mergedGeometry(parts),mergedMaterial);
  model.castShadow=true;
  model.receiveShadow=true;
  model.userData.decorationKey=key;
  group.add(model);
  return group;
}

export function createDecorationModel({type,rotation=0},key){
  if(!DECORATIONS.some(item=>item.id===type))throw new TypeError(`不支援的道具模型：${type}`);
  if(type==='flip-flops')return createFlipFlops(key,rotation);
  if(type==='baseball-bat')return createBaseballBat(key,rotation);
  if(type==='toy-pistol')return createToyPistol(key,rotation);
  if(type==='breakwater-diorama')return createBreakwaterDiorama(key,rotation);
  throw new TypeError(`不支援的道具模型：${type}`);
}

export function disposeDecorationModel(model){
  model.traverse(object=>object.geometry?.dispose());
}
