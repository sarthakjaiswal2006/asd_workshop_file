const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.DB_DELAY = '0';

const app = require('../app');
const cacheService = require('../services/cacheService');

const initialProducts = [
    { id: 1, name: 'Keyboard', price: 49.99 },
    { id: 2, name: 'Mouse', price: 19.99 },
    { id: 3, name: 'Monitor', price: 199 },
    { id: 4, name: 'Mouse', price: 19 }
];

const resetDatabase = () => {
    const dbPath = path.join(__dirname, '../database/db.json');
    fs.writeFileSync(dbPath, JSON.stringify(initialProducts, null, 2), 'utf-8');
    cacheService.invalidateAll();
};

async function runTests() {
    console.log('--- Starting Integration & Unit Tests ---');
    resetDatabase();

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    try {
        console.log('Test 1: Verify Directory Structure...');
        const requiredFolders = ['routes', 'controllers', 'services', 'database', 'middleware'];
        for (const folder of requiredFolders) {
            const folderPath = path.join(__dirname, '..', folder);
            assert(fs.existsSync(folderPath), `Required directory "${folder}" must exist`);
            assert(fs.statSync(folderPath).isDirectory(), `"${folder}" must be a directory`);
        }
        console.log('✓ Directory structure confirmed');

        console.log('\nTest 2: GET /products (First call -> MISS)...');
        let res = await fetch(`${baseUrl}/products`);
        let data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('x-cache'), 'MISS');
        assert.strictEqual(data.length, 4);
        assert.strictEqual(cacheService.has('/products'), true);
        const firstCreatedAt = cacheService.getCreatedAt('/products');
        assert(typeof firstCreatedAt === 'number' && firstCreatedAt > 0, 'Cache entry must have a createdAt timestamp');
        console.log(`✓ X-Cache: MISS verified, cache entry created at: ${firstCreatedAt}`);

        console.log('\nTest 3: GET /products (Second call -> HIT)...');
        res = await fetch(`${baseUrl}/products`);
        data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('x-cache'), 'HIT');
        assert.strictEqual(data.length, 4);
        assert.strictEqual(cacheService.getCreatedAt('/products'), firstCreatedAt, 'CreatedAt timestamp must remain same on HIT');
        console.log('✓ X-Cache: HIT verified with cached data and consistent timestamp');

        console.log('\nTest 4: GET /products/1 (First call -> MISS, Second call -> HIT)...');
        res = await fetch(`${baseUrl}/products/1`);
        data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('x-cache'), 'MISS');
        assert.strictEqual(data.id, 1);
        assert.strictEqual(data.name, 'Keyboard');

        res = await fetch(`${baseUrl}/products/1`);
        data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('x-cache'), 'HIT');
        assert.strictEqual(data.id, 1);
        console.log('✓ GET /products/:id caching verified');

        console.log('\nTest 5: Cache TTL logic (older than 1 minute -> expired -> MISS -> re-cache)...');
        const expiredEntry = cacheService.cache['/products'];
        assert(expiredEntry !== undefined, 'Cached entry for /products must exist');
        expiredEntry.createdAt = Date.now() - 65 * 1000;

        res = await fetch(`${baseUrl}/products`);
        data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'Expired cache must result in MISS');
        const refreshedCreatedAt = cacheService.getCreatedAt('/products');
        assert(refreshedCreatedAt > expiredEntry.createdAt, 'New cache entry timestamp must be fresh');
        assert(Date.now() - refreshedCreatedAt < 2000, 'Fresh cache timestamp must be current');

        res = await fetch(`${baseUrl}/products`);
        assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Immediate subsequent call must be HIT');
        console.log('✓ TTL expiration check and fresh re-caching verified');

        console.log('\nTest 6: Invalidation on successful POST /products...');
        assert.strictEqual(cacheService.has('/products'), true);

        res = await fetch(`${baseUrl}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Webcam 4K', price: 89.99 })
        });
        const createdProduct = await res.json();
        assert.strictEqual(res.status, 201);
        assert.strictEqual(createdProduct.name, 'Webcam 4K');
        assert.strictEqual(createdProduct.id, 5);

        assert.strictEqual(cacheService.size(), 0, 'Cache must be empty after POST modifies data');

        res = await fetch(`${baseUrl}/products`);
        data = await res.json();
        assert.strictEqual(res.headers.get('x-cache'), 'MISS', 'Must be MISS after invalidation');
        assert.strictEqual(data.length, 5);
        assert(data.some((p) => p.name === 'Webcam 4K'));
        console.log('✓ POST /products successfully invalidates cache and serves fresh data');

        console.log('\nTest 7: Invalidation on successful PUT /products/:id...');
        await fetch(`${baseUrl}/products`);
        await fetch(`${baseUrl}/products/1`);
        assert.strictEqual(cacheService.has('/products'), true);
        assert.strictEqual(cacheService.has('/products/1'), true);

        res = await fetch(`${baseUrl}/products/1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Mechanical RGB Keyboard', price: 99.99 })
        });
        assert.strictEqual(res.status, 200);

        assert.strictEqual(cacheService.size(), 0, 'Cache must be invalidated after PUT');

        res = await fetch(`${baseUrl}/products/1`);
        data = await res.json();
        assert.strictEqual(res.headers.get('x-cache'), 'MISS');
        assert.strictEqual(data.name, 'Mechanical RGB Keyboard');
        console.log('✓ PUT /products/:id successfully invalidates cache');

        console.log('\nTest 8: Invalidation on successful PATCH /products/:id...');
        await fetch(`${baseUrl}/products`);
        await fetch(`${baseUrl}/products/2`);

        res = await fetch(`${baseUrl}/products/2`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: 24.99 })
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(cacheService.size(), 0, 'Cache must be invalidated after PATCH');

        res = await fetch(`${baseUrl}/products/2`);
        data = await res.json();
        assert.strictEqual(res.headers.get('x-cache'), 'MISS');
        assert.strictEqual(data.price, 24.99);
        console.log('✓ PATCH /products/:id successfully invalidates cache');

        console.log('\nTest 9: Invalidation on successful DELETE /products/:id...');
        await fetch(`${baseUrl}/products`);
        await fetch(`${baseUrl}/products/4`);

        res = await fetch(`${baseUrl}/products/4`, {
            method: 'DELETE'
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(cacheService.size(), 0, 'Cache must be invalidated after DELETE');

        res = await fetch(`${baseUrl}/products/4`);
        assert.strictEqual(res.status, 404);

        res = await fetch(`${baseUrl}/products`);
        data = await res.json();
        assert.strictEqual(data.some((p) => p.id === 4), false);
        console.log('✓ DELETE /products/:id successfully invalidates cache');

        console.log('\nTest 10: Failed request (404 or 400) does NOT invalidate cache...');
        await fetch(`${baseUrl}/products`);
        assert.strictEqual(cacheService.has('/products'), true);
        const cacheSizeBefore = cacheService.size();

        res = await fetch(`${baseUrl}/products/999999`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Ghost', price: 100 })
        });
        assert.strictEqual(res.status, 404);
        assert.strictEqual(cacheService.size(), cacheSizeBefore, 'Cache must NOT be invalidated on 404');

        res = await fetch(`${baseUrl}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(cacheService.size(), cacheSizeBefore, 'Cache must NOT be invalidated on 400');

        res = await fetch(`${baseUrl}/products`);
        assert.strictEqual(res.headers.get('x-cache'), 'HIT', 'Cache remains HIT after failed requests');
        console.log('✓ Failed requests do not invalidate cache');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n');
    } finally {
        resetDatabase();
        server.close();
    }
}

runTests().catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
