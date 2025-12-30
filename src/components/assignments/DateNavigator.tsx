import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';

interface DateNavigatorProps {
    date: Date;
    onDateChange: (date: Date) => void;
    showTodayButton?: boolean;
}

export function DateNavigator({ date, onDateChange, showTodayButton = true }: DateNavigatorProps) {
    const goToPrevious = () => {
        onDateChange(subDays(date, 1));
    };

    const goToNext = () => {
        onDateChange(addDays(date, 1));
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value + 'T00:00:00');
        if (!isNaN(newDate.getTime())) {
            onDateChange(newDate);
        }
    };

    return (
        <div className="flex items-center gap-2 sm:gap-3">
            <button
                onClick={goToPrevious}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="Previous day"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="relative">
                <input
                    type="date"
                    value={format(date, 'yyyy-MM-dd')}
                    onChange={handleDateInput}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    aria-label="Select date"
                />
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 min-w-[180px] sm:min-w-[220px]">
                    <Calendar className="w-4 h-4 text-mint-600 flex-shrink-0" />
                    <span className="text-slate-900 font-medium text-sm sm:text-base">
                        {format(date, 'EEE, MMM d, yyyy')}
                    </span>
                </div>
            </div>

            <button
                onClick={goToNext}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="Next day"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {showTodayButton && !isToday(date) && (
                <button
                    onClick={goToToday}
                    className="px-3 py-2 text-sm rounded-lg bg-mint-100 text-mint-600 hover:bg-mint-200 transition-colors"
                >
                    Today
                </button>
            )}
        </div>
    );
}
