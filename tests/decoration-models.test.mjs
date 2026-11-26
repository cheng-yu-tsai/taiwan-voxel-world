import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createDecorationModel, disposeDecorationModel } from '../site/game/decoration-models.js';
import { DECORATIONS } from '../site/game/world-objects.js';

test('keeps the breakwater diorama grounded and within one cell in all four orientations', () => {
  for (let rotation = 0; rotation < 4; rotation++) {
    const model = createDecorationModel({ type: 'breakwater-diorama', rotation }, `breakwater-${rotation}`);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);

    assert.ok(bounds.min.y >= -0.001, `rotation ${rotation * 90}° dips below the supporting surface: ${bounds.min.y}`);
    assert.ok(bounds.max.y <= 0.35, `rotation ${rotation * 90}° is too tall: ${bounds.max.y}`);
    assert.ok(bounds.max.x - bounds.min.x <= 1, `rotation ${rotation * 90}° exceeds one cell on X`);
    assert.ok(bounds.max.z - bounds.min.z <= 1, `rotation ${rotation * 90}° exceeds one cell on Z`);

    disposeDecorationModel(model);
  }
});

test('keeps every decoration model inside its anchor cell through four rotations', () => {
  for (const { id } of DECORATIONS) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const model = createDecorationModel({ type: id, rotation }, `${id}-${rotation}`);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);

      assert.ok(bounds.min.x >= -0.5 && bounds.max.x <= 0.5, `${id} exceeds its anchor cell on X at ${rotation * 90}°`);
      assert.ok(bounds.min.z >= -0.5 && bounds.max.z <= 0.5, `${id} exceeds its anchor cell on Z at ${rotation * 90}°`);
      assert.ok(bounds.min.y >= -0.02 && bounds.max.y <= 0.35, `${id} exceeds its supported height at ${rotation * 90}°`);

      disposeDecorationModel(model);
    }
  }
});

test('rejects model requests for unknown decoration types', () => {
  assert.throws(() => createDecorationModel({ type: 'unknown' }, 'invalid'), /不支援的道具模型/);
});
