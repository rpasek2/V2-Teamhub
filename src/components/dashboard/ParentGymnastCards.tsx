import { Link } from 'react-router-dom';
import { User, Trophy, Star, Heart, Cake } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { GymnastProfile } from '../../types';

interface LinkedGymnastInfo extends GymnastProfile {
    nextCompetition?: { name: string; start_date: string } | null;
    mentorshipPairing?: { big_name: string; little_name: string; role: 'big' | 'little' } | null;
}

interface ParentGymnastCardsProps {
    linkedGymnastInfo: LinkedGymnastInfo[];
}

export function ParentGymnastCards({ linkedGymnastInfo }: ParentGymnastCardsProps) {
    if (linkedGymnastInfo.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
                {linkedGymnastInfo.length === 1 ? 'Your Gymnast' : 'Your Gymnasts'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkedGymnastInfo.map((gymnast) => (
                    <Link
                        key={gymnast.id}
                        to={`roster/${gymnast.id}`}
                        className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                        {/* Gymnast Name & Level */}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {gymnast.first_name} {gymnast.last_name}
                                </h3>
                                <p className="text-sm text-slate-600">{gymnast.level}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                                <User className="h-5 w-5 text-brand-600" />
                            </div>
                        </div>

                        {/* Birthday */}
                        {gymnast.date_of_birth && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                <Cake className="h-4 w-4 text-purple-500" />
                                <span>Birthday: {format(parseISO(gymnast.date_of_birth), 'MMMM d')}</span>
                            </div>
                        )}

                        {/* Next Competition */}
                        {gymnast.nextCompetition && (
                            <div className="flex items-center gap-2 text-sm mb-2">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="text-slate-700">
                                    <span className="font-medium">{gymnast.nextCompetition.name}</span>
                                    <span className="text-slate-500"> · {format(parseISO(gymnast.nextCompetition.start_date), 'MMM d')}</span>
                                </span>
                            </div>
                        )}

                        {/* Mentorship Pairing */}
                        {gymnast.mentorshipPairing && (
                            <div className="flex items-center gap-2 text-sm">
                                {gymnast.mentorshipPairing.role === 'big' ? (
                                    <>
                                        <Star className="h-4 w-4 text-purple-500" />
                                        <span className="text-slate-700">
                                            Big to <span className="font-medium">{gymnast.mentorshipPairing.little_name}</span>
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Heart className="h-4 w-4 text-pink-500" />
                                        <span className="text-slate-700">
                                            Little to <span className="font-medium">{gymnast.mentorshipPairing.big_name}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Empty state if no extra info */}
                        {!gymnast.nextCompetition && !gymnast.mentorshipPairing && !gymnast.date_of_birth && (
                            <p className="text-sm text-slate-400 italic">No upcoming events</p>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
