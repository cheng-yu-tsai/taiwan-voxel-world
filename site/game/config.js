// Content knobs live here so islands, block palettes, and movement feel can be
// changed without rewriting the renderer or interface.
export const WORLD_CONFIG = {
  saveKey: 'island-blocks-world-v1',
  chunkSize: 16,
  seaLevel: 0.15,
  viewDistance: 105,
  spawn: { x: -5.5, z: 0.5, islandId: 'main' },
};

export const BLOCKS = [
  { id: 'grass', name: '草地', color: '#75a85b', sideColor: '#67864b', swatch: '#75a85b' },
  { id: 'stone', name: '石磚', color: '#9daca1', sideColor: '#7b8980', swatch: '#9daca1' },
  { id: 'brick', name: '紅磚', color: '#c46b4a', sideColor: '#9d543d', swatch: '#c46b4a' },
  { id: 'road', name: '柏油', color: '#59686a', sideColor: '#414f51', swatch: '#59686a' },
  { id: 'wood', name: '木材', color: '#b98952', sideColor: '#8c663e', swatch: '#b98952' },
  { id: 'wave', name: '消波塊', color: '#9aa7a1', sideColor: '#78847f', swatch: '#9aa7a1' },
  { id: 'soil', name: '泥土', color: '#92714f', sideColor: '#74573c', swatch: '#92714f' },
  { id: 'roof', name: '紅瓦', color: '#9e4d3d', sideColor: '#783a33', swatch: '#9e4d3d' },
  { id: 'concrete', name: '水泥', color: '#d1c8ae', sideColor: '#a99f89', swatch: '#d1c8ae' },
  { id: 'sign', name: '招牌', color: '#f0bf62', sideColor: '#cf874a', swatch: '#f0bf62' },
];

// Polygon coordinates use [x, z]. Ellipse entries can be duplicated to form
// small island chains such as Penghu and Matsu.
export const ISLANDS = [
  {
    id: 'main', name: '台灣本島', shortName: '台中海岸', emoji: '🏙️',
    note: '山脈、街角與海岸線', type: 'polygon', spawn: { x: -5.5, z: 0.5 },
    shape: [[-1,-24],[2,-23],[4,-20],[5,-17],[7,-14],[6,-11],[5,-8],[7,-4],[7,0],[8,4],[7,8],[6,12],[5,16],[3,19],[2,22],[-1,24],[-4,22],[-6,19],[-7,15],[-7,11],[-8,7],[-7,3],[-7,-2],[-6,-7],[-7,-11],[-5,-16],[-4,-20],[-2,-23]],
  },
  {
    id: 'penghu', name: '澎湖群島', shortName: '澎湖', emoji: '🪨',
    note: '散落海面的玄武岩小島', type: 'cluster', spawn: { x: -20, z: 1 },
    shape: [{x:-20,z:1,rx:2.7,rz:3.6},{x:-23,z:-1,rx:1.3,rz:1.7},{x:-17,z:4,rx:1.2,rz:1.5},{x:-22,z:5,rx:1.3,rz:1.3}],
  },
  {
    id: 'kinmen', name: '金門', shortName: '金門', emoji: '🏝️',
    note: '島嶼聚落與海風', type: 'ellipse', spawn: { x: -32, z: 13 },
    shape: {x:-32,z:13,rx:3.7,rz:4.4},
  },
  {
    id: 'matsu', name: '馬祖', shortName: '馬祖', emoji: '🌫️',
    note: '北方海上的島嶼聚落', type: 'cluster', spawn: { x: 10, z: -29 },
    shape: [{x:10,z:-29,rx:2.1,rz:2.6},{x:13,z:-31,rx:1.7,rz:2.0},{x:8,z:-33,rx:1.2,rz:1.6}],
  },
  {
    id: 'green', name: '綠島', shortName: '綠島', emoji: '🐢',
    note: '海蝕地形與環島小路', type: 'ellipse', spawn: { x: 17, z: -3 },
    shape: {x:17,z:-3,rx:2.2,rz:3.6},
  },
  {
    id: 'orchid', name: '蘭嶼', shortName: '蘭嶼', emoji: '🌺',
    note: '海洋、山林與島嶼文化', type: 'ellipse', spawn: { x: 23, z: 7 },
    shape: {x:23,z:7,rx:2.5,rz:3.7},
  },
];

export const CONTROL_DEFAULTS = {
  sensitivity: 0.0024,
  movementSpeed: 5.2,
  sprintMultiplier: 1.55,
  jumpVelocity: 6.2,
  gravity: 18,
  reach: 7,
};

export const CONFIG_VERSION = 2;
