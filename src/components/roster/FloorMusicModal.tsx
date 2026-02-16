import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Music, Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRoleChecks } from '../../hooks/useRoleChecks';

interface FloorMusicGymnast {
    id: string;
    first_name: string;
    last_name: string;
    level: string;
    floor_music_url: string;
    floor_music_name: string | null;
}

interface FloorMusicModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    levels: string[];
}

export function FloorMusicModal({ isOpen, onClose, hubId, levels }: FloorMusicModalProps) {
    const { isStaff } = useRoleChecks();
    const [gymnasts, setGymnasts] = useState<FloorMusicGymnast[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchFloorMusic();
            setSearchTerm('');
            setCollapsedLevels(new Set());
        }
    }, [isOpen, hubId]);

    const fetchFloorMusic = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level, floor_music_url, floor_music_name')
            .eq('hub_id', hubId)
            .not('floor_music_url', 'is', null)
            .order('level')
            .order('last_name');

        if (error) {
            console.error('Error fetching floor music:', error);
        } else {
            setGymnasts((data || []) as FloorMusicGymnast[]);
        }
        setLoading(false);
    };

    const filtered = useMemo(() => {
        if (!searchTerm) return gymnasts;
        const q = searchTerm.toLowerCase();
        return gymnasts.filter(g =>
            `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
        );
    }, [gymnasts, searchTerm]);

    const groupedByLevel = useMemo(() => {
        const groups: Record<string, FloorMusicGymnast[]> = {};
        // Initialize with hub levels order
        for (const level of levels) {
            groups[level] = [];
        }
        for (const g of filtered) {
            if (!groups[g.level]) groups[g.level] = [];
            groups[g.level].push(g);
        }
        // Remove empty levels
        return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0));
    }, [filtered, levels]);

    const toggleLevel = (level: string) => {
        setCollapsedLevels(prev => {
            const next = new Set(prev);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
        });
    };

    if (!isOpen || !isStaff) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="card p-0 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Music className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">All Floor Music</h2>
                            <p className="text-sm text-slate-500">{gymnasts.length} gymnast{gymnasts.length !== 1 ? 's' : ''} with floor music</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading...</div>
                    ) : Object.keys(groupedByLevel).length === 0 ? (
                        <div className="text-center py-8">
                            <Music className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">
                                {searchTerm ? 'No results found' : 'No floor music uploaded yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedByLevel).map(([level, levelGymnasts]) => (
                                <div key={level} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleLevel(level)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {collapsedLevels.has(level) ? (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="text-sm font-semibold text-slate-900">{level}</span>
                                            <span className="text-xs text-slate-500">({levelGymnasts.length})</span>
                                        </div>
                                    </button>
                                    {!collapsedLevels.has(level) && (
                                        <div className="divide-y divide-slate-100">
                                            {levelGymnasts.map(g => (
                                                <div key={g.id} className="px-4 py-3">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {g.first_name} {g.last_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                {g.floor_music_name || 'Floor Music'}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={g.floor_music_url}
                                                            download={g.floor_music_name || `${g.first_name}-${g.last_name}-floor-music`}
                                                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
                                                            title="Download"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                    <audio
                                                        controls
                                                        src={g.floor_music_url}
                                                        className="w-full h-9"
                                                        preload="metadata"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
