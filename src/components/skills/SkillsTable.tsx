import { clsx } from 'clsx';
import type { GymnastProfile, HubEventSkill, GymnastSkill, SkillStatus } from '../../types';
import { SKILL_STATUS_CONFIG } from '../../types';

interface SkillsTableProps {
    gymnasts: GymnastProfile[];
    skills: HubEventSkill[];
    gymnastSkills: GymnastSkill[];
    canEdit: boolean;
    onSkillStatusChange: (gymnastId: string, skillId: string, newStatus: SkillStatus) => void;
}

const STATUS_CYCLE: SkillStatus[] = ['none', 'learning', 'achieved', 'mastered'];

export function SkillsTable({
    gymnasts,
    skills,
    gymnastSkills,
    canEdit,
    onSkillStatusChange
}: SkillsTableProps) {
    const getSkillStatus = (gymnastId: string, skillId: string): SkillStatus => {
        const record = gymnastSkills.find(
            gs => gs.gymnast_profile_id === gymnastId && gs.hub_event_skill_id === skillId
        );
        return (record?.status as SkillStatus) || 'none';
    };

    const cycleStatus = (gymnastId: string, skillId: string) => {
        if (!canEdit) return;

        const currentStatus = getSkillStatus(gymnastId, skillId);
        const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
        const nextStatus = STATUS_CYCLE[nextIndex];

        onSkillStatusChange(gymnastId, skillId, nextStatus);
    };

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
                        {skills.map((skill) => (
                            <th
                                key={skill.id}
                                scope="col"
                                className="px-2 py-3 text-center text-sm font-semibold text-slate-900 min-w-[100px]"
                            >
                                <span className="truncate block" title={skill.skill_name}>
                                    {skill.skill_name}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {gymnasts.map((gymnast, gymnastIndex) => (
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
                            {skills.map((skill) => {
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
                                            title={`Click to change status`}
                                        >
                                            {config.icon && <span className="text-sm">{config.icon}</span>}
                                            {config.label}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer with click hint */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs text-slate-500">
                    Click on a status to cycle: Not Started → Learning → Achieved → Mastered → Not Started
                </p>
            </div>
        </div>
    );
}
