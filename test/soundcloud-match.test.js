// The web build stands in SoundCloud uploads for tracks it cannot stream from
// YouTube. It must pick the original recording or nothing: never a cover,
// remix, sped-up edit, mashup or the 30s official preview. Fixtures are real
// SoundCloud search results (trimmed).
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

process.env.MOODEX_DATA_DIR = process.env.MOODEX_DATA_DIR || path.join(os.tmpdir(), 'moodex-test-sc-match');
const { rankSoundCloudSearchHits, rankSoundCloudFallbackHits, scCoreTitle, scMainArtist } = require('../src/server/server');

const hit = (id, title, user, seconds, policy = 'ALLOW') => ({ id, title, user: { username: user }, duration: seconds * 1000, policy });

function pick(title, artist, expectedSec, pool) {
  const info = { core: scCoreTitle(title, artist), mainArtist: scMainArtist(artist), expectedSec, query: `${title} ${artist} - ${title}` };
  return rankSoundCloudSearchHits(pool, info);
}

test('core title strips artist, brackets, feat. and video tags', () => {
  assert.strictEqual(scCoreTitle('Get Lucky (feat. Pharrell Williams and Nile Rodgers)', 'Daft Punk'), 'get lucky');
  assert.strictEqual(scCoreTitle('Daft Punk - Get Lucky (Official Audio) ft. Pharrell Williams', 'Daft Punk'), 'get lucky');
  assert.strictEqual(scMainArtist('Muthuja Sanahas & DILU Beats'), 'muthuja sanahas');
});

test('finds the full-length original re-upload, skipping the preview and remixes', () => {
  const ranked = pick('Dannawada Mawa', 'Muthuja Sanahas & DILU Beats', 215, [
    hit(1, 'Dannawada Mawa', 'Muthuja Sanahas', 30, 'SNIP'),
    hit(2, 'Dannawada Mawa (Remix)', 'Sheyy Beatz', 230),
    hit(3, 'Dannawada Mawa', 'Chatha:)', 213),
    hit(4, 'dannawada-mawa-muthuja-sanahas', 'Isuru Laksha', 213),
    hit(5, 'Dannawda Mawa Muthuja Ft Dilu Beats | Ruwan Jay Remix', 'RUWAN JAY REMIX', 256)
  ]);
  assert.deepStrictEqual(ranked.map((t) => t.id).sort(), [3, 4]);
  assert.strictEqual(ranked[0].id, 4, 'an upload naming the artist ranks first');
});

test('refuses covers, edits, mashups and medleys when no original exists', () => {
  assert.deepStrictEqual(pick('Adare Piyapath', 'Muthuja Sanahas & Santhur', 162, [
    hit(1, 'Adare Piyapath (Slowed & Reverb) - Muthuja Sanahas.mp3', 'Thash', 162),
    hit(2, 'Adare Piyapath', 'Muthuja Sanahas', 30, 'SNIP')
  ]), []);
  assert.deepStrictEqual(pick('Blinding Lights', 'The Weeknd', 200, [
    hit(1, 'The Weeknd - Blinding Lights | Cover by Sapphire', 'SAPPHIRE', 200),
    hit(2, 'blinding lights x big poppa', 'kanye south', 206),
    hit(3, 'Blinding Lights - The Weeknd (SPARKZ Remix)', 'SPARKZ', 204),
    hit(4, 'The Weeknd - Blinding Lights full', 'Minh Prime', 762)
  ]), []);
  assert.deepStrictEqual(pick('Shape of You', 'Ed Sheeran', 234, [
    hit(1, 'Ed Sheeran & Sia - Shape of You / The Greatest / Cheap Thrills', 'Antwan Atef', 236),
    hit(2, 'Shape Of You - Ed Sheeran (cover)', 'Taddee', 235)
  ]), []);
});

test('a different length is a different recording', () => {
  assert.deepStrictEqual(pick('Hello', 'Adele', 296, [hit(1, 'Hello', 'someone', 250)]), []);
  assert.strictEqual(pick('Hello', 'Adele', 296, [hit(1, 'Hello - Adele', 'someone', 301)]).length, 1);
});

test('without a known length, only an upload naming the artist counts', () => {
  assert.deepStrictEqual(pick('Nura Ananthe', 'Cozzy', 0, [hit(1, 'Nura Ananthe', 'Laaiq', 72)]), []);
  assert.strictEqual(pick('Nura Ananthe', 'Cozzy', 0, [hit(1, 'Cozzy - Nura Ananthe', 'Laaiq', 201)]).length, 1);
});

test('an edit is allowed when that is what was asked for', () => {
  const ranked = pick('Blinding Lights (Slowed & Reverb)', 'The Weeknd', 221, [
    hit(1, 'blinding lights - the weeknd (slowed & reverbed)', 'yaromilov', 221)
  ]);
  assert.strictEqual(ranked.length, 1);
});

// When no original exists the web build plays the closest version instead of
// failing: same song first, least-altered kind of version, closest length.
function fallback(title, artist, expectedSec, pool) {
  const info = { core: scCoreTitle(title, artist), mainArtist: scMainArtist(artist), expectedSec, query: `${title} ${artist} - ${title}` };
  return rankSoundCloudFallbackHits(pool, info);
}

test('fallback prefers a same-length cover over remixes, remakes and mashups', () => {
  const ranked = fallback('Blinding Lights', 'The Weeknd', 200, [
    hit(1, 'blinding lights x big poppa', 'kanye south', 206),
    hit(2, 'The Weeknd - Blinding lights (Lee Wright Remake)', 'Lee Wright', 159),
    hit(3, 'Blinding Lights - The Weeknd (SPARKZ Remix)', 'SPARKZ', 204),
    hit(4, 'The Weeknd - Blinding Lights | Cover by Sapphire', 'SAPPHIRE', 200),
    hit(5, 'blinding lights - the weeknd (slowed & reverbed)', 'yaromilov', 221)
  ]);
  assert.strictEqual(ranked[0].id, 4);
  assert.strictEqual(ranked[ranked.length - 1].id, 1, 'mashups come last');
});

test('fallback never offers a different song or a 30s preview', () => {
  assert.deepStrictEqual(fallback('Hinahena Wala', 'Muthuja Sanahas & Santhur', 225, [
    hit(1, 'Hinahena Wala', 'Muthuja Sanahas', 30, 'SNIP'),
    hit(2, 'Numba Hinahuna Diha_Bala - Peshala Gamage', 'sinhanadanet', 207)
  ]), []);
});
