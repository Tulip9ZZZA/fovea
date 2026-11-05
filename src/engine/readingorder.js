// readingorder.js — approximate screen-reader reading order / transcript.
// DOM order is the truth most screen readers follow for sane pages; this is an
// awareness aid, not a screen reader. Every output line notes its source.
// Pure function over scanner snapshots.

function ownText(s) {
  return (s.text || '').trim();
}

function labelForControl(s, snapshotsById) {
  if (s.attrs['aria-label']) return s.attrs['aria-label'];
  if (s.attrs['aria-labelledby']) {
    const parts = s.attrs['aria-labelledby'].split(/\s+/).map(id => snapshotsById.get(id)).filter(Boolean);
    const t = parts.map(p => ownText(p) || p.attrs.alt || '').join(' ').trim();
    if (t) return t;
  }
  if (s.assocLabel) return s.assocLabel;
  if (s.attrs.title) return s.attrs.title;
  if (s.attrs.placeholder) return s.attrs.placeholder;
  return '';
}

export function readingTranscript(snapshots) {
  const byId = new Map();
  snapshots.forEach(s => { if (s.attrs.id) byId.set(s.attrs.id, s); });
  const lines = [];
  for (const s of snapshots) {
    if (s.flags.displayNone || s.flags.visibilityHidden || s.flags.hiddenAttr) continue;
    const role = s.attrs.role || null;
    const t = ownText(s);
    const alt = s.attrs.alt;
    switch (s.tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const lvl = Number(s.tag[1]);
        if (t) lines.push({ kind: 'heading', level: lvl, text: t });
        break;
      }
      case 'img':
        // alt="" images are correctly skipped by screen readers (decorative)
        if (alt === undefined) lines.push({ kind: 'image', text: '(image, no alt text read out)' });
        else if (alt !== '') lines.push({ kind: 'image', text: alt });
        break;
      case 'a':
        if (t || s.attrs['aria-label']) lines.push({ kind: 'link', text: s.attrs['aria-label'] || t });
        break;
      case 'button':
        lines.push({ kind: 'button', text: labelForControl(s, byId) || t || '(button, no name)' });
        break;
      case 'input': case 'select': case 'textarea': {
        if (s.attrs.type === 'hidden') break;
        const l = labelForControl(s, byId);
        lines.push({ kind: 'control', text: l ? `${l}` : '(form field, no label read out)' });
        break;
      }
      case 'label': break; // read with its control, not standalone
      default: {
        const isLandmark = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'search'].includes(role);
        if (isLandmark && t === '') {
          lines.push({ kind: 'landmark', text: role === 'contentinfo' ? 'footer landmark' : `${role} landmark` });
        } else if (t) {
          lines.push({ kind: 'text', text: t });
        }
      }
    }
  }
  return lines;
}
