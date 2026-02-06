import { useState } from 'react';
import { clsx } from 'clsx';
import { Settings2, MessageSquare, Check, X } from 'lucide-react';
import type { GymnastProfile, HubEventSkill, GymnastSkill, SkillStatus, GymnastEventComment } from '../../types';
import { SKILL_STATUS_CONFIG } from '../../types';

interface SkillsTableProps {
    gymnasts: GymnastProfile[];
    skills: HubEventSkill[];
    gymnastSkills: GymnastSkill[];
    eventComments?: GymnastEventComment[];
    canEdit: boolean;
    onSkillStatusChange: (gymnastId: string, skillId: string, newStatus: SkillStatus) => void;
    onCommentChange?: (gymnastId: string, comment: string) => void;
    onManageSkills?: () => void;
}

const STATUS_CYCLE: SkillStatus[] = ['none', 'learning', 'achieved', 'mastered', 'injured'];

export function SkillsTable({
    gymnasts,
    skills,
    gymnastSkills,
    eventComments = [],
    canEdit,
    onSkillStatusChange,
    onCommentChange,
    onManageSkills
}: SkillsTableProps) {
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    const getSkillStatus = (gymnastId: string, skillId: string): SkillStatus => {
        const record = gymnastSkills.find(
            gs => gs.gymnast_profile_id === gymnastId && gs.hub_event_skill_id === skillId
        );
        return (record?.status as SkillStatus) || 'none';
    };

    const getComment = (gymnastId: string): string => {
        const comment = eventComments.find(c => c.gymnast_profile_id === gymnastId);
        return comment?.comment || '';
    };

    const cycleStatus = (gymnastId: string, skillId: string) => {
        if (!canEdit) return;

        const currentStatus = getSkillStatus(gymnastId, skillId);
        const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
        const nextStatus = STATUS_CYCLE[nextIndex];

        onSkillStatusChange(gymnastId, skillId, nextStatus);
    };

    const startEditingComment = (gymnastId: string) => {
        if (!canEdit || !onCommentChange) return;
        setEditingCommentId(gymnastId);
        setEditingCommentText(getComment(gymnastId));
    };

    const saveComment = () => {
        if (editingCommentId && onCommentChange) {
            onCommentChange(editingCommentId, editingCommentText);
        }
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    const hasSkills = skills.length > 0;

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th
                            scope="col"
                            className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 min-w-[180px]"
                        >
                            Gymnast
                        </th>
                        {hasSkills ? (
                            skills.map((skill) => (
                                <th
                                    key={skill.id}
                                    scope="col"
                                    className="px-2 py-3 text-center text-sm font-semibold text-slate-900 min-w-[80px] max-w-[140px]"
                                >
                                    <span className="block text-wrap leading-tight">
                                        {skill.skill_name}
                                    </span>
                                </th>
                            ))
                        ) : (
                            <th
                                scope="col"
                                className="px-4 py-3 text-center text-sm font-medium text-slate-500"
                            >
                                Skills
                            </th>
                        )}
                        {/* Notes Column Header */}
                        <th
                            scope="col"
                            className="px-4 py-3 text-left text-sm font-semibold text-slate-900 min-w-[200px]"
                        >
                            <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-4 w-4 text-slate-400" />
                                Notes
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {gymnasts.map((gymnast, gymnastIndex) => {
                        const comment = getComment(gymnast.id);
                        const isEditing = editingCommentId === gymnast.id;

                        return (
                            <tr
                                key={gymnast.id}
                                className={clsx(
                                    gymnastIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                )}
                            >
                                <td className="sticky left-0 z-10 whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 bg-inherit">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-semibold">
                                            {gymnast.first_name[0]}{gymnast.last_name[0]}
                                        </div>
                                        <span>{gymnast.first_name} {gymnast.last_name}</span>
                                    </div>
                                </td>
                                {hasSkills ? (
                                    skills.map((skill) => {
                                        const status = getSkillStatus(gymnast.id, skill.id);
                                        const config = SKILL_STATUS_CONFIG[status];

                                        return (
                                            <td
                                                key={skill.id}
                                                className="px-2 py-2 text-center"
                                            >
                                                <button
                                                    onClick={() => cycleStatus(gymnast.id, skill.id)}
                                                    disabled={!canEdit}
                                                    className={clsx(
                                                        "inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all min-w-[80px]",
                                                        config.bgColor,
                                                        config.color,
                                                        canEdit && "hover:ring-2 hover:ring-brand-300 cursor-pointer",
                                                        !canEdit && "cursor-default"
                                                    )}
                                                    title={canEdit ? 'Click to change status' : undefined}
                                                >
                                                    {config.icon && <span className="text-sm">{config.icon}</span>}
                                                    {config.label}
                                                </button>
                                            </td>
                                        );
                                    })
                                ) : (
                                    <td className="px-4 py-3 text-center text-sm text-slate-400">
                                        —
                                    </td>
                                )}
                                {/* Notes Cell */}
                                <td className="px-4 py-2">
                                    {isEditing ? (
                                        <div className="flex items-start gap-2">
                                            <textarea
                                                value={editingCommentText}
                                                onChange={(e) => setEditingCommentText(e.target.value)}
                                                className="flex-1 min-h-[60px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                                                placeholder="Add notes about this gymnast's progress..."
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') cancelEdit();
                                                    if (e.key === 'Enter' && e.ctrlKey) saveComment();
                                                }}
                                            />
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={saveComment}
                                                    className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                                    title="Save (Ctrl+Enter)"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                                    title="Cancel (Esc)"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEditingComment(gymnast.id)}
                                            disabled={!canEdit || !onCommentChange}
                                            className={clsx(
                                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                                comment
                                                    ? "text-slate-700 bg-slate-50 hover:bg-slate-100"
                                                    : "text-slate-400 italic hover:bg-slate-50",
                                                canEdit && onCommentChange && "cursor-pointer",
                                                (!canEdit || !onCommentChange) && "cursor-default"
                                            )}
                                        >
                                            {comment || (canEdit && onCommentChange ? 'Click to add notes...' : '—')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
                {hasSkills ? (
                    canEdit ? (
                        <p className="text-xs text-slate-500">
                            Click on a status to cycle: Not Started → Learning → Achieved → Mastered → Injured → Not Started
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500">
                            {gymnasts.length} gymnast{gymnasts.length !== 1 ? 's' : ''} · {skills.length} skill{skills.length !== 1 ? 's' : ''}
                        </p>
                    )
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            No skills defined for this event yet.
                        </p>
                        {canEdit && onManageSkills && (
                            <button
                                onClick={onManageSkills}
                                className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                                <Settings2 className="h-4 w-4" />
                                Add Skills
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
