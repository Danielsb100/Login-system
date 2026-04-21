const prisma = require('../config/db');

const NotificationTypes = Object.freeze({
  MODULE_PUBLISHED: 'MODULE_PUBLISHED',
  FORUM_REPLY: 'FORUM_REPLY',
  QUIZ_SUBMITTED: 'QUIZ_SUBMITTED',
  EVENT_INVITE: 'EVENT_INVITE',
  ENROLLMENT_CREATED: 'ENROLLMENT_CREATED',
  FEEDBACK_RECEIVED: 'FEEDBACK_RECEIVED',
  SYSTEM_REMINDER: 'SYSTEM_REMINDER'
});

const NotificationPriority = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

const TaskQueueBucket = Object.freeze({
  URGENT: 'URGENT',
  TODAY: 'TODAY',
  WEEK: 'WEEK',
  LATER: 'LATER'
});

const taskQueueStatusPatch = (status) => {
  switch (status) {
    case 'PENDING':
      return { status: 'PENDING', completedAt: null, dismissedAt: null };
    case 'IN_PROGRESS':
      return { status: 'IN_PROGRESS', completedAt: null, dismissedAt: null };
    case 'COMPLETED':
      return { status: 'COMPLETED', completedAt: new Date(), dismissedAt: null };
    case 'DISMISSED':
      return { status: 'DISMISSED', completedAt: null, dismissedAt: new Date() };
    default:
      return null;
  }
};

const reminderStatusPatch = (status) => {
  switch (status) {
    case 'OPEN':
      return { status: 'OPEN', completedAt: null, dismissedAt: null };
    case 'COMPLETED':
      return { status: 'COMPLETED', completedAt: new Date(), dismissedAt: null };
    case 'DISMISSED':
      return { status: 'DISMISSED', completedAt: null, dismissedAt: new Date() };
    default:
      return null;
  }
};

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfToday() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

function endOfWeek() {
  const now = new Date();
  const end = new Date(now);
  const day = end.getDay();
  const daysUntilSunday = (7 - day) % 7;
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toActionUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

async function createNotificationBundle(payload, tx = prisma) {
  const {
    userId,
    type,
    title,
    message,
    priority = NotificationPriority.MEDIUM,
    actionUrl,
    actorUserId = null,
    sourceEntityType = null,
    sourceEntityId = null,
    metadata = null,
    reminder = null,
    task = null
  } = payload;

  if (!userId || !type || !title || !message) {
    throw new Error('userId, type, title and message are required to create a notification bundle.');
  }

  const normalizedActionUrl = toActionUrl(actionUrl);

  const notification = await tx.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      priority,
      actionUrl: normalizedActionUrl,
      actorUserId,
      sourceEntityType,
      sourceEntityId,
      metadata
    }
  });

  let reminderRecord = null;
  if (reminder) {
    reminderRecord = await tx.reminder.create({
      data: {
        userId,
        type: reminder.type || type,
        priority: reminder.priority || priority,
        title: reminder.title || title,
        description: reminder.description || message,
        dueAt: reminder.dueAt || null,
        actionUrl: toActionUrl(reminder.actionUrl || normalizedActionUrl),
        sourceEntityType,
        sourceEntityId,
        metadata: reminder.metadata || metadata
      }
    });
  }

  let taskRecord = null;
  if (task) {
    taskRecord = await tx.taskQueueItem.create({
      data: {
        userId,
        type: task.type || type,
        priority: task.priority || priority,
        title: task.title || title,
        summary: task.summary || message,
        bucket: task.bucket || TaskQueueBucket.TODAY,
        scheduledFor: task.scheduledFor || null,
        dueAt: task.dueAt || null,
        actionUrl: toActionUrl(task.actionUrl || normalizedActionUrl),
        sourceEntityType,
        sourceEntityId,
        metadata: task.metadata || metadata
      }
    });
  }

  return {
    notification,
    reminder: reminderRecord,
    taskQueueItem: taskRecord
  };
}

async function createNotificationForUsers(userIds, payloadFactory, tx = prisma) {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  const created = [];

  for (const userId of uniqueUserIds) {
    const payload = payloadFactory(userId);
    if (!payload) continue;
    created.push(await createNotificationBundle({ userId, ...payload }, tx));
  }

  return created;
}

