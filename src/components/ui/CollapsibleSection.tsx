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
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-slate-200">
            {/* Header - Always visible */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-mint-100 rounded-lg">
                        <Icon className="h-5 w-5 text-mint-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
                        {description && !isOpen && (
                            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Content - Collapsible */}
            {isOpen && (
                <div className="border-t border-slate-200">
                    {/* Actions bar */}
                    {actions && (
                        <div className="flex justify-end gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200">
                            {actions}
                        </div>
                    )}
                    <div className="p-6 pt-4">
                        {description && (
                            <p className="text-sm text-slate-500 mb-4">{description}</p>
                        )}
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}
