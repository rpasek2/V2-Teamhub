import { Mail, Phone, Clock, CheckSquare, Calendar } from 'lucide-react';

interface StaffMember {
    user_id: string;
    role: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
    staff_profile?: {
        id: string;
        title: string | null;
        bio: string | null;
        phone: string | null;
        email: string | null;
        hire_date: string | null;
        status: string;
    } | null;
    pending_time_off: number;
    pending_tasks: number;
}

interface StaffCardProps {
    member: StaffMember;
    getRoleBadgeColor: (role: string) => string;
    onClick: () => void;
}

export function StaffCard({ member, getRoleBadgeColor, onClick }: StaffCardProps) {
    const initials = member.profile?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';

    const contactEmail = member.staff_profile?.email || member.profile?.email;
    const contactPhone = member.staff_profile?.phone;

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer"
        >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                {member.profile?.avatar_url ? (
                    <img
                        src={member.profile.avatar_url}
                        alt={member.profile.full_name}
                        loading="lazy"
                        className="w-14 h-14 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-700 font-semibold text-lg">{initials}</span>
                    </div>
                )}

                {/* Name & Role */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                        {member.profile?.full_name || 'Unknown'}
                    </h3>
                    {member.staff_profile?.title && (
                        <p className="text-sm text-slate-500 truncate">{member.staff_profile.title}</p>
                    )}
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
                {contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{contactEmail}</span>
                    </div>
                )}
                {contactPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{contactPhone}</span>
                    </div>
                )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                {member.pending_tasks > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-slate-600">{member.pending_tasks} task{member.pending_tasks !== 1 ? 's' : ''}</span>
                    </div>
                )}
                {member.pending_time_off > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-600">{member.pending_time_off} request{member.pending_time_off !== 1 ? 's' : ''}</span>
                    </div>
                )}
                {member.pending_tasks === 0 && member.pending_time_off === 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>No pending items</span>
                    </div>
                )}
            </div>
        </div>
    );
}
