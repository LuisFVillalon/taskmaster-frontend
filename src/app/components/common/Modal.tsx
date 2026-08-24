'use client';

// Shared chrome for every modal/overlay in the app: backdrop, Escape-to-close,
// backdrop-click-to-close, and a single named z-index scale. Consolidates
// what used to be ~14 independently hand-rolled backdrop divs (each with its
// own ad-hoc z-50/z-[60]/z-[70]/z-[80] literal and inconsistent Escape/
// backdrop-click support) into one place. Deliberately owns only the
// structural chrome, not header/footer markup — each modal's internal layout
// varies enough (title size, extra header actions, footer buttons) that
// forcing a single header component would risk visual drift; this component
// only changes *how modals open/close/stack*, not how they look inside.

import React, { useEffect } from 'react';

/**
 * Named z-index tiers, replacing the z-50/z-[60]/z-[70]/z-[80] literals that
 * were previously picked ad hoc per file. Values are unchanged from what was
 * already in use — this only gives them one shared source of truth so a new
 * modal that needs to stack above another has an obvious tier to reach for.
 */
export const MODAL_LAYER = {
  /** Standalone modals opened directly from the main UI (tasks, settings). */
  base: 50,
  /** Modals opened from within another modal or a sidebar action. */
  raised: 60,
  /** Modals opened from within a "raised" modal (e.g. habit history from manage-habits). */
  elevated: 70,
  /** Confirmation dialogs and modals nested two levels deep. */
  top: 80,
} as const;

export type ModalLayer = keyof typeof MODAL_LAYER;

interface ModalProps {
  onClose: () => void;
  /** Which z-index tier this modal renders at. Default 'base' (z-50). */
  layer?: ModalLayer;
  /**
   * 'fixed' covers the full viewport (the vast majority of modals).
   * 'absolute' fills the nearest positioned ancestor instead — used for
   * overlays that are scoped to one panel (e.g. the notes tag-folder view)
   * rather than the whole page.
   */
  position?: 'fixed' | 'absolute';
  /** Closes on Escape. Default true. */
  closeOnEscape?: boolean;
  /** Closes when the backdrop (not the panel) is clicked. Default true. */
  closeOnBackdropClick?: boolean;
  /** Classes for the panel element. Each call site keeps its own sizing/overflow. */
  panelClassName?: string;
  /** Extra classes for the backdrop element itself. */
  overlayClassName?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  onClose,
  layer = 'base',
  position = 'fixed',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  panelClassName = 'modal-panel max-w-sm w-full',
  overlayClassName = '',
  children,
}) => {
  useEffect(() => {
    if (!closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, closeOnEscape]);

  return (
    <div
      className={`modal-overlay ${position} inset-0 flex items-center justify-center p-4 ${overlayClassName}`}
      style={{ zIndex: MODAL_LAYER[layer] }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div className={panelClassName} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
