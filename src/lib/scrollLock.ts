/**
 * One reference-counted body scroll lock, shared by every overlay.
 *
 * Overlays stack: the search sheet opens over a product page, a product opens
 * over another product mid-transition. When each overlay owned its own lock,
 * whichever unmounted FIRST wiped the shared body styles — so the page behind
 * a still-open overlay started scrolling again, and the saved scroll position
 * was lost (you got dumped at the top on close).
 *
 * Counting fixes the ordering: the first lock captures the scroll position and
 * pins <body>; nested locks only bump the count; the page is released — and
 * the scroll restored — when the LAST holder lets go, whatever order they
 * unmount in.
 */
let holders = 0;
let savedY = 0;

/** Pin the page. Returns the release function; calling it twice is a no-op. */
export function lockScroll(): () => void {
  if (holders === 0) {
    savedY = window.scrollY;
    const b = document.body;
    // Compensate for the scrollbar's disappearance so the page doesn't jump.
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    b.style.position = "fixed";
    b.style.top = `-${savedY}px`;
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
    if (scrollbarW > 0) b.style.paddingRight = `${scrollbarW}px`;
  }
  holders++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders > 0) return;
    const b = document.body;
    b.style.position = "";
    b.style.top = "";
    b.style.left = "";
    b.style.right = "";
    b.style.width = "";
    b.style.paddingRight = "";
    window.scrollTo(0, savedY);
  };
}
