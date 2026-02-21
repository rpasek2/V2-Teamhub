import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useHub } from '../../context/HubContext';
import { NotificationSettings } from './NotificationSettings';
import {
    Bell, MessageCircle, Users, CalendarDays, Trophy, Medal,
    Sparkles, ClipboardCheck, ShoppingBag, FolderOpen, Settings,
    CheckCheck, Loader2, BellOff, ListTodo
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { ActivityNotification, NotificationType } from '../../types';

const NOTIFICATION_ICONS: Record<NotificationType, typeof MessageCircle> = {
    message: MessageCircle,
    post: Users,
    event: CalendarDays,
    competition: Trophy,
    score: Medal,
    skill: Sparkles,
    assignment: ClipboardCheck,
    marketplace_item: ShoppingBag,
    resource: FolderOpen,
    staff_task: ListTodo,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
    message: 'bg-brand-50 text-brand-600',
    post: 'bg-purple-50 text-purple-600',
    event: 'bg-indigo-50 text-indigo-600',
    competition: 'bg-amber-50 text-amber-600',
    score: 'bg-emerald-50 text-emerald-600',
    skill: 'bg-pink-50 text-pink-600',
    assignment: 'bg-blue-50 text-blue-600',
    marketplace_item: 'bg-orange-50 text-orange-600',
    resource: 'bg-slate-100 text-slate-600',
    staff_task: 'bg-teal-50 text-teal-600',
};

function getNotificationRoute(notification: ActivityNotification): string {
    switch (notification.reference_type) {
        case 'channel': return 'messages';
        case 'group': return `groups/${notification.reference_id}`;
        case 'event': return 'calendar';
        case 'competition': return `competitions/${notification.reference_id}`;
        case 'assignment': return 'assignments';
        case 'skill': return 'skills';
        case 'marketplace_item': return 'marketplace';
        case 'resource': return 'resources';
        case 'staff_task': return 'staff';
        default: return '';
    }
}

export function NotificationBell() {
    const { unreadFeedCount, fetchActivityFeed, markNotificationRead, markAllNotificationsRead } = useNotifications();
    const { hub } = useHub();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const bellRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const PAGE_SIZE = 20;

    const loadNotifications = useCallback(async (reset = false) => {
        setLoading(true);
        const offset = reset ? 0 : notifications.length;
        const items = await fetchActivityFeed(PAGE_SIZE, offset);

        if (reset) {
            setNotifications(items);
        } else {
            setNotifications(prev => [...prev, ...items]);
        }
        setHasMore(items.length === PAGE_SIZE);
        setLoading(false);
    }, [fetchActivityFeed, notifications.length]);

    // Load notifications when dropdown opens
    useEffect(() => {
        if (isOpen && !showSettings) {
            loadNotifications(true);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setShowSettings(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handleNotificationClick = async (notification: ActivityNotification) => {
        if (!notification.is_read) {
            await markNotificationRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
        }

        const route = getNotificationRoute(notification);
        if (route && hub) {
            navigate(`/hub/${hub.id}/${route}`);
        }
        setIsOpen(false);
        setShowSettings(false);
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 100 && hasMore && !loading) {
            loadNotifications(false);
        }
    };

    // Position the dropdown
    const getDropdownStyle = (): React.CSSProperties => {
        if (!bellRef.current) return {};
        const rect = bellRef.current.getBoundingClientRect();
        return {
            position: 'fixed',
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right,
            zIndex: 50,
        };
    };

    return (
        <>
            <button
                ref={bellRef}
                onClick={() => { setIsOpen(!isOpen); setShowSettings(false); }}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadFeedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-error-500 text-white text-xs font-medium">
                        {unreadFeedCount > 99 ? '99+' : unreadFeedCount}
                    </span>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    style={getDropdownStyle()}
                    className="w-96 max-h-[500px] bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col overflow-hidden"
                >
                    {showSettings ? (
                        <NotificationSettings onBack={() => { setShowSettings(false); loadNotifications(true); }} />
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                <h3 className="font-semibold text-slate-900">Notifications</h3>
                                <div className="flex items-center gap-1">
                                    {unreadFeedCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                                        title="Notification settings"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Notification List */}
                            <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                                {notifications.length === 0 && !loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4">
                                        <BellOff className="w-10 h-10 text-slate-300 mb-3" />
                                        <p className="text-sm font-medium text-slate-500">You're all caught up!</p>
                                        <p className="text-xs text-slate-400 mt-1">No new notifications</p>
                                    </div>
                                ) : (
                                    <>
                                        {notifications.map((notification) => {
                                            const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                                            const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-slate-100 text-slate-600';

                                            return (
                                                <button
                                                    key={notification.id}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    className={`w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                                                        !notification.is_read ? 'bg-brand-50/30' : ''
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm ${!notification.is_read ? 'font-medium text-slate-900' : 'text-slate-700'} line-clamp-1`}>
                                                            {notification.title}
                                                        </p>
                                                        {notification.body && (
                                                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                                {notification.body}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    {!notification.is_read && (
                                                        <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {loading && (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
