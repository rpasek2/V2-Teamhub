import { useState, useEffect } from 'react';
import { CalendarCheck, MapPin, Clock, Loader2, Check, X, HelpCircle, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useHub } from '../../../context/HubContext';
import type { RsvpResponse, Profile } from '../../../types';

interface RsvpDisplayProps {
    postId: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
}

interface RsvpResponseWithProfile extends RsvpResponse {
    profiles?: Profile;
}

type RsvpStatus = 'going' | 'not_going' | 'maybe';

export function RsvpDisplay({ postId, title, date, time, location }: RsvpDisplayProps) {
    const { user } = useHub();
    const [responses, setResponses] = useState<RsvpResponseWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [responding, setResponding] = useState(false);
    const [userStatus, setUserStatus] = useState<RsvpStatus | null>(null);
    const [showAllResponses, setShowAllResponses] = useState(false);

    useEffect(() => {
        fetchResponses();
    }, [postId]);

    const fetchResponses = async () => {
        try {
            const { data, error } = await supabase
                .from('rsvp_responses')
                .select('*, profiles(full_name, avatar_url)')
                .eq('post_id', postId);

            if (error) throw error;

            setResponses(data || []);

            // Check user's response
            if (user) {
                const myResponse = data?.find(r => r.user_id === user.id);
                if (myResponse) {
                    setUserStatus(myResponse.status as RsvpStatus);
                }
            }
        } catch (err) {
            console.error('Error fetching RSVP responses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRsvp = async (status: RsvpStatus) => {
        if (!user || responding) return;

        setResponding(true);
        try {
            if (userStatus) {
                // Update existing response
                const { error } = await supabase
                    .from('rsvp_responses')
                    .update({ status, updated_at: new Date().toISOString() })
                    .eq('post_id', postId)
                    .eq('user_id', user.id);

                if (error) throw error;
            } else {
                // Insert new response
                const { error } = await supabase
                    .from('rsvp_responses')
                    .insert({
                        post_id: postId,
                        user_id: user.id,
                        status
                    });

                if (error) throw error;
            }

            setUserStatus(status);
            fetchResponses();
        } catch (err) {
            console.error('Error responding to RSVP:', err);
        } finally {
            setResponding(false);
        }
    };

    const goingCount = responses.filter(r => r.status === 'going').length;
    const notGoingCount = responses.filter(r => r.status === 'not_going').length;
    const maybeCount = responses.filter(r => r.status === 'maybe').length;

    const goingResponses = responses.filter(r => r.status === 'going');
    const maybeResponses = responses.filter(r => r.status === 'maybe');
    const notGoingResponses = responses.filter(r => r.status === 'not_going');

    if (loading) {
        return (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-100 border-b border-blue-200">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">RSVP</span>
            </div>
            <div className="p-4">
                <p className="font-medium text-slate-900 text-lg">{title}</p>

                {/* Event details */}
                {(date || time || location) && (
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                        {date && (
                            <div className="flex items-center gap-1.5">
                                <CalendarCheck className="h-4 w-4 text-blue-500" />
                                {formatDate(date)}
                            </div>
                        )}
                        {time && (
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-blue-500" />
                                {formatTime(time)}
                            </div>
                        )}
                        {location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                {location}
                            </div>
                        )}
                    </div>
                )}

                {/* Response buttons */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => handleRsvp('going')}
                        disabled={responding}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                            userStatus === 'going'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                    >
                        <Check className="h-4 w-4" />
                        Going
                        <span className={`text-xs ${userStatus === 'going' ? 'text-emerald-100' : 'text-slate-400'}`}>
                            ({goingCount})
                        </span>
                    </button>
                    <button
                        onClick={() => handleRsvp('maybe')}
                        disabled={responding}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                            userStatus === 'maybe'
                                ? 'bg-amber-500 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                    >
                        <HelpCircle className="h-4 w-4" />
                        Maybe
                        <span className={`text-xs ${userStatus === 'maybe' ? 'text-amber-100' : 'text-slate-400'}`}>
                            ({maybeCount})
                        </span>
                    </button>
                    <button
                        onClick={() => handleRsvp('not_going')}
                        disabled={responding}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                            userStatus === 'not_going'
                                ? 'bg-red-500 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300 hover:bg-red-50'
                        }`}
                    >
                        <X className="h-4 w-4" />
                        Can't Go
                        <span className={`text-xs ${userStatus === 'not_going' ? 'text-red-100' : 'text-slate-400'}`}>
                            ({notGoingCount})
                        </span>
                    </button>
                </div>

                {/* Response list */}
                {responses.length > 0 && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowAllResponses(!showAllResponses)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {showAllResponses ? 'Hide responses' : `See all ${responses.length} responses`}
                        </button>

                        {showAllResponses && (
                            <div className="mt-3 space-y-3">
                                {goingResponses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">
                                            Going ({goingResponses.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {goingResponses.map((r) => (
                                                <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full text-xs text-emerald-700 border border-emerald-200">
                                                    {r.profiles?.avatar_url ? (
                                                        <img src={r.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                                                    ) : (
                                                        <User className="h-3 w-3" />
                                                    )}
                                                    {r.profiles?.full_name || 'Unknown'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {maybeResponses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-amber-600 uppercase mb-2">
                                            Maybe ({maybeResponses.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {maybeResponses.map((r) => (
                                                <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full text-xs text-amber-700 border border-amber-200">
                                                    {r.profiles?.avatar_url ? (
                                                        <img src={r.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                                                    ) : (
                                                        <User className="h-3 w-3" />
                                                    )}
                                                    {r.profiles?.full_name || 'Unknown'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {notGoingResponses.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-red-600 uppercase mb-2">
                                            Can't Go ({notGoingResponses.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {notGoingResponses.map((r) => (
                                                <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full text-xs text-red-700 border border-red-200">
                                                    {r.profiles?.avatar_url ? (
                                                        <img src={r.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                                                    ) : (
                                                        <User className="h-3 w-3" />
                                                    )}
                                                    {r.profiles?.full_name || 'Unknown'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
