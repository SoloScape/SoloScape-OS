import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hud = readFileSync(new URL('./MobileHud.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('./MobileHud.css', import.meta.url), 'utf8');
const assets = readFileSync(
  new URL('../cache/CacheGameUiAssets.ts', import.meta.url), 'utf8',
);

test('mobile game HUD contains no fabricated SVG or hand-drawn RuneScape icons', () => {
  assert.doesNotMatch(hud, /<svg|<path|<circle|<polygon|const ICONS\b/);
  assert.doesNotMatch(hud, /CACHE_SIDE_ICON|cachedIconUrls|applyCacheIcons/);
  assert.doesNotMatch(hud, /HOTKEY_PROFILES|renderHotkeys|game chat awaiting server messages/i);
});

test('cache-only HUD never invents a minimap terrain palette or UI chrome', () => {
  assert.doesNotMatch(hud, /underlayIds\[|overlayIds\[|ctx\.fillStyle|\.fillRect\(/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|drop-shadow/i);
  const decorativeShadows = css.split('\n').filter((line) =>
    /^\s*box-shadow\s*:/.test(line) && !/:\s*none\s*;/.test(line));
  assert.deepEqual(decorativeShadows, []);
  assert.doesNotMatch(css, /\.hud-orb svg|\.hud-stone svg|cache-hud-icon/);
});

test('cache graphic loader does not use guessed sideicon frame indices', () => {
  assert.doesNotMatch(assets, /sideIcons|CACHE_SIDE_ICON|indexToTab/);
  // A verified cache group name such as 'compass' is not a guessed index.
  assert.match(assets, /resolveNamedGroup\(js5, GAME_SPRITE_ARCHIVE, \[name\]\)/);
  assert.match(assets, /downloadGroup\(GAME_SPRITE_ARCHIVE, candidate.groupId\)/);
});
