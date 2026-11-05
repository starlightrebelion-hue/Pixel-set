/** Carga / recolor de sprites de Nora (marketing) a partir de guion. */
export function tintNoraFromGuion(src: HTMLImageElement): string {
  const c = document.createElement("canvas");
  c.width = src.naturalWidth || 128;
  c.height = src.naturalHeight || 128;
  const g = c.getContext("2d");
  if (!g) return src.src;
  g.drawImage(src, 0, 0);
  const imageData = g.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 15) continue;
    const r = d[i], gv = d[i + 1], b = d[i + 2];
    if (r < 90 && gv < 110 && b > 90 && b > r && b > gv) {
      d[i] = 22 + (r >> 2);
      d[i + 1] = 88 + ((gv / 3) | 0);
      d[i + 2] = 92 + (b >> 3);
    } else if (r > 220 && gv > 200 && b > 180 && Math.abs(r - gv) < 40) {
      d[i] = 38;
      d[i + 1] = 42;
      d[i + 2] = 58;
    } else if (r < 90 && gv < 70 && b < 70 && Math.max(r, gv, b) < 100) {
      d[i] = Math.min(255, r + 15);
      d[i + 2] = Math.min(255, b + 25);
    } else if (100 < r && r < 180 && 70 < gv && gv < 140 && 40 < b && b < 100 && r > gv) {
      d[i] = 55;
      d[i + 1] = 62;
      d[i + 2] = 72;
    }
  }
  g.putImageData(imageData, 0, 0);
  return c.toDataURL("image/png");
}
