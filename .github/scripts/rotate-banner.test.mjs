import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { banners, rotateBanner } from './rotate-banner.mjs';

const prefix = '# Profile introduction\n\n';
const suffix = '\n\n## Selected Work\nPublic case studies coming soon.\n';

function sampleReadme(banner = banners[0]) {
  return `${prefix}![Jessy](${banner})${suffix}`;
}

const statePath = (root) => join(root, '.github', 'banner-state.json');

async function fixture(t, content = sampleReadme(), lastRotationDate = '2026-10-12') {
  const temporaryRoot = resolve(tmpdir());
  const root = await mkdtemp(join(temporaryRoot, 'jessy-banner-test-'));
  t.after(async () => {
    const target = resolve(root);
    if (dirname(target) !== temporaryRoot || !basename(target).startsWith('jessy-banner-test-')) {
      throw new Error('Refusing to remove a fixture outside the test temporary directory.');
    }
    await rm(target, { recursive: true, force: true });
  });
  await mkdir(join(root, 'assets', 'banner'), { recursive: true });
  await mkdir(join(root, '.github'), { recursive: true });
  await writeFile(join(root, 'README.md'), content);
  await writeFile(statePath(root), `${JSON.stringify({ lastRotationDate }, null, 2)}\n`);
  for (const banner of banners) {
    await writeFile(join(root, banner), 'non-empty test asset');
  }
  return root;
}

test('every banner can switch to each of the other three, preserving the surrounding profile', async (t) => {
  for (const current of banners) {
    const choices = new Set();
    for (let index = 0; index < 3; index++) {
      const root = await fixture(t, sampleReadme(current));
      const result = await rotateBanner({
        root,
        now: new Date('2026-10-13T01:17:00Z'),
        chooseIndex: () => index,
      });
      assert.equal(result.changed, true);
      assert.notEqual(result.banner, current);
      choices.add(result.banner);
      const updated = await readFile(join(root, 'README.md'), 'utf8');
      assert.equal(updated, sampleReadme(result.banner));
      assert.equal(JSON.parse(await readFile(statePath(root), 'utf8')).lastRotationDate, '2026-10-13');
    }
    assert.deepEqual(choices, new Set(banners.filter((banner) => banner !== current)));
  }
});

test('a repeated run on the same Shanghai date does not change the image or file', async (t) => {
  const root = await fixture(t);
  await rotateBanner({ root, now: new Date('2026-10-13T01:17:00Z'), chooseIndex: () => 0 });
  const before = await readFile(join(root, 'README.md'), 'utf8');
  const stateBefore = await readFile(statePath(root), 'utf8');
  const result = await rotateBanner({
    root,
    now: new Date('2026-10-13T15:59:00Z'),
    chooseIndex: () => { throw new Error('A second selection must not occur.'); },
  });
  assert.equal(result.changed, false);
  assert.equal(await readFile(join(root, 'README.md'), 'utf8'), before);
  assert.equal(await readFile(statePath(root), 'utf8'), stateBefore);
});

test('a new Shanghai day permits rotation even when the UTC date is unchanged', async (t) => {
  const root = await fixture(t, sampleReadme(banners[0]), '2026-10-13');
  const result = await rotateBanner({
    root,
    now: new Date('2026-10-13T16:00:00Z'),
    chooseIndex: () => 0,
  });
  assert.equal(result.changed, true);
  assert.equal(result.date, '2026-10-14');
  assert.notEqual(result.banner, banners[0]);
  assert.equal(JSON.parse(await readFile(statePath(root), 'utf8')).lastRotationDate, '2026-10-14');
});

test('missing assets fail without changing the README', async (t) => {
  const content = sampleReadme();
  const root = await fixture(t, content);
  const stateBefore = await readFile(statePath(root), 'utf8');
  await rm(join(root, banners[2]));
  await assert.rejects(rotateBanner({ root, now: new Date('2026-10-13T01:17:00Z') }));
  assert.equal(await readFile(join(root, 'README.md'), 'utf8'), content);
  assert.equal(await readFile(statePath(root), 'utf8'), stateBefore);
});

test('missing, duplicate or unknown Markdown banners fail without changing either file', async (t) => {
  const invalid = [
    sampleReadme().replace(`![Jessy](${banners[0]})`, ''),
    sampleReadme() + `\n![Another banner](${banners[1]})\n`,
    sampleReadme().replace(banners[0], 'assets/banner/unknown.webp'),
  ];
  for (const content of invalid) {
    const root = await fixture(t, content);
    const stateBefore = await readFile(statePath(root), 'utf8');
    await assert.rejects(rotateBanner({ root, now: new Date('2026-10-13T01:17:00Z') }));
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), content);
    assert.equal(await readFile(statePath(root), 'utf8'), stateBefore);
  }
});

test('missing or invalid state fails without changing the README', async (t) => {
  for (const state of [null, '{', '{}', '{"lastRotationDate":17}', '{"lastRotationDate":"invalid"}']) {
    const content = sampleReadme();
    const root = await fixture(t, content);
    if (state === null) {
      await rm(statePath(root));
    } else {
      await writeFile(statePath(root), state);
    }
    await assert.rejects(rotateBanner({ root, now: new Date('2026-10-13T01:17:00Z') }));
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), content);
    if (state !== null) {
      assert.equal(await readFile(statePath(root), 'utf8'), state);
    }
  }
});

test('rotation preserves CRLF line endings', async (t) => {
  const root = await fixture(t, sampleReadme().replaceAll('\n', '\r\n'));
  const result = await rotateBanner({ root, now: new Date('2026-10-13T01:17:00Z'), chooseIndex: () => 0 });
  assert.equal(
    await readFile(join(root, 'README.md'), 'utf8'),
    sampleReadme(result.banner).replaceAll('\n', '\r\n'),
  );
});