async function notifyModulePublished({ module, actorUserId }, tx = prisma) {
  const recipients = await tx.user.findMany({
    where: {
      isVerified: true,
      id: actorUserId ? { not: actorUserId } : undefined
    },
    select: { id: true }
  });

  const dueAt = addDays(new Date(), 2);
  return createNotificationForUsers(
    recipients.map((recipient) => recipient.id),
    () => ({
      type: NotificationTypes.MODULE_PUBLISHED,
      priority: NotificationPriority.MEDIUM,
      title: `Novo módulo publicado: ${module.title}`,
      message: 'Um novo conteúdo foi disponibilizado na plataforma. Abra o dashboard e confira quando puder.',
      actorUserId,
      actionUrl: '/dashboard.html',
      sourceEntityType: 'TrainingModule',
      sourceEntityId: module.id,
      metadata: { moduleId: module.id, moduleTitle: module.title },
      reminder: {
        title: `Revisar módulo publicado: ${module.title}`,
        description: 'Abra o dashboard e avalie o novo conteúdo publicado para a sua trilha.',
        dueAt,
        actionUrl: '/dashboard.html'
      },
      task: {
        title: `Explorar módulo: ${module.title}`,
        summary: 'Conteúdo novo disponível para revisão no dashboard.',
        bucket: TaskQueueBucket.WEEK,
        dueAt,
        actionUrl: '/dashboard.html'
      }
    }),
    tx
  );
}

async function notifyForumReply({ thread, reply, actorUserId }, tx = prisma) {
  if (!thread?.userId || thread.userId === actorUserId) {
    return [];
  }

  const dueAt = endOfToday();
  return createNotificationForUsers(
    [thread.userId],
    () => ({
      type: NotificationTypes.FORUM_REPLY,
      priority: NotificationPriority.HIGH,
      title: `Nova resposta no fórum: ${thread.title}`,
      message: 'Alguém respondeu a uma discussão sua. Vale revisar hoje para manter a conversa fluindo.',
      actorUserId,
      actionUrl: `/dashboard.html?module=${thread.moduleId}&tab=forum&thread=${thread.id}`,
      sourceEntityType: 'ForumThread',
      sourceEntityId: thread.id,
      metadata: {
        threadId: thread.id,
        threadTitle: thread.title,
        moduleId: thread.moduleId,
        replyId: reply.id
      },
      task: {
        title: `Responder thread: ${thread.title}`,
        summary: 'Há uma nova interação no fórum aguardando sua atenção.',
        bucket: TaskQueueBucket.TODAY,
        dueAt,
        actionUrl: `/dashboard.html?module=${thread.moduleId}&tab=forum&thread=${thread.id}`
      }
    }),
    tx
  );
}

async function notifyQuizSubmitted({ module, submission, actorUserId }, tx = prisma) {
  if (!module?.ownerMasterId || module.ownerMasterId === actorUserId) {
    return [];
  }

  const dueAt = addDays(new Date(), 1);
  return createNotificationForUsers(
    [module.ownerMasterId],
    () => ({
      type: NotificationTypes.QUIZ_SUBMITTED,
      priority: NotificationPriority.HIGH,
      title: `Novo quiz submetido em ${module.title}`,
      message: 'Um aluno concluiu um quiz. Abra os relatórios para acompanhar a evolução e agir se necessário.',
      actorUserId,
      actionUrl: `/dashboard.html?module=${module.id}&tab=reports`,
      sourceEntityType: 'QuizSubmission',
      sourceEntityId: submission.id,
      metadata: {
        moduleId: module.id,
        moduleTitle: module.title,
        submissionId: submission.id,
        score: submission.score,
        attemptNumber: submission.attemptNumber
      },
      task: {
        title: `Acompanhar quiz: ${module.title}`,
        summary: 'Nova submissão registrada nos relatórios do módulo.',
        bucket: TaskQueueBucket.TODAY,
        dueAt,
        actionUrl: `/dashboard.html?module=${module.id}&tab=reports`
      }
    }),
    tx
  );
}

function buildFutureEventPayload({
  type,
  recipientUserId,
  title,
  message,
  priority = NotificationPriority.MEDIUM,
  actionUrl = '/dashboard.html',
  actorUserId = null,
  sourceEntityType = null,
  sourceEntityId = null,
  metadata = null,
  dueAt = null,
  bucket = TaskQueueBucket.WEEK
}) {
  return {
    userId: recipientUserId,
    type,
    title,
    message,
    priority,
    actionUrl,
    actorUserId,
    sourceEntityType,
    sourceEntityId,
    metadata,
    task: {
      title,
      summary: message,
      bucket,
      dueAt,
      actionUrl
    }
  };
}

