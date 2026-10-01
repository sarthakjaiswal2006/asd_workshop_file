const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCacheMiddleware } = require('../middleware/cacheMiddleware');

router.get('/', cacheMiddleware, productController.getProducts);
router.get('/:id', cacheMiddleware, productController.getProduct);

router.post('/', invalidateCacheMiddleware, productController.addProduct);
router.put('/:id', invalidateCacheMiddleware, productController.updateProduct);
router.patch('/:id', invalidateCacheMiddleware, productController.patchProduct);
router.delete('/:id', invalidateCacheMiddleware, productController.deleteProduct);

module.exports = router;
