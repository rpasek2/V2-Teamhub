import type { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
    title: string;
    icon: LucideIcon;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'danger';
}

export function SettingsCard({ title, icon: Icon, description, actions, children, variant = 'default' }: SettingsCardProps) {
    return (
        <div className={`bg-surface shadow-sm rounded-lg overflow-hidden border ${
            variant === 'danger' ? 'border-red-500/30' : 'border-line'
        }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
                variant === 'danger' ? 'border-red-500/20' : 'border-line'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-500/10' : 'bg-accent-500/10'}`}>
                        <Icon className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600' : 'text-accent-600'}`} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-heading">{title}</h3>
                        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
                    </div>
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}
