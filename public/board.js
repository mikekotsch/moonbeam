// Shared board geometry: MoonBoard 2016 = 11 columns (A–K) × 18 rows (1 at the bottom).
export const COLS = 11, ROWS = 18;

// "F5" -> {u, v} in the unit square: u=0 column A, u=1 column K; v=0 row 18 (top), v=1 row 1 (bottom).
export function holdToUV(h) {
  const col = h.charCodeAt(0) - 65;
  const row = parseInt(h.slice(1), 10);
  return { u: col / (COLS - 1), v: (ROWS - row) / (ROWS - 1) };
}

// Projective map from the unit square to an arbitrary quad (tl, tr, br, bl) – Heckbert's square-to-quad.
export function homography(q) {
  const [x0, y0] = q.tl, [x1, y1] = q.tr, [x2, y2] = q.br, [x3, y3] = q.bl;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
  };
}

export const ALL_HOLDS = [];
for (let r = ROWS; r >= 1; r--) for (let c = 0; c < COLS; c++) ALL_HOLDS.push(String.fromCharCode(65 + c) + r);
