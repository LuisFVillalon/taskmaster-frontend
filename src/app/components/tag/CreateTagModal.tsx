import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { NewTag } from '@/app/types/task';
import { THEME_ACCENT_COLORS } from '@/app/lib/theme';
import ColorSwatchPicker from '@/app/components/common/ColorSwatchPicker';
import Modal from '@/app/components/common/Modal';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTag: NewTag;
  onTagChange: (tag: NewTag) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}

const CreateTagModal: React.FC<CreateTagModalProps> = ({
  isOpen,
  onClose,
  newTag,
  onTagChange,
  onSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} layer="top">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-border-subtle flex justify-between items-center"
        style={{ backgroundColor: 'var(--tm-surface)' }}
      >
        <h3 className="text-lg font-semibold text-text-primary">Create a Tag</h3>
        <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Tag Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Tag Name</label>
          <input
            type="text"
            value={newTag.name}
            onChange={(e) => onTagChange({ ...newTag, name: e.target.value })}
            className="input-field"
            placeholder="e.g. Work"
            required
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Color</label>
          <ColorSwatchPicker
            colors={THEME_ACCENT_COLORS}
            value={newTag.color}
            onChange={(hex) => onTagChange({ ...newTag, color: hex })}
          />
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Preview:</span>
          <span
            className="chip text-white font-medium px-2"
            style={{
              backgroundColor: newTag.color,
              borderRadius: '9999px'
            }}
          >
            {newTag.name || 'Tag'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-secondary flex-1 py-2">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1 py-2 flex items-center justify-center gap-1.5">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Creating…' : 'Create Tag'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTagModal;
