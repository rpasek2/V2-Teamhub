import { useNotifications } from '../../context/NotificationContext';
import {
    MessageCircle, Users, CalendarDays, Trophy, Medal,
    Sparkles, ClipboardCheck, ShoppingBag, FolderOpen, ArrowLeft, ListTodo
} from 'lucide-react';
import type { UserNotificationPreferences } from '../../types';

const NOTIFICATION_FEATURES: {
    key: keyof Omit<UserNotificationPreferences, 'id' | 'user_id' | 'hub_id' | 'created_at' | 'updated_at'>;
    label: string;
    description: string;
    icon: typeof MessageCircle;
}[] = [
    { key: 'messages_enabled', label: 'Messages', description: 'Direct messages and channels', icon: MessageCircle },
    { key: 'groups_enabled', label: 'Groups', description: 'Group posts and updates', icon: Users },
    { key: 'calendar_enabled', label: 'Calendar', description: 'New events and changes', icon: CalendarDays },
    { key: 'competitions_enabled', label: 'Competitions', description: 'New competitions added', icon: Trophy },
    { key: 'scores_enabled', label: 'Scores', description: 'New competition scores', icon: Medal },
    { key: 'skills_enabled', label: 'Skills', description: 'Skill status changes', icon: Sparkles },
    { key: 'assignments_enabled', label: 'Assignments', description: 'New practice assignments', icon: ClipboardCheck },
    { key: 'marketplace_enabled', label: 'Marketplace', description: 'New items for sale', icon: ShoppingBag },
    { key: 'resources_enabled', label: 'Resources', description: 'New shared resources', icon: FolderOpen },
    { key: 'staff_tasks_enabled', label: 'Staff Tasks', description: 'New task assignments and updates', icon: ListTodo },
];

interface NotificationSettingsProps {
    onBack: () => void;
}

export function NotificationSettings({ onBack }: NotificationSettingsProps) {
    const { preferences, updatePreferences } = useNotifications();

    const isEnabled = (key: keyof Omit<UserNotificationPreferences, 'id' | 'user_id' | 'hub_id' | 'created_at' | 'updated_at'>) => {
        if (!preferences) return true; // All enabled by default
        return preferences[key] as boolean;
    };

    const toggleFeature = (key: keyof Omit<UserNotificationPreferences, 'id' | 'user_id' | 'hub_id' | 'created_at' | 'updated_at'>) => {
        updatePreferences({ [key]: !isEnabled(key) });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-4 border-b border-slate-200">
                <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
                <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <p className="text-xs text-slate-500 px-2 pb-2">Choose which features show badges and appear in your feed.</p>
                {NOTIFICATION_FEATURES.map(({ key, label, description, icon: Icon }) => (
                    <div
                        key={key}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900">{label}</p>
                                <p className="text-xs text-slate-500 truncate">{description}</p>
                            </div>
                        </div>
                        <button
                            role="switch"
                            aria-checked={isEnabled(key)}
                            aria-label={`${label} notifications`}
                            onClick={() => toggleFeature(key)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled(key) ? 'bg-brand-600' : 'bg-slate-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isEnabled(key) ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
