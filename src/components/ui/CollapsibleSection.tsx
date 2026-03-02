import { useState } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
    defaultOpen?: boolean;
    actions?: React.ReactNode;
    description?: string;
}

export function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    actions,
    description,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-surface shadow-sm rounded-lg overflow-hidden border border-line">
            {/* Header - Always visible */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-hover transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-100 rounded-lg">
                        <Icon className="h-5 w-5 text-accent-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-heading">{title}</h2>
                        {description && !isOpen && (
                            <p className="text-sm text-muted mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-faint" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-faint" />
                    )}
                </div>
            </button>

            {/* Content - Collapsible */}
            {isOpen && (
                <div className="border-t border-line">
                    {/* Actions bar */}
                    {actions && (
                        <div className="flex justify-end gap-2 px-6 py-3 bg-surface border-b border-line">
                            {actions}
                        </div>
                    )}
                    <div className="p-6 pt-4">
                        {description && (
                            <p className="text-sm text-muted mb-4">{description}</p>
                        )}
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
