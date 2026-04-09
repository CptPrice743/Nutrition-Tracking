import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
};

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 560 }: Props): JSX.Element | null => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: '88dvh',
          background: 'var(--surface-container)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-float)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            flexShrink: 0
          }}
        >
          <h2
            id="modal-title"
            className="title"
            style={{ margin: 0 }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--surface-container-low)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              transition: 'background var(--transition)'
            }}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 4px'
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '16px 20px 20px',
              flexShrink: 0
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
