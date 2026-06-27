import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the function only once after the delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses the most recent arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced("a");
    debounced("b");
    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledWith("b");
  });

  it("can be cancelled before firing", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();
  });
});
