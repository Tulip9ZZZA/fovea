// batch.js — renders the corpus summary produced by bin/crawl.js.

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  let data;
  try {
    const res = await fetch('/api/corpus/summary');
    if (!res.ok) throw new Error('missing');
    data = await res.json();
  } catch {
    document.querySelector('.batch').insertAdjacentHTML('afterbegin',
      `<div class="panel" style="border-color:#e0b4b4; background:#fdf6f6">
        <b>Corpus not built yet.</b>
        <p class="note">Run <code>npm run crawl</code> once (needs <code>npx playwright install chromium</code>) to audit the seed list and generate this report.</p>
      </div>`);
    return;
  }

  $('sPages').textContent = data.pages.length;
  const scores = data.pages.map(p => p.score);
  $('sMean').textContent = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  $('sFail').textContent = `${Math.round(100 * scores.filter(s => s < 90).length / scores.length)}%`;
  $('sZero').textContent = scores.filter(s => s === 100).length;

  // top violations
  const ruleNames = data.ruleNames || {};
  const top = Object.entries(data.violationTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = top[0]?.[1] || 1;
  $('topRules').innerHTML = top.map(([id, n]) => `
    <div class="hbar">
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(ruleNames[id] || id)}</span>
      <span class="track"><span class="fill" style="width:${Math.max(2, Math.round(100 * n / max))}%"></span></span>
      <b>${n}</b>
    </div>`).join('');

  // histogram
  const bins = Array(20).fill(0);
  for (const s of scores) bins[Math.min(19, Math.floor(s / 5))]++;
  const hmax = Math.max(...bins, 1);
  $('hist').innerHTML = bins.map(b => `<div class="b" style="height:${Math.max(1.5, Math.round(100 * b / hmax))}%; opacity:${b ? 1 : .25}"></div>`).join('');

  // table
  const tb = $('pagesTable').querySelector('tbody');
  const sorted = [...data.pages].sort((a, b) => a.score - b.score);
  tb.innerHTML = sorted.map(p => `
    <tr>
      <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(p.url.replace(/^https?:\/\//, '').slice(0, 46))}</td>
      <td><b>${p.score}</b></td>
      <td>${p.grade}</td>
      <td>${p.counts.critical || 0}</td>
      <td>${p.counts.serious || 0}</td>
      <td class="note">${esc(ruleNames[p.topRule] || p.topRule || '–')}</td>
    </tr>`).join('');

  $('provenance').textContent = data.provenance || '';
}

main();
