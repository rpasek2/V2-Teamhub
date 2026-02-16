import { Link, useNavigate } from 'react-router-dom';
import { Clock, Loader2, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface PendingTimeOffRequest {
    id: string;
    staff_user_id: string;
    staff_name: string;
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick' | 'personal' | 'other';
    notes: string | null;
    created_at: string;
}

interface PendingTimeOffSectionProps {
    pendingTimeOff: PendingTimeOffRequest[];
    processingTimeOff: string | null;
    onTimeOffDecision: (requestId: string, decision: 'approved' | 'denied', request: PendingTimeOffRequest) => void;
}

function getTimeOffTypeColor(type: string) {
    switch (type) {
        case 'vacation': return 'bg-blue-100 text-blue-700';
        case 'sick': return 'bg-red-100 text-red-700';
        case 'personal': return 'bg-purple-100 text-purple-700';
        case 'other': return 'bg-slate-100 text-slate-700';
        default: return 'bg-slate-100 text-slate-700';
    }
}

export function PendingTimeOffSection({ pendingTimeOff, processingTimeOff, onTimeOffDecision }: PendingTimeOffSectionProps) {
    const navigate = useNavigate();

    if (pendingTimeOff.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">Pending Time Off Requests</h2>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {pendingTimeOff.length}
                    </span>
                </div>
                <Link to="staff" className="text-sm text-brand-600 hover:text-brand-700">
                    View Staff
                </Link>
            </div>
            <div className="space-y-3">
                {pendingTimeOff.map((request) => (
                    <div
                        key={request.id}
                        className="card p-4 bg-amber-50 border-amber-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-lg border border-amber-200">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => navigate(`staff/${request.staff_user_id}`)}
                                            className="font-medium text-slate-900 hover:text-brand-600 transition-colors"
                                        >
                                            {request.staff_name}
                                        </button>
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-xs font-medium",
                                            getTimeOffTypeColor(request.type)
                                        )}>
                                            {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 mt-0.5">
                                        {format(parseISO(request.start_date), 'MMM d')}
                                        {request.start_date !== request.end_date && (
                                            <> - {format(parseISO(request.end_date), 'MMM d, yyyy')}</>
                                        )}
                                        {request.start_date === request.end_date && (
                                            <>, {format(parseISO(request.start_date), 'yyyy')}</>
                                        )}
                                    </p>
                                    {request.notes && (
                                        <p className="text-sm text-slate-500 mt-1">{request.notes}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-1">
                                        Requested {format(parseISO(request.created_at), 'MMM d')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onTimeOffDecision(request.id, 'approved', request)}
                                    disabled={processingTimeOff === request.id}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                                    title="Approve"
                                >
                                    {processingTimeOff === request.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => onTimeOffDecision(request.id, 'denied', request)}
                                    disabled={processingTimeOff === request.id}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                    title="Deny"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
