const fs = require('fs/promises');
const path = require('path');

const filePath = path.join(__dirname, 'db.json');

async function delay() {
    if (process.env.NODE_ENV !== 'test') {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}

async function getAll() {
    await delay();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
}

async function getById(id) {
    const products = await getAll();
    return products.find((p) => p.id === id);
}

async function create(product) {
    const products = await getAll();
    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;
    const newProduct = { id: newId, ...product };
    products.push(newProduct);
    await fs.writeFile(filePath, JSON.stringify(products, null, 2));
    return newProduct;
}

async function update(id, data) {
    const products = await getAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    products[index] = { id, ...data };
    await fs.writeFile(filePath, JSON.stringify(products, null, 2));
    return products[index];
}

async function patch(id, data) {
    const products = await getAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    products[index] = { ...products[index], ...data, id };
    await fs.writeFile(filePath, JSON.stringify(products, null, 2));
    return products[index];
}

async function remove(id) {
    const products = await getAll();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const [deleted] = products.splice(index, 1);
    await fs.writeFile(filePath, JSON.stringify(products, null, 2));
    return deleted;
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    patch,
    remove,
    delete: remove
};
