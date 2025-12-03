import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface StandardModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
};

export function StandardModal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'lg'
}: StandardModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative z-[10000] w-full ${maxWidthClasses[maxWidth]} rounded-lg bg-white p-6 shadow-xl`}>
                {/* Close Button */}
                <div className="absolute top-4 right-4">
                    <button
                        type="button"
                        className="rounded-md text-slate-400 hover:text-slate-500"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-medium text-slate-900 pr-8" id="modal-title">
                    {title}
                </h3>

                {/* Content */}
                <div className="mt-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
