const TRACK_SORT_MODES = ['manual', 'added-desc', 'added-asc'];

function sortTracks(tracks, mode) {
  const list = Array.isArray(tracks) ? tracks.slice() : [];
  if (mode !== 'added-desc' && mode !== 'added-asc') return list;
  const dir = mode === 'added-desc' ? -1 : 1;
  return list.sort((a, b) => {
    const at = a && typeof a.addedAt === 'number' ? a.addedAt : 0;
    const bt = b && typeof b.addedAt === 'number' ? b.addedAt : 0;
    if (at === bt) return 0;
    return at < bt ? -dir : dir;
  });
}

function backfillAddedAt(tracks, newestFirst) {
  if (!Array.isArray(tracks)) return tracks;
  const now = Date.now();
  let changed = false;
  const list = tracks.map((t, i) => {
    if (!t || typeof t.addedAt === 'number') return t;
    changed = true;
    return { ...t, addedAt: now - (newestFirst ? i : tracks.length - i) * 1000 };
  });
  return changed ? list : tracks;
}

// The element that actually scrolls the list: the nearest ancestor whose
// overflow lets it scroll and that has something to scroll.
function findScrollParent(node) {
  let el = node ? node.parentElement : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
    el = el.parentElement;
  }
  return document.querySelector('.main-content') || document.scrollingElement || document.documentElement;
}

