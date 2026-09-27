"use client";

import {
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// Movement (in px) that counts as a drag rather than a tap.
const MOVE_THRESHOLD = 8;
// How long a shift card must be held before it can be dragged.
const HOLD_MS = 400;

export type DayDrag<T> = {
  item: T;
  x: number;
  y: number;
  // The day column currently under the pointer, if any.
  overDate: string | null;
};

// Day columns mark themselves with data-drop-date="YYYY-MM-DD".
function dateAt(x: number, y: number): string | null {
  const element = document.elementFromPoint(x, y);
  return (
    element?.closest<HTMLElement>("[data-drop-date]")?.dataset.dropDate ?? null
  );
}

// While dragging, stop the page scrolling under the finger.
function preventTouchScroll(event: TouchEvent) {
  if (event.cancelable) event.preventDefault();
}

type Press<T> = {
  item: T;
  element: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  dragging: boolean;
  timer?: number;
};

// Drag something onto a day column. Built on pointer events, so the same
// code handles touch (iPad) and mouse, with no drag-and-drop library.
//
// Two ways a drag can start:
// - "move": as soon as the pointer moves. Used for position chips, which
//   set touch-action: none so the page doesn't scroll instead.
// - "hold": press and hold, then move. Used for shift cards, so a quick
//   swipe still scrolls the page and a quick tap still opens the card.
export function useDayDrag<T>(
  onDrop: (item: T, date: string) => void,
  start: "move" | "hold"
) {
  const [drag, setDrag] = useState<DayDrag<T> | null>(null);
  const press = useRef<Press<T> | null>(null);
  const justDragged = useRef(false);

  const endPress = useCallback(() => {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    document.removeEventListener("touchmove", preventTouchScroll);
    press.current = null;
    setDrag(null);
  }, []);

  const beginDrag = useCallback((current: Press<T>) => {
    current.dragging = true;
    try {
      current.element.setPointerCapture(current.pointerId);
    } catch {
      // The pointer is already gone; the next pointer event ends the press.
    }
    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    setDrag({
      item: current.item,
      x: current.x,
      y: current.y,
      overDate: dateAt(current.x, current.y),
    });
  }, []);

  // Don't leave the scroll blocker behind if the page unmounts mid-drag.
  useEffect(() => endPress, [endPress]);

  const handlersFor = useCallback(
    (item: T) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        justDragged.current = false;
        const current: Press<T> = {
          item,
          element: event.currentTarget,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          dragging: false,
        };
        press.current = current;
        if (start === "move") {
          // Keep receiving moves even if a fast drag leaves the chip.
          event.currentTarget.setPointerCapture(event.pointerId);
        } else {
          current.timer = window.setTimeout(() => {
            if (press.current === current) beginDrag(current);
          }, HOLD_MS);
        }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = press.current;
        if (!current || current.pointerId !== event.pointerId) return;
        current.x = event.clientX;
        current.y = event.clientY;

        if (!current.dragging) {
          const moved =
            Math.hypot(
              current.x - current.startX,
              current.y - current.startY
            ) >= MOVE_THRESHOLD;
          if (!moved) return;
          // Moving before the hold finished means scrolling, not dragging.
          if (start === "hold") endPress();
          else beginDrag(current);
          return;
        }

        setDrag({
          item: current.item,
          x: current.x,
          y: current.y,
          overDate: dateAt(current.x, current.y),
        });
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const current = press.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const wasDragging = current.dragging;
        endPress();
        if (!wasDragging) return;
        justDragged.current = true;
        const date = dateAt(event.clientX, event.clientY);
        if (date) onDrop(current.item, date);
      },
      onPointerCancel: () => endPress(),
      // Stops the long-press menu (iPad callout, right-click menu).
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (start === "hold") event.preventDefault();
      },
    }),
    [start, beginDrag, endPress, onDrop]
  );

  // A drag ends with a click on the item; this lets the item ignore it so a
  // drag doesn't also count as a tap.
  const consumeDragClick = useCallback(() => {
    if (!justDragged.current) return false;
    justDragged.current = false;
    return true;
  }, []);

  return { drag, handlersFor, consumeDragClick };
}

export type DayDragHandlers<T> = ReturnType<
  typeof useDayDrag<T>
>["handlersFor"];
