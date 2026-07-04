/** In-place green-screen removal on RGBA image data. */
export function applyGreenScreenKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  for (let y = 0; y < height; y += 1) {
    const rowT = y / height;
    // Floor shadow sits on the bottom ~30% — key harder there.
    const zone =
      rowT > 0.82 ? 2.4 : rowT > 0.68 ? 1.75 : rowT > 0.52 ? 1.25 : 1;

    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxRB = Math.max(r, b);
      const greenExcess = g - maxRB;

      const isGreenScreen =
        (g > 45 && greenExcess > 10 * zone) ||
        (g > 70 && r < 100 && b < 100 && greenExcess > 6 * zone) ||
        (rowT > 0.75 && g > 35 && g > r && g > b && greenExcess > 4);

      if (!isGreenScreen) continue;

      const spill = Math.min(255, greenExcess * (4.8 * zone));
      let alpha = Math.max(0, 255 - spill);

      // Hard-cut floor spill on the lowest rows.
      if (rowT > 0.86 && g > r && g > b) {
        alpha = 0;
      }

      data[i + 3] = Math.min(data[i + 3], alpha);

      if (alpha < 230) {
        data[i + 1] = Math.min(g, Math.max(r, b));
      }
    }
  }
}
