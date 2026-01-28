import type { LucideIcon } from 'lucide-react';

interface ToggleSwitchProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: () => void;
    icon?: LucideIcon;
    iconBgColor?: string;
    iconColor?: string;
    disabled?: boolean;
}

export function ToggleSwitch({
    label,
    description,
    checked,
    onChange,
    icon: Icon,
    iconBgColor = 'bg-slate-100',
    iconColor = 'text-slate-600',
    disabled = false,
}: ToggleSwitchProps) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className={`p-2 ${iconBgColor} rounded-lg`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                )}
                <div>
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    {description && (
                        <p className="text-xs text-slate-500">{description}</p>
                    )}
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={onChange}
                disabled={disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    checked ? 'bg-brand-600' : 'bg-slate-200'
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}
