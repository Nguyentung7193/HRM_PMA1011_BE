const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền thực hiện hành động này'
        });
    }
    next();
};

module.exports = isAdmin;