import { DollarSign, Clock, Users, Calendar, Package } from 'lucide-react';
import type { CoachLessonProfile, Profile, LessonPackage } from '../../types';

// Event label mapping
const EVENT_LABELS: Record<string, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    pommel: 'Pommel Horse',
    rings: 'Rings',
    pbars: 'Parallel Bars',
    highbar: 'High Bar',
    all_around: 'All-Around',
    strength: 'Strength',
    flexibility: 'Flexibility',
};

interface CoachLessonCardProps {
    profile: CoachLessonProfile & { coach_profile?: Profile };
    packages?: LessonPackage[];
    onViewCalendar?: () => void;
}

export function CoachLessonCard({ profile, packages = [], onViewCalendar }: CoachLessonCardProps) {
    const coachName = profile.coach_profile?.full_name || 'Coach';
    const avatarUrl = profile.coach_profile?.avatar_url;

    // Use packages from props, or fall back to profile.packages
    const activePackages = (packages.length > 0 ? packages : profile.packages || [])
        .filter(p => p.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);

    const formatCost = (cost: number) => {
        if (cost === 0) return 'Free';
        return `$${cost.toFixed(0)}`;
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr`;
    };

    return (
        <div className="card p-5 hover:shadow-md transition-shadow">
            {/* Coach Info */}
            <div className="flex items-start gap-4 mb-4">
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={coachName}
                        className="w-14 h-14 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-lg font-semibold">
                        {coachName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{coachName}</h3>
                    {profile.bio && (
                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">{profile.bio}</p>
                    )}
                </div>
            </div>

            {/* Events */}
            <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Events</p>
                <div className="flex flex-wrap gap-1.5">
                    {profile.events.slice(0, 4).map(evt => (
                        <span
                            key={evt}
                            className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full"
                        >
                            {EVENT_LABELS[evt] || evt}
                        </span>
                    ))}
                    {profile.events.length > 4 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                            +{profile.events.length - 4}
                        </span>
                    )}
                </div>
            </div>

            {/* Levels */}
            <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Levels</p>
                <div className="flex flex-wrap gap-1.5">
                    {profile.levels.slice(0, 4).map(level => (
                        <span
                            key={level}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                        >
                            {level}
                        </span>
                    ))}
                    {profile.levels.length > 4 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                            +{profile.levels.length - 4}
                        </span>
                    )}
                </div>
            </div>

            {/* Packages or Legacy Pricing */}
            {activePackages.length > 0 ? (
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Lesson Options
                    </p>
                    <div className="space-y-2">
                        {activePackages.slice(0, 3).map(pkg => (
                            <div
                                key={pkg.id}
                                className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {pkg.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(pkg.duration_minutes)}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Users className="w-3 h-3" />
                                            {pkg.max_gymnasts === 1 ? '1 athlete' : `Up to ${pkg.max_gymnasts}`}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-brand-600 ml-2">
                                    {formatCost(pkg.price)}
                                </p>
                            </div>
                        ))}
                        {activePackages.length > 3 && (
                            <p className="text-xs text-slate-500 text-center">
                                +{activePackages.length - 3} more option{activePackages.length - 3 > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-100 mb-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                            <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {formatCost(profile.cost_per_lesson)}
                        </p>
                        <p className="text-xs text-slate-500">per lesson</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                            <Clock className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {formatDuration(profile.lesson_duration_minutes)}
                        </p>
                        <p className="text-xs text-slate-500">duration</p>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-0.5">
                            <Users className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {profile.max_gymnasts_per_slot}
                        </p>
                        <p className="text-xs text-slate-500">max</p>
                    </div>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={onViewCalendar}
                className="w-full btn-primary flex items-center justify-center gap-2"
            >
                <Calendar className="w-4 h-4" />
                View Available Times
            </button>
        </div>
    );
}
