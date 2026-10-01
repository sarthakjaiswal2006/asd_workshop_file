const productService = require('../services/productService');

async function getProducts(req, res) {
    try {
        const products = await productService.getProducts();
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function getProduct(req, res) {
    try {
        const id = Number(req.params.id);
        const product = await productService.getProduct(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function addProduct(req, res) {
    try {
        const { name, price } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ message: 'Name and price are required' });
        }

        const newProduct = await productService.addProduct({ name, price: Number(price) });
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function updateProduct(req, res) {
    try {
        const id = Number(req.params.id);
        const { name, price } = req.body;

        const updated = await productService.updateProduct(id, { name, price: Number(price) });
        if (!updated) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function patchProduct(req, res) {
    try {
        const id = Number(req.params.id);
        const updated = await productService.patchProduct(id, req.body);

        if (!updated) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

async function deleteProduct(req, res) {
    try {
        const id = Number(req.params.id);
        const deleted = await productService.deleteProduct(id);

        if (!deleted) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted', product: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    getProducts,
    getProduct,
    addProduct,
    updateProduct,
    patchProduct,
    deleteProduct,
    getAllProducts: getProducts,
    getProductById: getProduct,
    createProduct: addProduct
};
