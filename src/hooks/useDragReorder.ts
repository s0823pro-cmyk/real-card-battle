import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const LONG_PRESS_MS = 300;

interface Params {
  itemCount: number;
  onDrop: (from: number, to: number) => void;
  onTap: (index: number) => void;
  onDropToExternal?: (index: number, clientX: number, clientY: number) => boolean;
  disabled?: boolean;
}

export interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
}

export const useDragReorder = ({
  itemCount,
  onDrop,
  onTap,
  onDropToExternal,
  disabled = false,
}: Params) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dropTargetIndex: null,
  });
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pressedIndexRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const getDropIndex = (clientX: number): number | null => {
    const root = containerRef.current;
    if (!root || itemCount === 0) return null;
    const rect = root.getBoundingClientRect();
    const step = rect.width / itemCount;
    if (step <= 0) return null;
    const raw = Math.floor((clientX - rect.left) / step);
    return Math.max(0, Math.min(itemCount - 1, raw));
  };

  const bindSlotPointer = (index: number) => ({
    onPointerDown: (event: ReactPointerEvent) => {
      if (disabled) return;
      event.stopPropagation();
      pointerIdRef.current = event.pointerId;
      pressedIndexRef.current = index;
      const clientX = event.clientX;
      timerRef.current = window.setTimeout(() => {
        setDragState({
          isDragging: true,
          draggedIndex: index,
          dropTargetIndex: index,
        });
        setDragX(clientX);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event: ReactPointerEvent) => {
      if (!dragState.isDragging || pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      setDragX(event.clientX);
      setDragState((prev) => ({
        ...prev,
        dropTargetIndex: getDropIndex(event.clientX),
      }));
    },
    onPointerUp: (event: ReactPointerEvent) => {
      if (pointerIdRef.current !== event.pointerId || disabled) return;
      event.stopPropagation();
      clearTimer();
      if (dragState.isDragging) {
        const from = dragState.draggedIndex;
        const to = dragState.dropTargetIndex;
        if (from !== null) {
          const externalHandled = onDropToExternal?.(from, event.clientX, event.clientY) ?? false;
          if (!externalHandled && to !== null && from !== to) {
            onDrop(from, to);
          }
        }
      } else if (pressedIndexRef.current === index) {
        onTap(index);
      }

      setDragState({
        isDragging: false,
        draggedIndex: null,
        dropTargetIndex: null,
      });
      pointerIdRef.current = null;
      pressedIndexRef.current = null;
    },
    onPointerCancel: () => {
      clearTimer();
      setDragState({
        isDragging: false,
        draggedIndex: null,
        dropTargetIndex: null,
      });
      pointerIdRef.current = null;
      pressedIndexRef.current = null;
    },
  });

  return {
    dragState,
    dragX,
    containerRef,
    bindSlotPointer,
  };
};
