'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './Modal.module.scss';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
}

const Modal = ({ children, onClose }: ModalProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.setAttribute('id', 'modal-root');
      document.body.appendChild(root);
    }
    setPortalRoot(root);

    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close modal on ESC key press for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!portalRoot) return null;

  // Use React Portal to render the modal outside the main app DOM hierarchy,
  // ensuring it overlays other content correctly and avoids Z-index/overflow issues.
  return ReactDOM.createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1} // make div focusable to catch keydown
      aria-modal="true"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal" autoFocus>
          ×
        </button>
        {children}
      </div>
    </div>,
    portalRoot,
  );
};

export default Modal;
