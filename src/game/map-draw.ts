/** Procedural pixel-style room backgrounds for guion and montaje maps. */
export function drawGuionRoom(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dw: number,
  dh: number,
) {
  ctx.fillStyle = "#a87848";
  ctx.fillRect(ox, oy, dw, dh);
  ctx.strokeStyle = "#8a6038";
  ctx.lineWidth = 1;
  for (let y = oy + dh * 0.42; y < oy + dh; y += dh * 0.035) {
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + dw, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#a8b0a0";
  ctx.fillRect(ox, oy, dw, dh * 0.42);
  ctx.fillStyle = "#785434";
  ctx.fillRect(ox, oy + dh * 0.32, dw, dh * 0.1);
  const shelf = (sx: number) => {
    ctx.fillStyle = "#5f4028";
    ctx.fillRect(ox + sx, oy + dh * 0.44, dw * 0.1, dh * 0.28);
    ctx.fillStyle = "#3d2818";
    for (let r = 0; r < 4; r++) {
      const ry = oy + dh * 0.46 + r * dh * 0.065;
      ctx.fillRect(ox + sx + dw * 0.01, ry, dw * 0.08, dh * 0.008);
      const colors = ["#8a5a32", "#3c5a8c", "#a03c32", "#5a783c", "#b49650"];
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = colors[b % colors.length]!;
        ctx.fillRect(ox + sx + dw * 0.015 + b * dw * 0.016, ry - dh * 0.04, dw * 0.012, dh * 0.04);
      }
    }
  };
  shelf(dw * 0.03);
  shelf(dw * 0.14);
  shelf(dw * 0.84);
  const desk = (dx: number, dy: number) => {
    ctx.fillStyle = "#8c643c";
    ctx.fillRect(ox + dx, oy + dy, dw * 0.14, dh * 0.06);
    ctx.fillStyle = "#f0e6c8";
    ctx.fillRect(ox + dx + dw * 0.02, oy + dy + dh * 0.015, dw * 0.05, dh * 0.03);
    ctx.fillStyle = "#323238";
    ctx.fillRect(ox + dx + dw * 0.08, oy + dy - dh * 0.02, dw * 0.04, dh * 0.03);
  };
  desk(dw * 0.28, dh * 0.58);
  desk(dw * 0.46, dh * 0.62);
  desk(dw * 0.64, dh * 0.58);
  ctx.fillStyle = "#c8a46e";
  ctx.fillRect(ox + dw * 0.7, oy + dh * 0.12, dw * 0.14, dh * 0.18);
  ctx.fillStyle = "#f0ead0";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(ox + dw * 0.72 + i * dw * 0.03, oy + dh * 0.15, dw * 0.022, dh * 0.04);
  }
  ctx.fillStyle = "#3c2818";
  ctx.fillRect(ox + dw * 0.38, oy + dh * 0.06, dw * 0.24, dh * 0.06);
  ctx.strokeStyle = "#c8aa64";
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + dw * 0.38, oy + dh * 0.06, dw * 0.24, dh * 0.06);
}

export function drawMontajeRoom(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  dw: number,
  dh: number,
) {
  ctx.fillStyle = "#4a4e56";
  ctx.fillRect(ox, oy, dw, dh);
  for (let y = oy + dh * 0.4; y < oy + dh; y += dh * 0.03) {
    ctx.strokeStyle = "#3a3e46";
    ctx.beginPath();
    ctx.moveTo(ox, y);
    ctx.lineTo(ox + dw, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#383c4a";
  ctx.fillRect(ox, oy, dw, dh * 0.4);
  for (let i = 0; i < 5; i++) {
    const mx = ox + dw * (0.08 + i * 0.17);
    ctx.fillStyle = "#181c22";
    ctx.fillRect(mx, oy + dh * 0.1, dw * 0.14, dh * 0.18);
    ctx.fillStyle = i % 2 === 0 ? "#286478" : "#324668";
    ctx.fillRect(mx + dw * 0.01, oy + dh * 0.11, dw * 0.12, dh * 0.14);
    ctx.fillStyle = "#c8783c";
    ctx.fillRect(mx + dw * 0.02, oy + dh * 0.22, dw * 0.04, dh * 0.015);
    ctx.fillStyle = "#50a0c8";
    ctx.fillRect(mx + dw * 0.065, oy + dh * 0.22, dw * 0.035, dh * 0.015);
  }
  for (let i = 0; i < 3; i++) {
    const dx = ox + dw * (0.1 + i * 0.28);
    ctx.fillStyle = "#323640";
    ctx.fillRect(dx, oy + dh * 0.55, dw * 0.2, dh * 0.07);
    ctx.fillStyle = "#14181c";
    ctx.fillRect(dx + dw * 0.02, oy + dh * 0.42, dw * 0.08, dh * 0.12);
    ctx.fillStyle = "#3c644e";
    ctx.fillRect(dx + dw * 0.025, oy + dh * 0.43, dw * 0.07, dh * 0.09);
    ctx.fillStyle = "#14181c";
    ctx.fillRect(dx + dw * 0.11, oy + dh * 0.44, dw * 0.08, dh * 0.11);
    ctx.fillStyle = "#504678";
    ctx.fillRect(dx + dw * 0.115, oy + dh * 0.45, dw * 0.07, dh * 0.08);
  }
  ctx.fillStyle = "#5a4632";
  ctx.fillRect(ox + dw * 0.8, oy + dh * 0.42, dw * 0.16, dh * 0.32);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const cx = ox + dw * 0.83 + c * dw * 0.06;
      const cy = oy + dh * 0.46 + r * dh * 0.08;
      ctx.fillStyle = "#c8c8cc";
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#28282c";
      ctx.beginPath();
      ctx.arc(cx, cy, dw * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
