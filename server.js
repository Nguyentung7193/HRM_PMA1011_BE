require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth/auth.router');
const notificationRouter = require('./routes/notifications/Notification.router');
const leaveRequestRoutes = require('./routes/leave/leaveRequest.route');
const authMiddleware = require('./middleware/authenticate');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Hello from Express + MongoDB!');
});

app.use('/api/notify', notificationRouter);
app.use('/api/auth', authRoutes);
app.use('/api/leave-requests', authMiddleware, leaveRequestRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
