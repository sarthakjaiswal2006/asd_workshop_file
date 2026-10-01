const cacheService = require('../services/cacheService');

function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') {
        return next();
    }

    const key = req.originalUrl || req.url;
    const cachedEntry = cacheService.get(key);

    if (cachedEntry) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cachedEntry.data);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    let cached = false;

    res.json = function (body) {
        if (!cached && res.statusCode >= 200 && res.statusCode < 300) {
            cached = true;
            cacheService.set(key, body);
        }
        return originalJson(body);
    };

    next();
}

function invalidateCacheMiddleware(req, res, next) {
    let invalidated = false;

    const handleInvalidation = () => {
        if (!invalidated && res.statusCode >= 200 && res.statusCode < 300) {
            invalidated = true;
            cacheService.invalidateAll();
        }
    };

    const originalJson = res.json.bind(res);
    res.json = function (body) {
        handleInvalidation();
        return originalJson(body);
    };

    const originalSend = res.send.bind(res);
    res.send = function (body) {
        handleInvalidation();
        return originalSend(body);
    };

    next();
}

module.exports = {
    cacheMiddleware,
    invalidateCacheMiddleware
};
