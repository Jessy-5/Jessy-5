import { randomInt } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const banners = [
  'assets/banner/jessy-01-ice-blue.webp',
  'assets/banner/jessy-02-ink-vermilion.webp',
  'assets/banner/jessy-03-mist-lilac.webp',
  'assets/banner/jessy-04-cobalt.webp',
];

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

function shanghaiDate(now) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export async function rotateBanner({
  root = repositoryRoot,
  now = new Date(),
  chooseIndex = randomInt,
} = {}) {
  const readmePath = join(root, 'README.md');
  const statePath = join(root, '.github', 'banner-state.json');
  const readme = await readFile(readmePath, 'utf8');
  const images = [...readme.matchAll(/^!\[[^\r\n]*\]\((assets\/banner\/[^)\r\n]+\.webp)\)[ \t]*\r?$/gmu)];
  if (images.length !== 1 || !banners.includes(images[0][1])) {
    throw new Error('README must contain exactly one known Markdown banner image.');
  }

  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (!state || typeof state.lastRotationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(state.lastRotationDate)) {
    throw new Error('Banner state must contain a lastRotationDate in YYYY-MM-DD format.');
  }

  // Validate every candidate before changing the README, so a missing asset cannot be selected.
  for (const banner of banners) {
    const asset = await stat(join(root, banner));
    if (!asset.isFile() || asset.size === 0) {
      throw new Error(`Banner asset is not a non-empty file: ${banner}`);
    }
  }

  const today = shanghaiDate(now);
  const currentBanner = images[0][1];
  if (state.lastRotationDate >= today) {
    return { changed: false, banner: currentBanner, date: today };
  }

  const candidates = banners.filter((banner) => banner !== currentBanner);
  const nextBanner = candidates[chooseIndex(candidates.length)];
  if (!nextBanner) {
    throw new Error('Banner selection returned an invalid index.');
  }

  const updatedReadme = readme.replace(images[0][0], images[0][0].replace(currentBanner, nextBanner));
  await writeFile(readmePath, updatedReadme, 'utf8');
  await writeFile(statePath, `${JSON.stringify({ ...state, lastRotationDate: today }, null, 2)}\n`, 'utf8');
  return { changed: true, banner: nextBanner, date: today };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await rotateBanner();
    console.log(`${result.changed ? 'Selected' : 'Already selected'} (${result.date}): ${result.banner}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
