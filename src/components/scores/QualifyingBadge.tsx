import { Award, Trophy, Medal } from 'lucide-react';

export type QualifyingLevel = 'state' | 'regional' | 'national';

interface QualifyingBadgeProps {
    level: QualifyingLevel;
    size?: 'sm' | 'md';
    showLabel?: boolean;
}

const BADGE_CONFIG: Record<QualifyingLevel, {
    icon: typeof Award;
    label: string;
    shortLabel: string;
    bgColor: string;
    textColor: string;
    title: string;
}> = {
    state: {
        icon: Award,
        label: 'State',
        shortLabel: 'S',
        bgColor: 'bg-blue-500/15',
        textColor: 'text-blue-600',
        title: 'State Qualifier'
    },
    regional: {
        icon: Medal,
        label: 'Regional',
        shortLabel: 'R',
        bgColor: 'bg-purple-500/15',
        textColor: 'text-purple-600',
        title: 'Regional Qualifier'
    },
    national: {
        icon: Trophy,
        label: 'National',
        shortLabel: 'N',
        bgColor: 'bg-amber-500/15',
        textColor: 'text-amber-600',
        title: 'National Qualifier'
    }
};

export function QualifyingBadge({ level, size = 'sm', showLabel = false }: QualifyingBadgeProps) {
    const config = BADGE_CONFIG[level];
    const Icon = config.icon;

    const sizeClasses = size === 'sm'
        ? 'px-1.5 py-0.5 text-xs gap-0.5'
        : 'px-2 py-1 text-sm gap-1';

    const iconSize = size === 'sm' ? 12 : 14;

    return (
        <span
            className={`inline-flex items-center rounded-full font-semibold ${config.bgColor} ${config.textColor} ${sizeClasses}`}
            title={config.title}
        >
            <Icon className="flex-shrink-0" size={iconSize} />
            {showLabel && <span>{config.shortLabel}</span>}
        </span>
    );
}

interface QualifyingBadgesProps {
    levels: QualifyingLevel[];
    size?: 'sm' | 'md';
    showLabel?: boolean;
}

export function QualifyingBadges({ levels, size = 'sm', showLabel = false }: QualifyingBadgesProps) {
    if (levels.length === 0) return null;

    return (
        <div className="inline-flex items-center gap-0.5">
            {levels.map((level) => (
                <QualifyingBadge key={level} level={level} size={size} showLabel={showLabel} />
            ))}
        </div>
    );
}
