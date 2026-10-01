const cache = {};
const TTL = 60 * 1000;

function get(key) {
    const entry = cache[key];
    if (!entry) {
        return null;
    }

    const now = Date.now();
    if (now - entry.createdAt > TTL) {
        delete cache[key];
        return null;
    }

    return entry;
}

function set(key, data) {
    cache[key] = {
        data: data,
        createdAt: Date.now()
    };
}

function invalidateAll() {
    for (const key in cache) {
        delete cache[key];
    }
}

function has(key) {
    return get(key) !== null;
}

function getCreatedAt(key) {
    return cache[key] ? cache[key].createdAt : null;
}

function size() {
    return Object.keys(cache).length;
}

module.exports = {
    cache,
    get,
    set,
    invalidateAll,
    has,
    getCreatedAt,
    size
};
