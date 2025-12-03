import { format, parseISO } from 'date-fns';
import { Cake, Trophy, ArrowRight, Trash2, MoreVertical, Star, Heart, X } from 'lucide-react';
import { useState } from 'react';
import type { GymnastProfile } from '../../types';
import type { GroupedPairing } from '../../pages/Mentorship';

interface PairingCardProps {
    groupedPairing: GroupedPairing;
    onDeleteLittle?: (pairingId: string) => void;
    onDeleteGroup?: (bigGymnastId: string) => void;
}

function BigGymnastInfo({
    gymnast,
    nextCompetition
}: {
    gymnast: GymnastProfile;
    nextCompetition?: { name: string; start_date: string } | null;
}) {
    if (!gymnast) return null;

    const fullName = `${gymnast.first_name} ${gymnast.last_name}`;
    const formattedBirthday = gymnast.date_of_birth
        ? format(parseISO(gymnast.date_of_birth), 'MMM d')
        : null;
    const formattedCompDate = nextCompetition?.start_date
        ? format(parseISO(nextCompetition.start_date), 'MMM d')
        : null;

    return (
        <div className="text-center min-w-0">
            {/* Role Badge */}
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-purple-600 text-white">
                <Star className="h-2.5 w-2.5" />
                BIG
            </div>

            {/* Name */}
            <div className="font-semibold text-slate-900 text-sm mt-1">
                {fullName}
            </div>

            {/* Level */}
            <div className="text-xs text-slate-600">
                {gymnast.level}
            </div>

            {/* Birthday & Competition inline */}
            <div className="flex items-center justify-center gap-2 mt-1 text-[10px]">
                {formattedBirthday && (
                    <span className="flex items-center gap-0.5 text-purple-600">
                        <Cake className="h-2.5 w-2.5" />
                        {formattedBirthday}
                    </span>
                )}
                {nextCompetition && formattedCompDate && (
                    <span className="flex items-center gap-0.5 text-purple-600">
                        <Trophy className="h-2.5 w-2.5" />
                        {formattedCompDate}
                    </span>
                )}
            </div>
        </div>
    );
}

function LittleGymnastChip({
    gymnast,
    nextCompetition,
    onDelete
}: {
    gymnast: GymnastProfile;
    nextCompetition?: { name: string; start_date: string } | null;
    onDelete?: () => void;
}) {
    if (!gymnast) return null;

    const fullName = `${gymnast.first_name} ${gymnast.last_name}`;
    const formattedBirthday = gymnast.date_of_birth
        ? format(parseISO(gymnast.date_of_birth), 'MMM d')
        : null;
    const formattedCompDate = nextCompetition?.start_date
        ? format(parseISO(nextCompetition.start_date), 'MMM d')
        : null;

    return (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-2 text-center relative group">
            {/* Name with inline delete button */}
            <div className="font-medium text-slate-900 text-xs flex items-center justify-center gap-1">
                <span>{fullName}</span>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${fullName} from this pairing?`)) {
                                onDelete();
                            }
                        }}
                        className="flex-shrink-0 p-0.5 bg-pink-200 hover:bg-pink-300 rounded-full text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                )}
            </div>

            {/* Level */}
            <div className="text-[10px] text-slate-600">
                {gymnast.level}
            </div>

            {/* Birthday & Competition */}
            <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px]">
                {formattedBirthday && (
                    <span className="flex items-center gap-0.5 text-pink-600">
                        <Cake className="h-2 w-2" />
                        {formattedBirthday}
                    </span>
                )}
                {nextCompetition && formattedCompDate && (
                    <span className="flex items-center gap-0.5 text-pink-600">
                        <Trophy className="h-2 w-2" />
                        {formattedCompDate}
                    </span>
                )}
            </div>
        </div>
    );
}

export function PairingCard({ groupedPairing, onDeleteLittle, onDeleteGroup }: PairingCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const { big_gymnast, big_next_competition, littles, notes } = groupedPairing;

    return (
        <div
            className="relative rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow border border-slate-200"
            style={{
                background: 'linear-gradient(to right, rgb(243, 232, 255), rgb(255, 255, 255), rgb(252, 231, 243))'
            }}
        >
            {/* Content */}
            <div className="relative px-3 py-3">
                {/* Menu Button */}
                {onDeleteGroup && (
                    <div className="absolute top-1 right-1 z-10">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded transition-colors"
                        >
                            <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 mt-1 z-20 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            if (confirm(`Delete all ${littles.length} pairing(s) for this Big?`)) {
                                                onDeleteGroup(groupedPairing.big_gymnast_id);
                                            }
                                        }}
                                        className="w-full px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete All Pairings
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Big Gymnast Section */}
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-24">
                        <BigGymnastInfo
                            gymnast={big_gymnast}
                            nextCompetition={big_next_competition}
                        />
                    </div>

                    {/* Arrow connector */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1">
                            <ArrowRight className="h-3 w-3 text-white" />
                        </div>
                    </div>

                    {/* Littles Section */}
                    <div className="flex-1 min-w-0">
                        {/* Little(s) Badge - centered above the grid */}
                        <div className="flex items-center justify-center gap-1.5 mb-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: '#db2777', color: 'white' }}>
                                <Heart className="h-3 w-3" />
                                LITTLE{littles.length > 1 ? 'S' : ''}
                            </span>
                            {littles.length > 1 && (
                                <span className="text-xs font-semibold" style={{ color: '#db2777' }}>({littles.length})</span>
                            )}
                        </div>

                        {/* Littles - always vertical stack */}
                        <div className="flex flex-col gap-2">
                            {littles.map((little) => (
                                <LittleGymnastChip
                                    key={little.id}
                                    gymnast={little.gymnast}
                                    nextCompetition={little.next_competition}
                                    onDelete={onDeleteLittle ? () => onDeleteLittle(little.id) : undefined}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Notes if present */}
                {notes && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] text-slate-500 line-clamp-1 text-center">{notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
