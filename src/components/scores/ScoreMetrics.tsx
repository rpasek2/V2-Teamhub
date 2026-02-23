import { useState, useEffect, useMemo } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import type { GymnastProfile, GymEvent } from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS, EVENT_FULL_NAMES } from '../../types';

interface ScoreMetricsProps {
    hubId: string;
    seasonId: string;
    gender: 'Female' | 'Male';
    isParent: boolean;
    linkedGymnasts: GymnastProfile[];
    levels: string[];
    genderGymnastIds: Set<string>;
}

interface RawScore {
    id: string;
    event: GymEvent;
    score: number;
    gymnast_profile_id: string;
    gymnast_level: string | null;
    competitions: {
        id: string;
        name: string;
        start_date: string;
    };
}

// Colors for each event line
const EVENT_COLORS: Record<string, string> = {
    vault: '#14b8a6',   // brand/teal
    bars: '#6366f1',    // indigo
    beam: '#f59e0b',    // amber
    floor: '#10b981',   // emerald
    pommel: '#8b5cf6',  // purple
    rings: '#ec4899',   // pink
    pbars: '#3b82f6',   // blue
    highbar: '#ef4444', // red
    all_around: '#0f172a', // slate-900
};

export function ScoreMetrics({ hubId, seasonId, gender, isParent, linkedGymnasts, levels, genderGymnastIds }: ScoreMetricsProps) {
    const [rawScores, setRawScores] = useState<RawScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGymnastId, setSelectedGymnastId] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [enabledEvents, setEnabledEvents] = useState<Set<string>>(new Set());

    const events: GymEvent[] = gender === 'Female' ? WAG_EVENTS : MAG_EVENTS;

    // Initialize enabled events + AA when gender changes
    useEffect(() => {
        setEnabledEvents(new Set([...events, 'all_around']));
    }, [gender]);

    // Auto-select first linked gymnast for parents
    useEffect(() => {
        if (isParent && linkedGymnasts.length > 0 && !selectedGymnastId) {
            setSelectedGymnastId(linkedGymnasts[0].id);
        }
    }, [isParent, linkedGymnasts, selectedGymnastId]);

    // Auto-select first level for coaches
    useEffect(() => {
        if (!isParent && levels.length > 0 && !selectedLevel) {
            setSelectedLevel(levels[0]);
        }
    }, [isParent, levels, selectedLevel]);

    // Fetch all scores for the season
    useEffect(() => {
        if (hubId && seasonId) {
            fetchScores();
        }
    }, [hubId, seasonId]);

    const fetchScores = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from('competition_scores')
            .select(`
                id, event, score, gymnast_profile_id, gymnast_level,
                competitions!inner(id, name, start_date)
            `)
            .eq('competitions.hub_id', hubId)
            .eq('competitions.season_id', seasonId);

        if (error) {
            console.error('Error fetching score metrics:', error);
        } else {
            setRawScores((data || []) as unknown as RawScore[]);
        }
        setLoading(false);
    };

    // For parents: filter to selected gymnast and build chart data
    const individualChartData = useMemo(() => {
        if (!isParent || !selectedGymnastId) return [];

        const gymnastScores = rawScores.filter(s => s.gymnast_profile_id === selectedGymnastId);

        // Group by competition (sorted by date)
        const byComp = new Map<string, { name: string; date: string; scores: RawScore[] }>();
        gymnastScores.forEach(s => {
            const compId = s.competitions.id;
            if (!byComp.has(compId)) {
                byComp.set(compId, {
                    name: s.competitions.name,
                    date: s.competitions.start_date,
                    scores: [],
                });
            }
            byComp.get(compId)!.scores.push(s);
        });

        return Array.from(byComp.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(comp => {
                const point: Record<string, string | number | null> = {
                    name: comp.name,
                    date: format(parseISO(comp.date), 'MMM d'),
                    fullDate: comp.date,
                };
                let aaTotal = 0;
                let aaCount = 0;
                events.forEach(event => {
                    const score = comp.scores.find(s => s.event === event);
                    point[event] = score?.score ?? null;
                    if (score?.score != null) {
                        aaTotal += score.score;
                        aaCount++;
                    }
                });
                point['all_around'] = aaCount === events.length ? aaTotal : null;
                return point;
            });
    }, [isParent, selectedGymnastId, rawScores, events]);

    // For coaches: filter to selected level + gender and build team score chart data
    const teamChartData = useMemo(() => {
        if (isParent || !selectedLevel) return [];

        const levelScores = rawScores.filter(s => s.gymnast_level === selectedLevel && genderGymnastIds.has(s.gymnast_profile_id));

        // Group by competition
        const byComp = new Map<string, { name: string; date: string; scores: RawScore[] }>();
        levelScores.forEach(s => {
            const compId = s.competitions.id;
            if (!byComp.has(compId)) {
                byComp.set(compId, {
                    name: s.competitions.name,
                    date: s.competitions.start_date,
                    scores: [],
                });
            }
            byComp.get(compId)!.scores.push(s);
        });

        return Array.from(byComp.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(comp => {
                const point: Record<string, string | number | null> = {
                    name: comp.name,
                    date: format(parseISO(comp.date), 'MMM d'),
                    fullDate: comp.date,
                };

                let teamAA = 0;
                events.forEach(event => {
                    const eventScores = comp.scores
                        .filter(s => s.event === event && s.score != null)
                        .map(s => s.score)
                        .sort((a, b) => b - a);

                    const top3 = eventScores.slice(0, 3);
                    const total = top3.reduce((sum, s) => sum + s, 0);
                    point[event] = top3.length > 0 ? Number(total.toFixed(3)) : null;
                    teamAA += total;
                });

                point['all_around'] = teamAA > 0 ? Number(teamAA.toFixed(3)) : null;
                return point;
            });
    }, [isParent, selectedLevel, rawScores, events, genderGymnastIds]);

    const chartData = isParent ? individualChartData : teamChartData;

    // Compute summary stats
    const summaryStats = useMemo(() => {
        const stats: Record<string, { high: number | null; avg: number | null; latest: number | null; trend: 'up' | 'down' | 'stable' | null }> = {};

        [...events, 'all_around' as GymEvent | 'all_around'].forEach(event => {
            const values = chartData
                .map(d => d[event])
                .filter((v): v is number => typeof v === 'number');

            if (values.length === 0) {
                stats[event] = { high: null, avg: null, latest: null, trend: null };
                return;
            }

            const high = Math.max(...values);
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            const latest = values[values.length - 1];

            let trend: 'up' | 'down' | 'stable' | null = null;
            if (values.length >= 2) {
                const last = values[values.length - 1];
                const prev = values[values.length - 2];
                if (last > prev) trend = 'up';
                else if (last < prev) trend = 'down';
                else trend = 'stable';
            }

            stats[event] = { high, avg: Number(avg.toFixed(3)), latest, trend };
        });

        return stats;
    }, [chartData, events]);

    const toggleEvent = (event: string) => {
        setEnabledEvents(prev => {
            const next = new Set(prev);
            if (next.has(event)) {
                next.delete(event);
            } else {
                next.add(event);
            }
            return next;
        });
    };

    const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' | null }) => {
        if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
        if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
        if (trend === 'stable') return <Minus className="w-3.5 h-3.5 text-slate-400" />;
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="rounded-full bg-slate-100 p-4">
                    <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No Score Data</h3>
                <p className="mt-2 text-sm text-slate-500">
                    {isParent
                        ? 'No competition scores found for this gymnast in the selected season.'
                        : 'No competition scores found for this level in the selected season.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-4">
                {isParent && linkedGymnasts.length > 1 && (
                    <div className="relative">
                        <select
                            value={selectedGymnastId || ''}
                            onChange={(e) => setSelectedGymnastId(e.target.value)}
                            className="block appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            {linkedGymnasts.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.first_name} {g.last_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                )}

                {!isParent && levels.length > 0 && (
                    <div className="relative">
                        <select
                            value={selectedLevel || ''}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="block appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            {levels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    {isParent ? 'Score History' : 'Team Score History'}
                </h3>
                <div className="h-72" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontSize: '13px',
                                }}
                                labelFormatter={(_, payload) => {
                                    if (payload && payload.length > 0) {
                                        const data = payload[0].payload;
                                        return `${data.name} — ${format(parseISO(data.fullDate), 'MMM d, yyyy')}`;
                                    }
                                    return '';
                                }}
                                formatter={((value: number, name: string) => {
                                    const label = name === 'all_around' ? 'AA' : EVENT_LABELS[name as GymEvent] || name;
                                    return [typeof value === 'number' ? value.toFixed(3) : '-', label];
                                }) as any}
                            />
                            {events.map(event => (
                                enabledEvents.has(event) && (
                                    <Line
                                        key={event}
                                        type="monotone"
                                        dataKey={event}
                                        stroke={EVENT_COLORS[event]}
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: EVENT_COLORS[event] }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                )
                            ))}
                            {enabledEvents.has('all_around') && (
                                <Line
                                    type="monotone"
                                    dataKey="all_around"
                                    stroke={EVENT_COLORS['all_around']}
                                    strokeWidth={2.5}
                                    strokeDasharray="5 5"
                                    dot={{ r: 4, fill: EVENT_COLORS['all_around'] }}
                                    activeDot={{ r: 6 }}
                                    connectNulls
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Event Toggles */}
            <div className="flex flex-wrap gap-2">
                {[...events, 'all_around' as GymEvent | 'all_around'].map(event => {
                    const isActive = enabledEvents.has(event);
                    const label = event === 'all_around' ? 'AA' : EVENT_LABELS[event];
                    const color = EVENT_COLORS[event];
                    return (
                        <button
                            key={event}
                            onClick={() => toggleEvent(event)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                isActive
                                    ? 'bg-white shadow-sm'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                            style={isActive ? { borderColor: color, color } : undefined}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: isActive ? color : '#cbd5e1' }}
                            />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[...events, 'all_around' as GymEvent | 'all_around'].map(event => {
                    const stat = summaryStats[event];
                    if (!stat || stat.high === null) return null;
                    const label = event === 'all_around' ? 'All-Around' : EVENT_FULL_NAMES[event];
                    const shortLabel = event === 'all_around' ? 'AA' : EVENT_LABELS[event];

                    return (
                        <div key={event} className="card p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase">{shortLabel}</span>
                                <TrendIcon trend={stat.trend} />
                            </div>
                            <p className="text-lg font-bold text-slate-900" title={label}>
                                {stat.latest?.toFixed(3)}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                <span>High: <span className="font-medium text-slate-700">{stat.high?.toFixed(3)}</span></span>
                                <span>Avg: <span className="font-medium text-slate-700">{stat.avg?.toFixed(3)}</span></span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
