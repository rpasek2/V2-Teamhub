import { useState, useEffect } from 'react';
import { BarChart3, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useHub } from '../../../context/HubContext';
import type { PollSettings } from '../../../types';

interface PollDisplayProps {
    postId: string;
    question: string;
    options: string[];
    settings: PollSettings;
}

interface PollResponseData {
    id: string;
    post_id: string;
    user_id: string;
    option_indices: number[];
    created_at: string;
    updated_at: string;
}

export function PollDisplay({ postId, question, options, settings }: PollDisplayProps) {
    const { user } = useHub();
    const [responses, setResponses] = useState<PollResponseData[]>([]);
    const [userResponse, setUserResponse] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        fetchResponses();
    }, [postId]);

    const fetchResponses = async () => {
        try {
            const { data, error } = await supabase
                .from('poll_responses')
                .select('*')
                .eq('post_id', postId);

            if (error) throw error;

            setResponses(data || []);

            // Check if current user has voted
            if (user) {
                const myResponse = data?.find(r => r.user_id === user.id);
                if (myResponse) {
                    setUserResponse(myResponse.option_indices);
                    setHasVoted(true);
                }
            }
        } catch (err) {
            console.error('Error fetching poll responses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (optionIndex: number) => {
        if (!user || voting) return;

        setVoting(true);
        try {
            let newSelection: number[];

            if (settings.multipleChoice) {
                // Toggle selection for multiple choice
                if (userResponse.includes(optionIndex)) {
                    newSelection = userResponse.filter(i => i !== optionIndex);
                } else {
                    newSelection = [...userResponse, optionIndex];
                }
            } else {
                // Single choice - replace selection
                newSelection = [optionIndex];
            }

            if (hasVoted) {
                if (!settings.allowChangeVote) {
                    setVoting(false);
                    return; // Can't change vote
                }
                // Update existing vote
                const { error } = await supabase
                    .from('poll_responses')
                    .update({ option_indices: newSelection, updated_at: new Date().toISOString() })
                    .eq('post_id', postId)
                    .eq('user_id', user.id);

                if (error) throw error;

                // Update responses optimistically
                setResponses(prev => prev.map(r =>
                    r.user_id === user.id
                        ? { ...r, option_indices: newSelection }
                        : r
                ));
                setUserResponse(newSelection);
            } else {
                // Insert new vote
                const { error } = await supabase
                    .from('poll_responses')
                    .insert({
                        post_id: postId,
                        user_id: user.id,
                        option_indices: newSelection
                    });

                if (error) throw error;

                // Optimistically add to state
                setResponses(prev => [...prev, {
                    id: crypto.randomUUID(),
                    post_id: postId,
                    user_id: user.id,
                    option_indices: newSelection,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
                setUserResponse(newSelection);
                setHasVoted(true);
            }
        } catch (err) {
            console.error('Error voting:', err);
        } finally {
            setVoting(false);
        }
    };

    // Calculate vote counts
    const voteCounts = options.map((_, index) =>
        responses.filter(r => r.option_indices.includes(index)).length
    );
    const totalVotes = responses.length;

    const showResults = settings.showResultsBeforeVote || hasVoted;
    const canVote = !hasVoted || settings.allowChangeVote;

    if (loading) {
        return (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-purple-100 border-b border-purple-200">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">Poll</span>
                <span className="text-xs text-purple-500 ml-auto">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-4">
                <p className="font-medium text-slate-900 mb-4">{question}</p>

                <div className="space-y-2">
                    {options.map((option, index) => {
                        const voteCount = voteCounts[index];
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const isSelected = userResponse.includes(index);

                        return (
                            <button
                                key={index}
                                onClick={() => canVote && handleVote(index)}
                                disabled={!canVote || voting}
                                className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
                                    isSelected
                                        ? 'border-purple-400 bg-purple-100'
                                        : 'border-slate-200 bg-white hover:border-purple-300'
                                } ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {/* Progress bar background */}
                                {showResults && (
                                    <div
                                        className={`absolute inset-y-0 left-0 transition-all ${
                                            isSelected ? 'bg-purple-200' : 'bg-slate-100'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                )}

                                <div className="relative flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            isSelected
                                                ? 'border-purple-500 bg-purple-500'
                                                : 'border-slate-300'
                                        }`}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'font-medium text-purple-900' : 'text-slate-700'}`}>
                                            {option}
                                        </span>
                                    </div>
                                    {showResults && (
                                        <span className={`text-sm font-medium ${isSelected ? 'text-purple-700' : 'text-slate-500'}`}>
                                            {percentage}%
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Settings info */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-purple-600">
                    {settings.multipleChoice && (
                        <span className="px-2 py-0.5 bg-purple-100 rounded-full">Multiple choice</span>
                    )}
                    {!settings.allowChangeVote && hasVoted && (
                        <span className="px-2 py-0.5 bg-purple-100 rounded-full">Vote cannot be changed</span>
                    )}
                </div>
            </div>
        </div>
    );
}
