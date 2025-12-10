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
            {/* Backdrop with glassmorphism */}
            <div
                className="fixed inset-0 bg-canopy-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal container */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={clsx(
                    "relative w-full transform rounded-xl bg-paper-white shadow-xl transition-all animate-scale-in",
                    "border border-mithril-200",
                    sizeClasses[size]
                )}
            >
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-canopy-500 via-canopy-400 to-arcane-500" />

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between border-b border-mithril-100 px-6 py-4">
                        <h3 className="font-display text-lg font-semibold text-mithril-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className={clsx(
                                "rounded-lg p-2 text-mithril-400 transition-all duration-150",
                                "hover:bg-mithril-100 hover:text-mithril-600",
                                "focus:outline-none focus:ring-2 focus:ring-canopy-500/50"
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

                {/* Subtle corner accents */}
                <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-mithril-100 rounded-br-lg pointer-events-none opacity-50" />
            </div>
        </div>,
        document.body
    );
}
