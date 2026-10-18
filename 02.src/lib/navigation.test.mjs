import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function navigation() {
  const exports = {};
  const source = readFileSync(new URL('./navigation.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { exports, Math, Number, Array, Set, Map, Infinity });
  return exports;
}

test('navigation rejects invalid points and produces obstacle-free feeding paths', () => {
  const { isFree, findPath, clearSegment, FEED_SPOT } = navigation();
  assert.equal(isFree({ x: 100, z: 0 }), false);
  assert.equal(isFree({ x: NaN, z: 0 }), false);
  const route = findPath({ x: 0, z: 0 }, FEED_SPOT);
  assert.ok(route.length);
  let previous = { x: 0, z: 0 };
  for (const point of route) {
    assert.ok(clearSegment(previous, point));
    previous = point;
  }
});

test('cat reaches the feeding point and rejects unreachable goals', () => {
  const { WanderController, FEED_SPOT } = navigation();
  const controller = new WanderController(() => 0.5);
  assert.ok(controller.request(FEED_SPOT, 'feed'));
  let arrived = false;
  for (let i = 0; i < 2400 && !arrived; i++) arrived = controller.update(1 / 60).arrived;
  assert.ok(arrived);
  assert.ok(Math.hypot(controller.position.x - FEED_SPOT.x, controller.position.z - FEED_SPOT.z) < 0.12);
  assert.equal(controller.request({ x: 100, z: 100 }), false);
});
