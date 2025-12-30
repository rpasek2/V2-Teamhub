import { clsx } from 'clsx';

interface ProgressBarProps {
    completed: number;
    total: number;
    showLabel?: boolean;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ProgressBar({
    completed,
    total,
    showLabel = true,
    showPercentage = false,
    size = 'md',
    className
}: ProgressBarProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isComplete = completed === total && total > 0;

    const heightClass = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3'
    }[size];

    return (
        <div className={clsx('flex items-center gap-3', className)}>
            <div className={clsx('flex-1 bg-slate-200 rounded-full overflow-hidden', heightClass)}>
                <div
                    className={clsx(
                        'h-full transition-all duration-300 rounded-full',
                        isComplete
                            ? 'bg-gradient-to-r from-success-500 to-mint-500'
                            : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className={clsx(
                    'text-sm font-medium flex-shrink-0',
                    isComplete ? 'text-success-400' : 'text-slate-400'
                )}>
                    {showPercentage ? `${percentage}%` : `${completed}/${total}`}
                </span>
            )}
        </div>
    );
}

interface ProgressRingProps {
    completed: number;
    total: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export function ProgressRing({
    completed,
    total,
    size = 48,
    strokeWidth = 4,
    className
}: ProgressRingProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isComplete = completed === total && total > 0;

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={clsx('relative inline-flex items-center justify-center', className)}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-slate-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={clsx(
                        'transition-all duration-300',
                        isComplete ? 'text-success-500' : 'text-mint-500'
                    )}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={clsx(
                    'text-xs font-bold',
                    isComplete ? 'text-success-600' : 'text-slate-700'
                )}>
                    {percentage}%
                </span>
            </div>
        </div>
    );
}
