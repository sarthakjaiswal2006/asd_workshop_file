const productDatabase = require('../database/productDatabase');

async function getProducts() {
    return await productDatabase.getAll();
}

async function getProduct(id) {
    return await productDatabase.getById(id);
}

async function addProduct(data) {
    return await productDatabase.create(data);
}

async function updateProduct(id, data) {
    return await productDatabase.update(id, data);
}

async function patchProduct(id, data) {
    return await productDatabase.patch(id, data);
}

async function deleteProduct(id) {
    return await productDatabase.remove(id);
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
