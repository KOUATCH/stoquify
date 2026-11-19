'use strict';
// Pure readiness decision plus a serializable, read-only browser frame observation.
const assert = require('node:assert/strict');
function createReadinessTracker({ expectedPath, expectedTag, requiredFrames = 3 }) {
  assert(expectedPath.startsWith('/'));
  assert(['H1', 'INPUT'].includes(expectedTag));
  assert.equal(requiredFrames, 3);
  let consecutive = 0, previousFrame = null;
  return snapshot => {
    const matches = snapshot.path === expectedPath && snapshot.documentReadyState !== 'loading' &&
      snapshot.total === 1 && snapshot.nodes.length === 1 && snapshot.nodes[0].tag === expectedTag &&
      snapshot.nodes[0].visible === true && snapshot.nodes[0].textMatches === true;
    const newFrame = Number.isFinite(snapshot.frameTimestamp) && (previousFrame === null || snapshot.frameTimestamp > previousFrame);
    if (!matches || !newFrame) consecutive = 0;
    else consecutive++;
    previousFrame = snapshot.frameTimestamp;
    return { ready: consecutive >= requiredFrames, consecutive, requiredFrames, matches, newFrame };
  };
}
// This function is sent to page.evaluate; it has no closure or application imports.
function captureRenderedFrame({ selector, expectedText }) {
  return new Promise(resolve => requestAnimationFrame(frameTimestamp => {
    const all = [...document.querySelectorAll(selector)];
    const nodes = all.slice(0, 4).map(element => {
      const hiddenAncestors = [];
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (ancestor.hidden || ancestor.getAttribute('aria-hidden') === 'true' || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)) {
          hiddenAncestors.push({ tag: ancestor.tagName, id: /^[A-Za-z0-9:_-]{0,80}$/.test(ancestor.id) ? ancestor.id : '[unrecorded]', hidden: ancestor.hidden, ariaHidden: ancestor.getAttribute('aria-hidden') === 'true', display: style.display, visibility: style.visibility });
        }
      }
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, visible: rect.width > 0 && rect.height > 0 && hiddenAncestors.length === 0,
        textMatches: expectedText === null || element.textContent.trim() === expectedText,
        hiddenAncestors: hiddenAncestors.slice(0, 6) };
    });
    resolve({ path: location.pathname, documentReadyState: document.readyState, frameTimestamp, total: all.length, nodes });
  }));
}
module.exports = { createReadinessTracker, captureRenderedFrame };
