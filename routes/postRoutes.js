const express = require('express');
const PostController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 公开路由
router.get('/', PostController.getList);
router.get('/:slug', PostController.getDetail);

// 需要登录的路由
router.post('/', authenticate, PostController.create);
router.put('/:id', authenticate, PostController.update);
router.delete('/:id', authenticate, PostController.delete);
router.get('/id/:id', authenticate, PostController.getById);
router.patch('/:id/pin', authenticate, PostController.togglePin);

module.exports = router;