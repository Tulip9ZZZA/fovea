// proxy.js — same-origin fetch-and-rewrite proxy.
// Why this exists: page JavaScript cannot read a cross-origin iframe, so "audit any URL"
// needs the page served from our own origin. We fetch HTML, strip every script vector,
// rewrite asset URLs to route back through us, and serve the result same-origin.
// Limits (labeled in the UI too): static markup + styles only — no client-side rendering,
// 5 MB HTML cap, 12 s timeout, best-effort URL rewriting on unusual markup.

import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import dns from 'node:dns/promises';
import net from 'node:net';

const UA = 'Mozilla/5.0 (compatible; FoveaA11yXray/1.0; +https://github.com/fovea) hackathon-audit';
const HTML_CAP = 5 * 1024 * 1024;
const ASSET_CAP = 8 * 1024 * 1024;
const TIMEOUT_MS = 12000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
  }
  const low = ip.toLowerCase();
  return low === '::1' || low === '::' || low.startsWith('fc') || low.startsWith('fd') ||
    low.startsWith('fe80') || low.startsWith('::ffff:127.') || low.startsWith('::ffff:10.');
}

// Reject anything that resolves to a private/loopback range (SSRF guard).
export async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('private address blocked');
    return;
  }
  const addrs = await dns.lookup(hostname, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) {
    throw new Error('private address blocked');
  }
}

async function fetchLimited(url, cap) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: '*/*' },
    });
    const len = Number(res.headers.get('content-length') || 0);
    if (len > cap) throw new Error('resource too large');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > cap) throw new Error('resource too large');
    return { res, buf };
  } finally {
    clearTimeout(timer);
  }
}

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function proxied(abs) {
  return `/proxy?url=${encodeURIComponent(abs)}`;
}

// Rewrite one URL found in markup/CSS. data:, #, mailto:, tel: stay untouched.
function rewriteUrl(raw, base) {
  const u = raw.trim();
  if (!u || u.startsWith('#') || u.startsWith('data:') || u.startsWith('mailto:') ||
      u.startsWith('tel:') || u.startsWith('javascript:')) return null;
  try {
    const abs = new URL(u, base).toString();
    if (!/^https?:/.test(abs)) return null;
    return proxied(abs);
  } catch {
    return null;
  }
}

export function rewriteHtml(html, base) {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '<!-- fovea: script removed -->')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, 'blocked:');

  // src / href / action / poster / srcset
  out = out.replace(/\s(src|href|action|poster)\s*=\s*"([^"]*)"/gi, (m, attr, val) => {
    const p = rewriteUrl(val, base);
    return p ? ` ${attr}="${esc(p)}"` : ` ${attr}="${esc(val)}"`;
  });
  out = out.replace(/\s(srcset)\s*=\s*"([^"]*)"/gi, (m, attr, val) => {
    const parts = val.split(',').map(part => {
      const [u, ...d] = part.trim().split(/\s+/);
      const p = rewriteUrl(u, base);
      return [p || u, ...d].join(' ');
    });
    return ` ${attr}="${esc(parts.join(', '))}"`;
  });
  return out;
}

export function rewriteCss(css, base) {
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      const p = rewriteUrl(u, base);
      return p ? `url(${q}${p}${q})` : m;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => {
      const p = rewriteUrl(u, base);
      return p ? `@import ${q}${p}${q}` : m;
    });
}

export function errorPage(message, url) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Fovea proxy</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:12vh auto;padding:0 20px;color:#1d2430">
<h1 style="font-size:20px">This page could not be mirrored</h1>
<p style="color:#5a6560;font-size:14px;line-height:1.6">${message}</p>
<p style="color:#5a6560;font-size:13px">The same-origin proxy mirrors static markup and styles only.
Heavy client-rendered sites may refuse or degrade — for those, use <b>Paste HTML</b> mode in Fovea.</p>
${url ? `<p style="color:#9aa39d;font-size:12px">URL: ${esc(url)}</p>` : ''}
</body></html>`;
}

// Main entry: GET /proxy?url=…
export async function handleProxy(req, res, target) {
  let url;
  try {
    url = new URL(target);
  } catch {
    return sendError(res, 400, 'That URL could not be parsed.');
  }
  if (!/^https?:$/.test(url.protocol)) {
    return sendError(res, 400, 'Only http(s) URLs can be audited.');
  }
  try {
    await assertPublicHost(url.hostname);
  } catch {
    return sendError(res, 403, 'Fovea refuses to fetch private or loopback addresses.');
  }

  try {
    const { res: up, buf } = await fetchLimited(url.toString(), HTML_CAP);
    const ctype = (up.headers.get('content-type') || '').toLowerCase();
    res.setHeader('x-fovea-proxy', '1');
    res.setHeader('x-content-type-options', 'nosniff');

    if (ctype.includes('text/html') || ctype === '' || ctype.includes('application/xhtml')) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('content-security-policy', "script-src 'none'; object-src 'none'; frame-ancestors 'self'");
      res.send(rewriteHtml(buf.toString('utf8'), url.toString()));
    } else if (ctype.includes('text/css')) {
      res.setHeader('content-type', 'text/css; charset=utf-8');
      res.send(rewriteCss(buf.toString('utf8'), url.toString()));
    } else {
      // images / fonts / other assets: pass through with a cap
      res.setHeader('content-type', ctype || 'application/octet-stream');
      res.setHeader('cache-control', 'public, max-age=3600');
      await pipeline(Readable.from(buf), res);
    }
  } catch (e) {
    const reason = e.name === 'AbortError' ? 'The site took longer than 12 s to answer.'
      : e.cause?.code === 'ENOTFOUND' ? 'The host does not exist (DNS lookup failed).'
      : e.message === 'resource too large' ? `The resource exceeds Fovea's ${HTML_CAP / 1048576} MB mirror cap.`
      : 'The site refused or dropped the connection (some sites block non-browser clients).';
    sendError(res, 502, reason);
  }
}

function sendError(res, code, message) {
  res.status(code).setHeader('content-type', 'text/html; charset=utf-8');
  res.send(errorPage(message, ''));
}
