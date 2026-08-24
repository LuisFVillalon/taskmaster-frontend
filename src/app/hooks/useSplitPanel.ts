import React, { useRef, useState } from 'react';
import { useResizableSplit } from '@/app/hooks/useResizableSplit';

const MIN_PANEL_HEIGHT = 220;
const MAX_PANEL_HEIGHT = 1000;

export const useSplitPanel = () => {
  const [tasksWidthPct, setTasksWidthPct] = useState(50);
  const [panelHeightPx, setPanelHeightPx] = useState<number | null>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const handleSplitterMouseDown = useResizableSplit(
    splitContainerRef as React.RefObject<HTMLElement>,
    {
      anchor: 'left',
      onResize: (px) => {
        if (!splitContainerRef.current) return;
        const { width } = splitContainerRef.current.getBoundingClientRect();
        setTasksWidthPct(Math.min(95, Math.max(5, (px / width) * 100)));
      },
    },
  );
  const handleHeightSplitterMouseDown = useResizableSplit(
    splitContainerRef as React.RefObject<HTMLElement>,
    {
      anchor: 'top',
      min: MIN_PANEL_HEIGHT,
      max: MAX_PANEL_HEIGHT,
      onResize: setPanelHeightPx,
    },
  );

  return {
    tasksWidthPct,
    panelHeightPx,
    splitContainerRef,
    handleSplitterMouseDown,
    handleHeightSplitterMouseDown,
  };
};
