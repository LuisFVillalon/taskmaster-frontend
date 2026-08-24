import React from 'react';
import TasksStatsCard from './TasksStatsCard';
import NotesStatsCard from './NotesStatsCard';
import HabitsStatsCard from './HabitsStatsCard';
import type { StatsCardProps } from './types';

export type { StatsCardProps, TasksVariant, NotesVariant, HabitsVariant } from './types';
export { CardShell } from './CardShell';

const StatsCard: React.FC<StatsCardProps> = (props) => {
  if (props.variant === 'tasks') return <TasksStatsCard {...props} />;
  if (props.variant === 'notes') return <NotesStatsCard {...props} />;
  return <HabitsStatsCard {...props} />;
};

export default StatsCard;
