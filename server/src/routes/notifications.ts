import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get notifications
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const isRead = req.query.is_read === 'true' ? true :
                   req.query.is_read === 'false' ? false : undefined;
    const type = req.query.type as string;

    const where: any = { userId: req.user!.id };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user!.id, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          is_read: n.isRead,
          read_at: n.readAt,
          created_at: n.createdAt,
        })),
        unread_count: unreadCount,
      },
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to get notifications',
      },
    });
  }
});

// Mark notifications as read
router.post('/', async (req, res) => {
  try {
    const { notification_ids, mark_all } = req.body;

    if (mark_all) {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        data: { message: 'All notifications marked as read' },
      });
      return;
    }

    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Notification IDs are required or use mark_all',
        },
      });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: notification_ids },
        userId: req.user!.id,
      },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({
      success: true,
      data: { message: 'Notifications marked as read' },
    });
  } catch (error: any) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to mark notifications as read',
      },
    });
  }
});

export default router;
