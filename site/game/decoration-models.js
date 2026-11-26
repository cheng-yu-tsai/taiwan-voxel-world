import * as THREE from 'three';
import { DECORATIONS } from './world-objects.js';

const soleBottomGeometry=new THREE.BoxGeometry(.24,.038,.48);
const soleTopGeometry=new THREE.BoxGeometry(.21,.012,.445);
const strapGeometry=new THREE.BoxGeometry(.018,.018,.22);
const toePostGeometry=new THREE.SphereGeometry(.014,8,6);
const soleBottomMaterial=new THREE.MeshLambertMaterial({color:'#245e7d'});
const soleTopMaterial=new THREE.MeshLambertMaterial({color:'#5b9cba'});
const strapMaterial=new THREE.MeshLambertMaterial({color:'#f5f0dc'});
const mergedMaterial=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});

function mergedGeometry(parts){
  const positions=[],normals=[],colors=[],indices=[];
  for(const {geometry,material,position,rotationY=0} of parts){
    const transform=new THREE.Matrix4().makeRotationY(rotationY);
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

export function createDecorationModel({type,rotation=0},key){
  if(!DECORATIONS.some(item=>item.id===type))throw new TypeError(`不支援的道具模型：${type}`);
  return createFlipFlops(key,rotation);
}

export function disposeDecorationModel(model){
  model.traverse(object=>object.geometry?.dispose());
}
