const { PNG } = require('pngjs');
const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
module.exports = async function measureRenderedContrast(page, nodes) {
  const measurements = [];
  for (const node of nodes) {
    const selector = node.target.length === 1 && typeof node.target[0] === 'string' ? node.target[0] : null;
    if (!selector) { measurements.push({ target: node.target, measured: false, reason: 'Complex selector' }); continue; }
    const data = await page.locator(selector).first().evaluate(element => {
      const style = getComputedStyle(element);
      const unsupported = [];
      for (let parent = element; parent; parent = parent.parentElement) {
        const current = getComputedStyle(parent);
        if (current.opacity !== '1' || current.filter !== 'none' || current.mixBlendMode !== 'normal') unsupported.push({ opacity: current.opacity, filter: current.filter, mixBlendMode: current.mixBlendMode });
      }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), boxes = []; let text;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) continue;
        // Screen-reader-only labels are deliberately clipped out of visual paint.
        let clipped = false;
        for (let parent = text.parentElement; parent && parent !== element; parent = parent.parentElement) {
          if (getComputedStyle(parent).clip !== 'auto') clipped = true;
        }
        if (clipped) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) if (rect.width > 0 && rect.height > 0) boxes.push({ x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, color: getComputedStyle(text.parentElement).color });
      }
      return { text: element.textContent.trim().slice(0, 140), color: style.color, unsupported, boxes, disabled: !!element.closest(':disabled,[aria-disabled="true"]') };
    });
    measurements.push({ target: node.target, ...data, expected: Number(node.any.find(check => check.id === 'color-contrast')?.data?.expectedContrastRatio?.split(':')[0] || 4.5) });
  }
  // Instrumentation only: remove glyph paint while retaining layout, colors,
  // pseudo-elements, gradients and transparency to sample actual backgrounds.
  const mask = await page.addStyleTag({ content: '.dashboard-landing-content, .dashboard-landing-content * { -webkit-text-fill-color: transparent !important; text-shadow: none !important; } nextjs-portal { visibility: hidden !important; }' });
  let background;
  try { background = PNG.sync.read(await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'initial' })); }
  finally { await mask.evaluate(element => element.remove()); }
  for (const value of measurements) {
    if (!value.boxes?.length || value.unsupported.length || value.disabled) { value.measured = false; value.reason ||= value.disabled ? 'Disabled control' : 'No text boxes or unsupported opacity/filter'; continue; }
    let minimum = Infinity, sample = null;
    for (const box of value.boxes) {
      const color = box.color.match(/[\d.]+/g)?.map(Number);
      if (!color || color.length < 3) { minimum = NaN; break; }
      for (let y = Math.max(0, Math.ceil(box.y)); y < Math.min(background.height, Math.floor(box.y + box.height)); y++) {
        for (let x = Math.max(0, Math.ceil(box.x)); x < Math.min(background.width, Math.floor(box.x + box.width)); x++) {
          const offset = (y * background.width + x) * 4, bg = Array.from(background.data.subarray(offset, offset + 3));
          const alpha = color[3] ?? 1, fg = color.slice(0, 3).map((channel, i) => channel * alpha + bg[i] * (1 - alpha));
          const first = luminance(fg), second = luminance(bg), ratio = (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
          if (ratio < minimum) { minimum = ratio; sample = { x, y, background: bg, foreground: fg }; }
        }
      }
    }
    value.measured = Number.isFinite(minimum); value.minimumRatio = minimum; value.sample = sample;
    value.passes = value.measured && minimum >= value.expected;
    delete value.boxes;
  }
  return measurements;
};
