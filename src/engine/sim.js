// sim.js — disability simulation filters.
// Color matrices: Machado, Oliveira & Fernandes (2009), severity 1.0 dichromacy —
// the standard physiologically-derived model. Each RGB row sums to 1.0 so whites and
// grays are preserved (unit-tested). feColorMatrix order: R-row, G-row, B-row, 0-row.
// These are awareness aids, not clinical simulations — the UI labels them as such.

export const SIMS = {
  none: { id: 'none', label: 'No simulation', filter: 'none', matrix: null },
  protanopia: {
    id: 'protanopia', label: 'Protanopia (red-blind)',
    matrix: [0.152286, 1.052583, -0.204868, 0, 0,
             0.114503, 0.786281, 0.099216, 0, 0,
            -0.003882, -0.048116, 1.051998, 0, 0,
             0, 0, 0, 1, 0],
  },
  deuteranopia: {
    id: 'deuteranopia', label: 'Deuteranopia (green-blind)',
    matrix: [0.367322, 0.860646, -0.227968, 0, 0,
             0.280085, 0.672501, 0.047413, 0, 0,
            -0.011820, 0.042940, 0.968881, 0, 0,
             0, 0, 0, 1, 0],
  },
  tritanopia: {
    id: 'tritanopia', label: 'Tritanopia (blue-blind)',
    matrix: [1.255528, -0.076749, -0.178779, 0, 0,
            -0.078411, 0.930809, 0.147602, 0, 0,
             0.004733, 0.691367, 0.303900, 0, 0,
             0, 0, 0, 1, 0],
  },
  lowvision: {
    id: 'lowvision', label: 'Low vision (tunnel + blur)',
    filter: 'blur(3px) contrast(0.82)', matrix: null, vignette: true,
  },
};

export function cssFilter(simId) {
  const sim = SIMS[simId];
  if (!sim) return 'none';
  if (sim.matrix) {
    return `url(#fovea-sim-${simId})`;
  }
  return sim.filter || 'none';
}
