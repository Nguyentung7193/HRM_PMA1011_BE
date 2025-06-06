const Notification = require('../../models/notifications/Notificaton');

exports.getUserNotifications = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            type,
            status,
            isRead
        } = req.query;

        const filter = { userId: req.user.userId };
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (isRead !== undefined) filter.isRead = isRead === 'true';

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Notification.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving notifications'
        });
    }
};