async function createEventInviteNotification(options, tx = prisma) {
  return createNotificationBundle(
    buildFutureEventPayload({
      ...options,
      type: NotificationTypes.EVENT_INVITE,
      bucket: TaskQueueBucket.WEEK
    }),
    tx
  );
}

async function createEnrollmentNotification(options, tx = prisma) {
  return createNotificationBundle(
    buildFutureEventPayload({
      ...options,
      type: NotificationTypes.ENROLLMENT_CREATED,
      bucket: TaskQueueBucket.TODAY
    }),
    tx
  );
}

async function createFeedbackNotification(options, tx = prisma) {
  return createNotificationBundle(
    buildFutureEventPayload({
      ...options,
      type: NotificationTypes.FEEDBACK_RECEIVED,
      bucket: TaskQueueBucket.TODAY,
      priority: options.priority || NotificationPriority.HIGH
    }),
    tx
  );
}

async function getOperationalSummary(userId, tx = prisma) {
  const [notifications, reminders, taskQueueItems] = await Promise.all([
    tx.notification.findMany({
      where: {
        userId,
        status: { not: 'ARCHIVED' }
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 12
    }),
    tx.reminder.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 12
    }),
    tx.taskQueueItem.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 30
    })
  ]);

  const unreadCount = notifications.filter((item) => item.status === 'UNREAD').length;
  const urgentTasks = taskQueueItems.filter(
    (item) => item.bucket === TaskQueueBucket.URGENT || item.priority === NotificationPriority.CRITICAL
  );
  const todayTasks = taskQueueItems.filter((item) => item.bucket === TaskQueueBucket.TODAY);
  const weekTasks = taskQueueItems.filter((item) => item.bucket === TaskQueueBucket.WEEK);

  const weeklyGoals = [...weekTasks]
    .sort((a, b) => {
      const left = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .slice(0, 5);

  return {
    counts: {
      unread: unreadCount,
      remindersOpen: reminders.length,
      urgent: urgentTasks.length,
      today: todayTasks.length,
      week: weekTasks.length,
      totalPending: taskQueueItems.length
    },
    inbox: notifications,
    reminders,
    operational: {
      urgent: urgentTasks,
      today: todayTasks,
      week: weekTasks
    },
    weeklyGoals,
    plannedSignals: [
      NotificationTypes.EVENT_INVITE,
      NotificationTypes.ENROLLMENT_CREATED,
      NotificationTypes.FEEDBACK_RECEIVED
    ]
  };
}

async function markNotificationAsRead(notificationId, userId, tx = prisma) {
  return tx.notification.updateMany({
    where: {
      id: Number(notificationId),
      userId
    },
    data: {
      status: 'READ',
      readAt: new Date(),
      archivedAt: null
    }
  });
}

async function markAllNotificationsAsRead(userId, tx = prisma) {
  return tx.notification.updateMany({
    where: {
      userId,
      status: 'UNREAD'
    },
    data: {
      status: 'READ',
      readAt: new Date()
    }
  });
}

async function updateTaskQueueItemStatus(taskId, userId, status, tx = prisma) {
  const normalized = String(status || '').toUpperCase();
  const patch = taskQueueStatusPatch(normalized);
  if (!patch) {
    throw new Error('Invalid task queue status.');
  }

  return tx.taskQueueItem.updateMany({
    where: { id: Number(taskId), userId },
    data: patch
  });
}

async function updateReminderStatus(reminderId, userId, status, tx = prisma) {
  const normalized = String(status || '').toUpperCase();
  const patch = reminderStatusPatch(normalized);
  if (!patch) {
    throw new Error('Invalid reminder status.');
  }

  return tx.reminder.updateMany({
    where: { id: Number(reminderId), userId },
    data: patch
  });
}

module.exports = {
  NotificationTypes,
  NotificationPriority,
  TaskQueueBucket,
  createNotificationBundle,
  notifyModulePublished,
  notifyForumReply,
  notifyQuizSubmitted,
  createEventInviteNotification,
  createEnrollmentNotification,
  createFeedbackNotification,
  getOperationalSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateTaskQueueItemStatus,
  updateReminderStatus,
  endOfToday,
  endOfWeek,
  addDays
};
