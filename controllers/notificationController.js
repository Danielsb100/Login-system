const { sendSuccess, sendError } = require('../utils/http');
const {
  getOperationalSummary,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateTaskQueueItemStatus,
  updateReminderStatus
} = require('../services/notificationService');

async function getSummary(req, res) {
  try {
    const summary = await getOperationalSummary(req.user.id);
    return sendSuccess(res, { data: summary });
  } catch (error) {
    return sendError(res, {
      status: 500,
      message: 'Failed to load notifications summary.',
      code: 'NOTIFICATION_SUMMARY_FAILED',
      details: error.message
    });
  }
}

async function setNotificationRead(req, res) {
  try {
    const result = await markNotificationAsRead(req.params.id, req.user.id);
    if (!result.count) {
      return sendError(res, {
        status: 404,
        message: 'Notification not found.',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    return sendSuccess(res, {
      message: 'Notification marked as read.'
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      message: 'Failed to update notification.',
      code: 'NOTIFICATION_UPDATE_FAILED',
      details: error.message
    });
  }
}

async function setAllNotificationsRead(req, res) {
  try {
    const result = await markAllNotificationsAsRead(req.user.id);
    return sendSuccess(res, {
      message: `${result.count} notification(s) marked as read.`
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      message: 'Failed to update notifications.',
      code: 'NOTIFICATION_BULK_UPDATE_FAILED',
      details: error.message
    });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const result = await updateTaskQueueItemStatus(req.params.id, req.user.id, req.body.status);
    if (!result.count) {
      return sendError(res, {
        status: 404,
        message: 'Task queue item not found.',
        code: 'TASK_QUEUE_ITEM_NOT_FOUND'
      });
    }

    return sendSuccess(res, {
      message: 'Operational task updated.'
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid task queue status') ? 400 : 500;
    return sendError(res, {
      status: statusCode,
      message: error.message,
      code: statusCode === 400 ? 'INVALID_TASK_QUEUE_STATUS' : 'TASK_QUEUE_UPDATE_FAILED'
    });
  }
}

async function updateReminder(req, res) {
  try {
    const result = await updateReminderStatus(req.params.id, req.user.id, req.body.status);
    if (!result.count) {
      return sendError(res, {
        status: 404,
        message: 'Reminder not found.',
        code: 'REMINDER_NOT_FOUND'
      });
    }

    return sendSuccess(res, {
      message: 'Reminder updated.'
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid reminder status') ? 400 : 500;
    return sendError(res, {
      status: statusCode,
      message: error.message,
      code: statusCode === 400 ? 'INVALID_REMINDER_STATUS' : 'REMINDER_UPDATE_FAILED'
    });
  }
}

module.exports = {
  getSummary,
  setNotificationRead,
  setAllNotificationsRead,
  updateTaskStatus,
  updateReminder
};
