const express = require('express');
const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), UserController.uploadAvatar);
router.put('/password', authenticate, UserController.changePassword);  // 新增

module.exports = router;