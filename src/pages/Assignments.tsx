import { ClipboardCheck, Construction } from 'lucide-react';

export function Assignments() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="relative mb-6">
                <div className="p-4 bg-amber-100 rounded-full">
                    <ClipboardCheck className="w-12 h-12 text-amber-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-slate-100 rounded-full border-2 border-white">
                    <Construction className="w-4 h-4 text-slate-500" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-2">Assignments</h1>
            <p className="text-slate-500 max-w-md mb-6">
                Coming soon! This feature will allow coaches to assign homework, drills, and conditioning
                to gymnasts and track their completion.
            </p>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 max-w-sm">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Planned Features</h3>
                <ul className="text-sm text-slate-500 text-left space-y-1">
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        Assign drills and conditioning
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        Track completion status
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        Due dates and reminders
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        Video upload for form checks
                    </li>
                </ul>
            </div>
        </div>
    );
}
