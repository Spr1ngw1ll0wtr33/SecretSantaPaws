/* Makes the Secret Santa Paws explainer video.
   Usage (from the repository folder):
     python3 -m http.server 8765 &      (serves the app and video/stage.html)
     node video/make-video.js <work folder> <output.mp4>
   It drives the real app with the made-up test spreadsheet, captures frames
   and joins them with ffmpeg. Silent, with captions. */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORK = process.argv[2];
const OUT = process.argv[3];
const FPS = 25;
// Overall pace: pauses are multiplied by HOLD_PACE, movements by MOVE_PACE (1 = draft 1 timing)
const HOLD_PACE = 0.72, MOVE_PACE = 0.85;
const TEST_SHEET = path.join(__dirname, '..', 'test-dummy.xlsx');
fs.mkdirSync(path.join(WORK, 'frames'), { recursive: true });

let page, frame, n = 0;
const list = [];
let cur = { x: 960, y: 500 };

const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const S = (fn, ...args) => page.evaluate(([f, a]) => window.S[f](...a), [fn, args]);

async function snap(seconds) {
  const file = path.join(WORK, 'frames', String(n++).padStart(6, '0') + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 95 });
  list.push({ file, seconds });
}
const hold = s => snap(s * HOLD_PACE);
async function animate(seconds, fn) {
  const steps = Math.max(1, Math.round(seconds * MOVE_PACE * FPS));
  for (let i = 1; i <= steps; i++) { await fn(ease(i / steps)); await snap(1 / FPS); }
}
/* Time to read a caption calmly: about 140 words a minute, plus a pause */
function readTime(text) {
  const words = text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(5, words * 0.43 + 2.5);
}
async function say(text, step, extra = 0) {
  await animate(0.35, p => S('captionOpacity', 1 - p));
  await S('caption', text, step);
  await animate(0.4, p => S('captionOpacity', p));
  await hold(readTime(text) + extra);
}
async function moveTo(x, y, seconds = 1.1) {
  const from = { ...cur };
  await animate(seconds, p => S('cursor', from.x + (x - from.x) * p, from.y + (y - from.y) * p, true));
  cur = { x, y };
}
async function click() {
  await animate(0.45, p => S('ripple', cur.x, cur.y, p));
  await S('ripple', cur.x, cur.y, null);
}
async function pointAt(sel, opts = {}) {     // highlight an app element and move the pointer onto it
  const r = await S('rect', sel);
  if (opts.highlight !== false) await S('highlight', r, opts.pad);
  await moveTo(r.x + Math.min(r.w * 0.5, opts.dx || 60), r.y + r.h * 0.55);
  return r;
}
async function scrollApp(sel, top, seconds = 1.4) {
  const from = await S('scrollY');
  const to = await S('scrollTarget', sel, top);
  if (Math.abs(to - from) < 2) return;
  await animate(seconds, p => S('scrollTo', from + (to - from) * p));
}
async function fadeCard(id, from, to, seconds = 0.7) {
  await animate(seconds, p => S('card', id, from + (to - from) * p));
  if (to === 0) await S('card', null, 0);
}
async function crossCards(a, b) {
  await fadeCard(a, 1, 0, 0.5);
  await S('card', b, 0);
  await fadeCard(b, 0, 1, 0.5);
}
const appEval = (fn, arg) => frame.evaluate(fn, arg);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true, colorScheme: 'light' });
  page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8765/video/stage.html');
  await page.waitForFunction(() => window.S && document.getElementById('app').contentDocument.readyState === 'complete');
  frame = page.frames().find(f => f.url().endsWith('/index.html'));
  page.on('dialog', d => d.accept());
  await page.evaluate(() => document.fonts.ready);
  await frame.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await S('cursor', cur.x, cur.y, false);
  await S('scrollTo', 0);

  /* ---- Opening cards ---- */
  await S('card', 'cardTitle', 1);
  await S('caption', '', '');
  await S('captionOpacity', 0);
  await hold(6);
  await crossCards('cardTitle', 'cardSteps');
  await hold(13);
  await crossCards('cardSteps', 'cardBefore');
  await hold(15);
  await fadeCard('cardBefore', 1, 0, 0.8);

  /* ---- The app ---- */
  await say('This is the app, open in your web browser. Its address is shown at the top of the window.', '');
  await say('The page works <b>from top to bottom</b>. Each step has a number. More steps appear as you go.', '');

  // Step 1
  await scrollApp('#step1', 15);
  await S('cursor', cur.x, cur.y, true);
  await pointAt('#step1 h2', { highlight: true, pad: 8, dx: 40 });
  await say('<b>Step 1: load the spreadsheet.</b>', 'Step 1 of 5', -2);
  await pointAt('#step1 .filebtn');
  await say('Click <b>Choose spreadsheet</b>.', 'Step 1 of 5', -1);
  await click();
  await S('highlight', null);
  await animate(0.5, p => S('show', 'picker', p));
  await say('A box opens. Find the spreadsheet in your <b>Downloads</b> folder, click it once, then click <b>Open</b>.', 'Step 1 of 5', -2);
  let r = await S('stageRect', 'pickFile');
  await moveTo(r.x + 80, r.y + r.h / 2); await click(); await hold(0.6);
  r = await S('stageRect', 'pickOpen');
  await moveTo(r.x + r.w / 2, r.y + r.h / 2); await click();
  await animate(0.4, p => S('show', 'picker', 1 - p));
  await frame.setInputFiles('#fileInput', TEST_SHEET);
  await page.waitForTimeout(700);
  await scrollApp('#loadResult', 40);
  await pointAt('#loadResult .note.good', { pad: 8, dx: 300 });
  await moveTo(1700, 760, 0.8);
  await say('A <b>green box</b> means the spreadsheet has been read correctly. It shows how many entries there are, and the countries.', 'Step 1 of 5');
  await say('If something needs fixing, a <b>red box</b> appears instead, giving the row number and the problem. Fix it in the spreadsheet, download it again, and choose it again.', 'Step 1 of 5');
  await S('highlight', null);

  // Step 2
  await scrollApp('#step2', 15);
  await pointAt('#matchBtn');
  await say('<b>Step 2: make the matches.</b> Click <b>Make the matches</b>. It takes a second or two.', 'Step 2 of 5');
  await click();
  await S('highlight', null);
  await appEval(() => document.getElementById('matchBtn').click());
  await page.waitForTimeout(2500);
  await hold(1);
  await pointAt('#matchResult .note.good', { pad: 8, dx: 300 });
  await moveTo(1700, 760, 0.8);
  await say('<b>Four green ticks</b> mean the app has checked every match: everyone sends one gift, receives one, and the country rules are followed.', 'Step 2 of 5');
  const amber = await appEval(() => !!document.querySelector('#matchResult .note.warn'));
  if (amber) {
    await scrollApp('#matchResult .note.warn', 200);
    await pointAt('#matchResult .note.warn', { pad: 8, dx: 300 });
    await moveTo(1700, 760, 0.8);
    await say('Sometimes there is also an <b>amber box</b>. It is for information only: it lists anything unusual that the country rules made unavoidable. You don’t need to do anything.', 'Step 2 of 5');
  }
  await S('highlight', null);

  // Step 3
  await scrollApp('#step3', 15);
  await pointAt('#downloadBtn');
  await say('<b>Step 3: download the master list.</b> Always do this <b>before</b> sending any emails.', 'Step 3 of 5');
  await click();
  const [dl1] = await Promise.all([page.waitForEvent('download'), appEval(() => document.getElementById('downloadBtn').click())]);
  await S('dlName', dl1.suggestedFilename());
  await S('highlight', null);
  await animate(0.4, p => S('show', 'dl', p, 'flex'));
  await say('The master list goes into your Downloads folder. It is your <b>back-up</b>: it shows who sends to whom, so a lost email can always be sent again.', 'Step 3 of 5');
  await animate(0.4, p => S('show', 'dl', 1 - p, 'flex'));
  await scrollApp('#masterTable', 60);
  await pointAt('.tablewrap', { pad: 6, dx: 400 });
  await moveTo(1700, 760, 0.8);
  await say('The same list is shown on the page, so you can look someone up.', 'Step 3 of 5');
  await S('highlight', null);

  // Step 4
  await scrollApp('#step4', 15);
  await say('<b>Step 4: check the email wording.</b> This is the message everyone will get. You only need to fill in the <b>spending limits</b>.', 'Step 4 of 5');
  await scrollApp('#template', 30);
  await appEval(() => { const t = document.getElementById('template'); t.scrollTop = t.scrollHeight; });
  await hold(0.5);
  await pointAt('#template', { pad: 6, dx: 200 });
  await say('Scroll to the bottom of the wording, and type the amounts in place of <b>TBA</b>. We’ll use made-up amounts here.', 'Step 4 of 5', -1);
  for (const [from, to] of [['£TBA', '£20'], ['$TBA', '$25'], ['Euros TBA', 'Euros 23']]) {
    // delete "TBA" then type the number, a character at a time
    const prefix = from.replace('TBA', '');
    const steps = ['TB', 'T', '', to.slice(prefix.length, prefix.length + 1), to.slice(prefix.length)];
    for (const s of steps) {
      await appEval(([line, nextText]) => {
        const t = document.getElementById('template');
        const lines = t.value.split('\n');
        const i = lines.findIndex(l => l.startsWith(line.p));
        lines[i] = line.p + nextText;
        t.value = lines.join('\n');
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.scrollTop = t.scrollHeight;
      }, [{ p: prefix }, s]);
      await hold(0.18);
    }
    await hold(0.5);
  }
  await hold(1.5);
  await S('highlight', null);
  await scrollApp('#preview', 120);
  await appEval(() => { const p = document.getElementById('preview'); p.scrollTop = p.scrollHeight; });
  await hold(0.3);
  await pointAt('#preview', { pad: 6, dx: 300 });
  await moveTo(1700, 760, 0.8);
  await say('The <b>preview</b> shows exactly what the first person will receive, with their match’s name, dog and address filled in.', 'Step 4 of 5');
  await say('The wording is remembered on this computer. Even so, skim each email before you send it.', 'Step 4 of 5');
  await S('highlight', null);

  // Step 5
  await scrollApp('#step5', 15);
  await say('<b>Step 5: send the emails.</b> This is where most of the time goes, so take it steadily.', 'Step 5 of 5');
  await scrollApp('#sendList', 20);
  await pointAt('#sendList .person', { pad: 6, dx: 300 });
  await moveTo(1700, 700, 0.8);
  await say('Each entry has a <b>card</b>: who the email goes to, and who they’ll send a gift to. Work down from the top, one card at a time.', 'Step 5 of 5');

  async function sendCard(i, slow) {
    const cards = '#sendList .person:nth-child(' + (i + 1) + ')';
    await scrollApp(cards, 20, slow ? 1.2 : 0.6);
    await pointAt(cards + ' a[data-link=gmail]', { pad: 6, dx: 40 });
    if (slow) await say('Click <b>Gmail</b> on the card.', 'Step 5 of 5', -1);
    else await hold(0.6);
    await click();
    await S('highlight', null);
    const href = await appEval(sel => document.querySelector(sel).href, cards + ' a[data-link=gmail]');
    const u = new URL(href);
    await S('gmail', u.searchParams.get('to'), u.searchParams.get('su'), u.searchParams.get('body'));
    await animate(0.5, p => S('show', 'gmail', p));
    if (slow) {
      await say('Gmail opens a <b>new email, already filled in</b>: the address, the subject and the message.', 'Step 5 of 5');
      await say('Skim it. Check the greeting, the amounts, and the match’s details at the bottom.', 'Step 5 of 5', -1);
      await page.evaluate(() => { const b = document.getElementById('gBody'); b.style.transition = 'none'; });
      const max = await page.evaluate(() => { const b = document.getElementById('gBody'); return b.scrollHeight - b.clientHeight; });
      await animate(3, p => page.evaluate(v => { document.getElementById('gBody').scrollTop = v; }, max * p));
      await hold(4);
    } else await hold(1.2);
    const s = await S('stageRect', 'gSend');
    await moveTo(s.x + s.w / 2, s.y + s.h / 2, slow ? 1.1 : 0.6);
    if (slow) await say('If it all looks right, click <b>Send</b>.', 'Step 5 of 5', -1);
    await click();
    await animate(0.5, p => S('show', 'gmail', 1 - p));
    await page.evaluate(() => { document.getElementById('gBody').scrollTop = 0; });
    if (slow) await say('Gmail sends it. Back in the app, <b>tick Sent</b> on that card.', 'Step 5 of 5', -1);
    await pointAt(cards + ' input[data-sent]', { pad: 6, dx: 10 });
    await click();
    await appEval(sel => document.querySelector(sel).click(), cards + ' input[data-sent]');
    await hold(slow ? 1.2 : 0.5);
    await S('highlight', null);
  }

  await sendCard(0, true);
  await pointAt('#sendList .person:nth-child(1)', { pad: 6, dx: 300 });
  await moveTo(1700, 700, 0.8);
  await say('The card turns <b>green</b>, and the counter goes up. Then on to the next card: <b>Gmail, check, Send, tick</b>.', 'Step 5 of 5');
  await S('highlight', null);
  await say('Here are the next few, sped up.', 'Step 5 of 5', -2);
  for (let i = 1; i < 4; i++) await sendCard(i, false);
  await say('\u2026and so on, down the list.', 'Step 5 of 5', -3);
  for (let i = 4; i < 10; i++) {
    const card = '#sendList .person:nth-child(' + (i + 1) + ')';
    await scrollApp(card, 20, 0.5);
    await pointAt(card + ' input[data-sent]', { highlight: false, dx: 10 }).catch(() => {});
    await appEval(sel => document.querySelector(sel).click(), card + ' input[data-sent]');
    await hold(0.5);
  }

  await scrollApp('#counter', 20);
  await pointAt('#saveReminder .note', { pad: 6, dx: 300 });
  await moveTo(1700, 700, 0.8);
  await say('After every 10 ticks, the app reminds you to <b>save your progress</b>.', 'Step 5 of 5');
  await pointAt('#saveProgressBtn');
  await say('Click <b>Save progress</b>.', 'Step 5 of 5', -2);
  await click();
  const [dl2] = await Promise.all([page.waitForEvent('download'), appEval(() => document.getElementById('saveProgressBtn').click())]);
  await S('dlName', dl2.suggestedFilename());
  await S('highlight', null);
  await animate(0.4, p => S('show', 'dl', p, 'flex'));
  await say('This downloads a new master list that includes your ticks. The newest one is always the one to keep.', 'Step 5 of 5');
  await animate(0.4, p => S('show', 'dl', 1 - p, 'flex'));

  // Stopping halfway
  await scrollApp('#step1', 15, 2.2);
  await pointAt('#step1 .filebtn:nth-of-type(2)');
  await say('<b>Stopping halfway?</b> That’s fine. Next time, open the app and click <b>Reload a saved master list</b>.', 'If you stop part-way');
  await say('Choose the newest master list from your Downloads. Your matches and ticks come back, and you carry on from step 5.', 'If you stop part-way');
  await S('highlight', null);
  await S('cursor', cur.x, cur.y, false);
  await animate(0.35, p => S('captionOpacity', 1 - p));

  /* ---- Closing cards ---- */
  await S('card', 'cardRecap', 0);
  await fadeCard('cardRecap', 0, 1, 0.8);
  await hold(22);
  await crossCards('cardRecap', 'cardEnd');
  await hold(6);

  await browser.close();

  // Join the frames into an MP4
  const lines = [];
  for (const f of list) { lines.push(`file '${f.file}'`); lines.push(`duration ${f.seconds.toFixed(4)}`); }
  lines.push(`file '${list[list.length - 1].file}'`);
  fs.writeFileSync(path.join(WORK, 'list.txt'), lines.join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'list.txt'),
    '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'stillimage',
    '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  const total = list.reduce((a, f) => a + f.seconds, 0);
  console.log('frames', list.length, 'duration', Math.round(total) + 's', '->', OUT);
})();
