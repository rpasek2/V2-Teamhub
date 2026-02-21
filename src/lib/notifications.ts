import { supabase } from './supabase';

interface CreateStaffTaskNotificationParams {
    hubId: string;
    userId: string;       // The staff member receiving the notification
    actorId: string;      // The person who created/updated the task
    taskId: string;
    title: string;
    body: string | null;
}

export async function createStaffTaskNotification({
    hubId, userId, actorId, taskId, title, body
}: CreateStaffTaskNotificationParams) {
    // Don't notify yourself
    if (userId === actorId) return;

    const { error } = await supabase
        .from('notifications')
        .insert({
            hub_id: hubId,
            user_id: userId,
            type: 'staff_task',
            title,
            body,
            actor_id: actorId,
            reference_id: taskId,
            reference_type: 'staff_task',
            is_read: false,
        });

    if (error) {
        console.error('Error creating staff task notification:', error);
    }
}
