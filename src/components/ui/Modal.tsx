import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            // Focus the modal for accessibility
            modalRef.current?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop - light with blur */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal container */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={clsx(
                    "relative w-full transform rounded-xl bg-white shadow-xl transition-all animate-scale-in",
                    "border border-slate-200",
                    sizeClasses[size]
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className={clsx(
                                "rounded-lg p-2 text-slate-400 transition-all duration-150",
                                "hover:bg-slate-100 hover:text-slate-900",
                                "focus:outline-none focus:ring-2 focus:ring-mint-500/50"
                            )}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