function enableTrackSort(containerOrOpts, onReorderCb) {
  let container = null;
  let onReorder = null;
  let isFilterActive = null;

  if (containerOrOpts && containerOrOpts.nodeType) {
    container = containerOrOpts;
    onReorder = onReorderCb;
  } else if (containerOrOpts && containerOrOpts.container) {
    container = containerOrOpts.container;
    onReorder = onReorderCb || containerOrOpts.onReorder || containerOrOpts.setOrder;
    isFilterActive = containerOrOpts.isFilterActive;
  }
  if (!container) return;

  let draggedItem = null;
  let startX = 0;
  let startY = 0;
  let lastClientY = 0;
  let startScrollTop = 0;
  let scrollEl = null;
  let activePointerId = null;
  let isDragging = false;
  let pressTimer = null;
  let rafId = null;
  let suppressClick = false;
  let fromIdx = -1;
  let toIdx = -1;
  let itemMetrics = [];
  let items = [];
  let draggedHeight = 0;
  let draggedStartTop = 0;
  // Auto-scroll limits: the list is virtualised, so only the rows that exist
  // in the DOM can be drop targets. Scrolling past them would drag over blank
  // padding, so auto-scroll stops at the first/last rendered row.
  let minScroll = 0;
  let maxScroll = Infinity;

  const isPageScroller = (el) => el === document.scrollingElement || el === document.documentElement || el === document.body;
  const viewportRect = (el) => (isPageScroller(el)
    ? { top: 0, bottom: window.innerHeight }
    : el.getBoundingClientRect());
  // Row's real position in the full track list (rows carry it in
  // data-track-index); falls back to the DOM position.
  const realIndex = (row, fallback) => {
    const n = row ? parseInt(row.dataset.trackIndex, 10) : NaN;
    return Number.isNaN(n) ? fallback : n;
  };

  window.addEventListener('click', (e) => {
    if (suppressClick) {
      e.stopImmediatePropagation();
      e.preventDefault();
      suppressClick = false;
    }
  }, true);

  function autoScrollLoop() {
    if (!isDragging || !scrollEl) return;
    {
      const rect = viewportRect(scrollEl);
      const edge = 70;
      let speed = 0;
      if (lastClientY < rect.top + edge) {
        const factor = Math.max(0, Math.min(1, (rect.top + edge - lastClientY) / edge));
        speed = -Math.round(3 + factor * 15);
      } else if (lastClientY > rect.bottom - edge) {
        const factor = Math.max(0, Math.min(1, (lastClientY - (rect.bottom - edge)) / edge));
        speed = Math.round(3 + factor * 15);
      }
      if (speed !== 0) {
        const cur = scrollEl.scrollTop;
        const next = Math.max(Math.max(0, minScroll), Math.min(maxScroll, cur + speed));
        if (next !== cur) {
          scrollEl.scrollTop = next;
          updatePosition();
        }
      }
    }
    rafId = requestAnimationFrame(autoScrollLoop);
  }

  function updatePosition() {
    if (!draggedItem || !isDragging) return;
    const currentScroll = scrollEl ? scrollEl.scrollTop : 0;
    const dy = (lastClientY - startY) + (currentScroll - startScrollTop);
    draggedItem.style.setProperty('transform', `translate3d(0, ${dy}px, 0) scale(1.02)`, 'important');

    if (itemMetrics.length <= 1) return;

    const currentCenter = draggedStartTop + (draggedHeight / 2) + dy;
    let newTarget = 0;
    for (let i = 0; i < itemMetrics.length; i++) {
      const m = itemMetrics[i];
      const mid = m.top + (m.height / 2);
      if (currentCenter > mid) {
        newTarget = i;
      }
    }
    newTarget = Math.max(0, Math.min(newTarget, itemMetrics.length - 1));

    if (newTarget !== toIdx) {
      toIdx = newTarget;
      const shiftDistance = (itemMetrics.length > 1 && Math.abs(itemMetrics[1].top - itemMetrics[0].top) > 0)
        ? Math.abs(itemMetrics[1].top - itemMetrics[0].top)
        : draggedHeight;

      const isPerf = typeof document !== 'undefined' && document.body && document.body.classList.contains('perf');
      itemMetrics.forEach(metric => {
        if (metric.el === draggedItem) return;
        if (fromIdx < toIdx) {
          if (metric.index > fromIdx && metric.index <= toIdx) {
            metric.el.style.setProperty('transform', `translate3d(0, -${shiftDistance}px, 0)`, 'important');
            metric.el.style.transition = isPerf ? '' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
          } else {
            metric.el.style.removeProperty('transform');
            metric.el.style.transition = isPerf ? '' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
          }
        } else if (fromIdx > toIdx) {
          if (metric.index >= toIdx && metric.index < fromIdx) {
            metric.el.style.setProperty('transform', `translate3d(0, ${shiftDistance}px, 0)`, 'important');
            metric.el.style.transition = isPerf ? '' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
          } else {
            metric.el.style.removeProperty('transform');
            metric.el.style.transition = isPerf ? '' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
          }
        } else {
          metric.el.style.removeProperty('transform');
          metric.el.style.transition = isPerf ? '' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
        }
      });
    }
  }

  function onScroll() {
    if (!isDragging) return;
    updatePosition();
  }

  function startDrag() {
    if (!draggedItem || isDragging) return;
    isDragging = true;
    suppressClick = true;

    scrollEl = findScrollParent(container);

    // Freeze the virtual list for the whole drag: a re-render while dragging
    // (e.g. triggered by auto-scroll) would replace the row being held and
    // snap everything back.
    container._isDraggingReorder = true;

    // Render more rows around the visible window so the track can be dragged
    // well beyond the screen, keeping the held row exactly where it was.
    if (typeof container._vExpand === 'function') {
      const before = draggedItem.getBoundingClientRect().top;
      try { container._vExpand(150); } catch (_) {}
      const after = draggedItem.getBoundingClientRect().top;
      if (scrollEl && after !== before) scrollEl.scrollTop += (after - before);
    }
    startScrollTop = scrollEl ? scrollEl.scrollTop : 0;

    container.dataset.isDraggingTrack = '1';
    container.style.userSelect = 'none';
    draggedItem.classList.add('is-dragging');

    try {
      if (activePointerId !== null && draggedItem.setPointerCapture) {
        draggedItem.setPointerCapture(activePointerId);
      }
    } catch (_) {}

    items = Array.from(container.querySelectorAll('.track-row'));
    fromIdx = items.indexOf(draggedItem);
    toIdx = fromIdx;
    draggedHeight = draggedItem.offsetHeight;
    draggedStartTop = draggedItem.offsetTop;

    itemMetrics = items.map((el, i) => ({
      el,
      index: i,
      top: el.offsetTop,
      height: el.offsetHeight
    }));

    minScroll = 0;
    maxScroll = Infinity;
    if (scrollEl && items.length) {
      const vr = viewportRect(scrollEl);
      const viewH = vr.bottom - vr.top;
      const firstTop = items[0].getBoundingClientRect().top - vr.top + scrollEl.scrollTop;
      const lastBottom = items[items.length - 1].getBoundingClientRect().bottom - vr.top + scrollEl.scrollTop;
      minScroll = firstTop - 90;
      maxScroll = Math.max(scrollEl.scrollTop, lastBottom - viewH + 90);
    }

    if (scrollEl) {
      scrollEl.addEventListener('scroll', onScroll, { passive: true });
    }
    rafId = requestAnimationFrame(autoScrollLoop);
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (isFilterActive && isFilterActive()) return;

    const item = e.target.closest('.track-row');
    if (!item || item.parentElement !== container) return;

    if (e.target.closest('button, input, select, textarea, a, .btn-icon-pill, .track-fav, .track-download-btn, .btn-rename-p, .btn-delete-p')) return;

    draggedItem = item;
    startX = e.clientX;
    startY = e.clientY;
    lastClientY = e.clientY;
    activePointerId = e.pointerId;
    isDragging = false;

    pressTimer = setTimeout(() => {
      startDrag();
    }, 250);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!draggedItem) return;
    lastClientY = e.clientY;

    if (!isDragging) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > 7) {
        clearTimeout(pressTimer);
        startDrag();
      } else {
        return;
      }
    }

    updatePosition();
  }

  function onPointerUp() {
    clearTimeout(pressTimer);
    if (rafId) cancelAnimationFrame(rafId);
    if (scrollEl) {
      scrollEl.removeEventListener('scroll', onScroll);
    }
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    delete container.dataset.isDraggingTrack;

    if (!draggedItem) return;

    const item = draggedItem;
    const currentActiveId = activePointerId;
    draggedItem = null;
    activePointerId = null;

    try {
      if (currentActiveId !== null && item.hasPointerCapture && item.hasPointerCapture(currentActiveId)) {
        item.releasePointerCapture(currentActiveId);
      }
    } catch (_) {}

    if (isDragging) {
      const isPerf = typeof document !== 'undefined' && document.body && document.body.classList.contains('perf');
      let targetSlotDy = 0;
      if (toIdx >= 0 && toIdx < itemMetrics.length && toIdx !== fromIdx) {
        targetSlotDy = itemMetrics[toIdx].top - draggedStartTop;
      }

      if (!isPerf) {
        item.style.transition = 'transform 160ms cubic-bezier(0.2, 0, 0, 1)';
      }
      item.style.setProperty('transform', `translate3d(0, ${targetSlotDy}px, 0) scale(1)`, 'important');

      setTimeout(() => {
        item.classList.remove('is-dragging');
        item.style.removeProperty('transform');
        item.style.transition = '';
        item.style.willChange = '';

        items.forEach(el => {
          el.style.removeProperty('transform');
          el.style.transition = '';
        });

        container.style.userSelect = '';
        container.classList.add('no-enter-anim');

        // Real list positions, captured before the DOM is touched.
        const fromReal = realIndex(items[fromIdx], fromIdx);
        const toReal = realIndex(items[toIdx], toIdx);
        const baseIndex = realIndex(items[0], 0);

        // Let the virtual list render again (the reorder callback re-renders).
        container._isDraggingReorder = false;

        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const currentChildren = Array.from(container.querySelectorAll('.track-row'));
          if (toIdx > fromIdx) {
            const targetEl = currentChildren[toIdx];
            if (targetEl) {
              container.insertBefore(item, targetEl.nextSibling);
            }
          } else {
            const targetEl = currentChildren[toIdx];
            if (targetEl) {
              container.insertBefore(item, targetEl);
            }
          }

          container.querySelectorAll('.track-row').forEach((r, i) => {
            r.dataset.trackIndex = String(baseIndex + i);
            const num = r.querySelector('.track-row-index');
            if (num) num.textContent = String(baseIndex + i + 1);
          });

          if (typeof onReorder === 'function') {
            onReorder(fromReal, toReal);
          }
        }

        setTimeout(() => { suppressClick = false; }, 80);
      }, isPerf ? 0 : 160);
    } else {
      suppressClick = false;
    }
  }

  container.addEventListener('pointerdown', onPointerDown);
}

const initTrackSort = enableTrackSort;

if (typeof window !== 'undefined') {
  window.enableTrackSort = enableTrackSort;
  window.initTrackSort = initTrackSort;
}

if (typeof module !== 'undefined') {
  module.exports = { TRACK_SORT_MODES, sortTracks, backfillAddedAt, enableTrackSort, initTrackSort };
}
