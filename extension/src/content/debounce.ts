// Tiny debounce helper. Pure aside from the timer it owns, so it can be tested
// with fake timers. The returned function delays invoking `fn` until `ms` have
// elapsed since the last call; the most recent arguments win.

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Cancel any pending invocation. */
  cancel(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
