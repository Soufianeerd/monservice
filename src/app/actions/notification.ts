'use server';
export async function getUnreadCountAction(organizationId: string, userId: string) { return 0; }
export async function generateNotificationsAction(organizationId: string) { return []; }
export async function markAsReadAction(notificationId: string) {}
export async function markAllAsReadAction(organizationId: string, userId: string) {}
export async function findAllAction(organizationId: string) { return []; }
