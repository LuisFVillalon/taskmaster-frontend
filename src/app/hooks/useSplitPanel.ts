import React, { useRef, useState } from 'react';
import { useResizableSplit } from '@/app/hooks/useResizableSplit';

export const useSplitPanel = () => {
  const [tasksWidthPct, setTasksWidthPct] = useState(50);
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

  return {
    tasksWidthPct,
    splitContainerRef,
    handleSplitterMouseDown,
  };
};
