// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/viewpoints" }));

import { DiagramPlayback } from "@/components/DiagramPlayback";

/**
 * The Viewpoints figures are SMIL loops that start at document load, so a
 * reader reaching the ninth one joined it mid-loop. DiagramPlayback holds each
 * animated diagram on its first frame and releases it, from zero, when it is
 * fully in view (2026-09-27). jsdom has the SVG element but not its timeline
 * or an IntersectionObserver, so both are stood in for here; what is checked
 * is the sequence — paused and rewound on mount, released once from zero when
 * the whole figure intersects, never released under reduced motion — and
 * that a diagram with no animation in it is left alone.
 */
type Entry = Pick<IntersectionObserverEntry, "isIntersecting" | "target">;
type Callback = (entries: Entry[]) => void;

const observers: {
  callback: Callback;
  threshold: number;
  target: Element | null;
  disconnect: () => void;
}[] = [];

class FakeObserver {
  private record: (typeof observers)[number];
  constructor(callback: Callback, init: { threshold: number }) {
    this.record = { callback, threshold: init.threshold, target: null, disconnect: vi.fn() };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.target = target;
  }
  unobserve() {}
  disconnect() {
    this.record.disconnect();
  }
}

const timeline = {
  pause: vi.fn(),
  unpause: vi.fn(),
  setTime: vi.fn(),
};

function figure(cls: string, animated: boolean) {
  return `<svg class="${cls}" role="img" viewBox="0 0 10 10">${animated ? '<circle r="1"><animate attributeName="cx" values="1;2"/></circle>' : '<circle r="1"/>'}</svg>`;
}

function mount(reduced = false) {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: reduced }) as unknown as typeof window.matchMedia;
  document.body.innerHTML =
    figure("dg dg-beside dg-card", true) + figure("dg dg-card", true) + figure("dg", false);
  render(<DiagramPlayback />);
  return [...document.querySelectorAll<SVGSVGElement>("svg.dg")];
}

describe("DiagramPlayback", () => {
  beforeEach(() => {
    observers.length = 0;
    for (const fn of Object.values(timeline)) fn.mockClear();
    Object.defineProperty(window, "IntersectionObserver", {
      value: FakeObserver,
      configurable: true,
      writable: true,
    });
    for (const [name, fn] of [
      ["pauseAnimations", timeline.pause],
      ["unpauseAnimations", timeline.unpause],
      ["setCurrentTime", timeline.setTime],
    ] as const) {
      Object.defineProperty(window.SVGSVGElement.prototype, name, {
        value: fn,
        configurable: true,
        writable: true,
      });
    }
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("holds every animated diagram on its first frame at mount, and only those", () => {
    const [beside, block, still] = mount();
    expect(timeline.pause).toHaveBeenCalledTimes(2);
    expect(timeline.setTime).toHaveBeenCalledTimes(2);
    expect(timeline.setTime).toHaveBeenCalledWith(0);
    expect(timeline.unpause).not.toHaveBeenCalled();
    // One observer a figure, watching for the whole of it.
    expect(observers.map((o) => o.target)).toEqual([beside, block]);
    expect(observers.every((o) => o.threshold > 0.9 && o.threshold <= 1)).toBe(true);
    expect(observers.some((o) => o.target === still)).toBe(false);
  });

  it("releases a figure from zero when the whole of it is in view, once", () => {
    const [beside, block] = mount();
    const [first, second] = observers;
    first.callback([{ isIntersecting: false, target: beside }]);
    expect(timeline.unpause).not.toHaveBeenCalled();

    first.callback([{ isIntersecting: true, target: beside }]);
    expect(timeline.unpause).toHaveBeenCalledTimes(1);
    expect(timeline.setTime).toHaveBeenCalledTimes(3);
    expect(timeline.setTime.mock.calls.at(-1)).toEqual([0]);
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    // The other figure is still held.
    expect(second.disconnect).not.toHaveBeenCalled();
    second.callback([{ isIntersecting: true, target: block }]);
    expect(timeline.unpause).toHaveBeenCalledTimes(2);
  });

  it("leaves the first frame as the whole figure under reduced motion", () => {
    mount(true);
    expect(timeline.pause).toHaveBeenCalledTimes(2);
    expect(observers).toHaveLength(0);
    expect(timeline.unpause).not.toHaveBeenCalled();
  });
});
