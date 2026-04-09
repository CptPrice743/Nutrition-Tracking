import { type ReactNode } from 'react';

import CommonModal from '../common/Modal';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

// Re-export common Modal to keep backward-compat with existing imports
const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps): JSX.Element | null => (
  <CommonModal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
    {children}
  </CommonModal>
);

export default Modal;
