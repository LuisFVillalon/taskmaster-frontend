import React from 'react';
import TagChipList from '@/app/components/common/TagChipList';

interface TagRef {
  id: number;
  name: string;
  color?: string;
}

interface TaskTagsProps {
  tags: TagRef[];
  allTags: Array<{ id: number; name: string; color: string }>;
  className?: string;
}

// Re-resolves each tag's color against the live `allTags` list by id (not
// the color already on `tags`, which can go stale if a tag's color was
// edited after this task's tags were fetched) before handing off to the
// shared chip renderer.
const TaskTags: React.FC<TaskTagsProps> = ({ tags, allTags, className = '' }) => {
  const resolved = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: allTags.find(t => t.id === tag.id)?.color ?? tag.color ?? 'var(--tm-accent)',
  }));

  return <TagChipList tags={resolved} size="sm" className={className} />;
};

export default TaskTags;
