import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gameCss = readFileSync(new URL('../site/game/game.css', import.meta.url), 'utf8');
const shortLandscapeMedia = gameCss.match(
  /@media\s*\(pointer:\s*coarse\)\s*and\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*560px\)\s*\{([\s\S]*?)\n\}/,
);
const coarsePointerMedia = gameCss.match(/@media\s*\(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/);

function declarationsFor(selector, styleGroup = shortLandscapeMedia) {
  assert.ok(styleGroup, 'the requested responsive touch style should be defined');
  const rules = [...styleGroup[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const rule = rules.find(([, selectors]) => selectors.split(',').some(item => item.trim() === selector));
  assert.ok(rule, `${selector} should have a short landscape rule`);
  return Object.fromEntries(rule[2].split(';').map(declaration => {
    const [property, ...value] = declaration.split(':');
    return [property.trim(), value.join(':').trim()];
  }).filter(([property]) => property));
}

test('short landscape touch controls clear the viewport header and hotbar', () => {
  const movement = declarationsFor('.touch-pad.touch-controls');
  const actions = declarationsFor('.touch-actions.touch-controls');
  const hotbar = declarationsFor('.bottom-hud');

  assert.equal(movement.bottom, 'max(90px,calc(env(safe-area-inset-bottom, 0px) + 82px))');
  assert.equal(actions.bottom, movement.bottom);
  assert.equal(actions['grid-template-columns'], 'repeat(2, 46px)');
  assert.equal(hotbar.bottom, 'max(8px,env(safe-area-inset-bottom, 0px))');
});

test('short landscape gameplay hides secondary panels but keeps 46 pixel touch targets', () => {
  const panel = declarationsFor('.left-panel');
  const hint = declarationsFor('.action-hint');
  const buttons = declarationsFor('.touch-pad>button', coarsePointerMedia);

  assert.equal(panel.display, 'none');
  assert.equal(hint.display, 'none');
  assert.equal(buttons['min-inline-size'], '46px');
  assert.equal(buttons['min-block-size'], '46px');
});
