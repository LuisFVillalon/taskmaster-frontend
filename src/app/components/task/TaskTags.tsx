import React from 'react';

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

const TaskTags: React.FC<TaskTagsProps> = ({ tags, allTags, className = '' }) => {
  if (!tags?.length) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {tags.map((tag, i) => {
        const color = allTags.find(t => t.name === tag.name)?.color ?? 'var(--tm-accent)';
        return (
          <span
            key={i}
            className="chip px-2 py-1"
            style={{
              backgroundColor: color,
              color: 'white',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            {tag.name}
          </span>
        );
      })}
    </div>
  );
};

export default TaskTags;
