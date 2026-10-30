// Captures every scene in scenes.mjs, in light and dark, into
// src/assets/screenshots/<scene>-<theme>.webp.
//
//   pnpm shots            all scenes
//   pnpm shots github     only the scenes named

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';
import sharp from 'sharp';

import { scenes } from './scenes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outDir = path.resolve(here, '../src/assets/screenshots');
const themes = ['light', 'dark'];
const FRAME_MS = 80;

const build = spawnSync(
  'pnpm',
  ['exec', 'webpack', '--config', path.join(here, 'webpack.config.cjs')],
  { cwd: root, stdio: 'inherit' }
);
if (build.status !== 0) process.exit(build.status ?? 1);

const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(scenes);
fs.mkdirSync(outDir, { recursive: true });

const harness = pathToFileURL(path.join(here, '.build/harness.html')).href;
const browser = await chromium.launch();

// Joined box of the elements showing these texts (inputs match by value),
// relative to the top of the plugin frame
const cropBox = (page, texts) =>
  page.evaluate((texts) => {
    const frame = document.getElementById('frame').getBoundingClientRect();
    const find = (text) => {
      const input = [...document.querySelectorAll('input')].find(
        (el) => el.value === text
      );
      if (input) return input;
      const all = [...document.querySelectorAll('#frame *')].filter(
        (el) => el.textContent.trim() === text && el.offsetParent
      );
      // the innermost match, so a whole panel doesn't win
      return all.find((el) => !all.some((o) => o !== el && el.contains(o)));
    };
    let top = Infinity;
    let bottom = -Infinity;
    for (const text of texts) {
      const el = find(text);
      if (!el) throw new Error(`crop: no element shows "${text}"`);
      // grow to the row the text sits in
      const row = el.closest('[class*="panel"]') ?? el;
      const box = (row.offsetHeight < 120 ? row : el).getBoundingClientRect();
      top = Math.min(top, box.top - frame.top);
      bottom = Math.max(bottom, box.bottom - frame.top);
    }
    // leave room for the fade on the edges that get cut
    return { top: Math.max(0, top - 40), bottom: bottom + 40 };
  }, texts);

for (const name of names) {
  const scene = scenes[name];
  if (!scene) throw new Error(`Unknown scene "${name}"`);

  for (const theme of themes) {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { width: 1200, height: 1200 },
      colorScheme: theme,
    });
    await page.goto(`${harness}?scene=${name}&theme=${theme}`);
    await page.waitForSelector('#react-page > *');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    if (scene.steps) {
      await scene.steps(page);
      await page.waitForTimeout(400);
      // clicks may scroll things into view; captures start at the top
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('#stage *')) el.scrollTop = 0;
      });
    }

    if (scene.crop) {
      const { top, bottom } = await cropBox(page, scene.crop);
      await page.evaluate(([t, b]) => window.__crop(t, b), [top, bottom]);
    }

    const stage = page.locator('#stage');
    const file = path.join(outDir, `${name}-${theme}.webp`);

    if (scene.animate) {
      const frames = [];
      const delays = [];
      await scene.animate(page, async (hold) => {
        await page.waitForTimeout(30);
        frames.push(await stage.screenshot());
        delays.push(hold * FRAME_MS);
      });
      const sizes = await Promise.all(frames.map((f) => sharp(f).metadata()));
      const width = Math.min(...sizes.map((s) => s.width));
      const height = Math.min(...sizes.map((s) => s.height));
      const resized = await Promise.all(
        frames.map((f) =>
          sharp(f).extract({ left: 0, top: 0, width, height }).toBuffer()
        )
      );
      await sharp(resized, { join: { animated: true } })
        .webp({ quality: 90, loop: 0, delay: delays })
        .toFile(file);
    } else {
      await sharp(await stage.screenshot())
        .webp({ quality: 90 })
        .toFile(file);
    }

    console.log(`✓ ${path.relative(root, file)}`);
    await page.close();
  }
}

await browser.close();
