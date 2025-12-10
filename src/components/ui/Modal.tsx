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
            {/* Backdrop - obsidian with slight blur */}
            <div
                className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal container */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className={clsx(
                    "relative w-full transform rounded-lg bg-white shadow-xl transition-all animate-slide-up",
                    "border border-tungsten-200",
                    sizeClasses[size]
                )}
            >
                {/* Velocity accent line at top */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-velocity-600 via-velocity-500 to-velocity-600" />

                {/* Header - obsidian dark */}
                {title && (
                    <div className="flex items-center justify-between bg-obsidian-900 px-6 py-4 rounded-t-lg">
                        <h3 className="font-display text-sm font-semibold text-white uppercase tracking-wider">{title}</h3>
                        <button
                            onClick={onClose}
                            className={clsx(
                                "rounded-md p-1.5 text-obsidian-400 transition-all duration-150",
                                "hover:bg-obsidian-800 hover:text-white",
                                "focus:outline-none focus:ring-2 focus:ring-velocity-500/50",
                                "active:scale-95"
                            )}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 bg-white">
                    {children}
                </div>

                {/* Grid pattern overlay for structural feel */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] grid-pattern rounded-lg" />
            </div>
        </div>,
        document.body
    );
}
