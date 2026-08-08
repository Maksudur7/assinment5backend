import prisma from "../../lib/prisma";

export async function getNotifications(userId: string, limit = 20) {
  const notifs = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return notifs;
}

export async function markAsRead(userId: string, notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}

export async function broadcastNotification(data: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const users = await prisma.user.findMany({ select: { id: true } });
  const notifs = users.map((u) => ({
    userId: u.id,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    isRead: false,
  }));
  await prisma.notification.createMany({ data: notifs });
  return { sent: notifs.length };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
