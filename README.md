# Express Products API with Layered Caching Architecture

An Express.js application designed with clean layered architecture:
`Route → Middleware → Controller → Service → Database`

## Architecture & Folder Structure

```
asd_workshop/
├── routes/
│   └── productRoutes.js       # Route definitions & middleware wiring
├── controllers/
│   └── productController.js   # Request parsing, HTTP status codes, error forwarding
├── services/
│   ├── productService.js      # Business logic interacting with database
│   └── cacheService.js        # In-memory cache store with 1-min TTL & timestamp tracking
├── database/
│   ├── db.json                # JSON data persistence
│   └── productDatabase.js     # Low-level file I/O operations & delay simulation
├── middleware/
│   └── cacheMiddleware.js     # Caching & invalidation middleware
├── test/
│   └── test.js                # Integration and unit test suite
├── app.js                     # Express app setup and middleware configuration
├── server.js                  # Application entry point
├── package.json
└── README.md
```

---

## Features

1. **Layered Request Flow**:
   - Every request strictly adheres to: `Route → Middleware → Controller → Service → Database`.
2. **Caching Middleware**:
   - In-memory cache attached as middleware for `GET /products` and `GET /products/:id`.
3. **Cache Headers**:
   - `X-Cache: HIT` when data is served from valid cache.
   - `X-Cache: MISS` when data is fetched fresh from the database.
   - `X-Cache-Created-At` indicates the exact ISO timestamp when the entry was stored.
4. **Time To Live (TTL)**:
   - 1 minute (60,000 ms) TTL.
   - Each cache entry records `createdAt` timestamp.
   - On request, the cache validates entry age against TTL.
   - If expired (> 1 minute), it bypasses cache, removes the stale entry, queries fresh data from the database, and stores it anew.
5. **Cache Invalidation on Mutation**:
   - `POST`, `PUT`, `PATCH`, and `DELETE` requests that successfully modify stored data (HTTP 2xx) automatically invalidate all cache entries that may contain stale data.
   - Failed mutation requests (e.g. 400 Bad Request, 404 Not Found) preserve existing cache entries.

---

## API Endpoints

| Method | Endpoint | Description | Cache Behavior |
|--------|----------|-------------|----------------|
| `GET` | `/products` | List all products | Cached (1 min TTL, `X-Cache: HIT/MISS`) |
| `GET` | `/products/:id` | Get product by ID | Cached (1 min TTL, `X-Cache: HIT/MISS`) |
| `POST` | `/products` | Create a new product | Invalidates cache on success (201) |
| `PUT` | `/products/:id` | Replace product | Invalidates cache on success (200) |
| `PATCH` | `/products/:id` | Update product fields | Invalidates cache on success (200) |
| `DELETE` | `/products/:id` | Delete product | Invalidates cache on success (200) |
| `GET` | `/cache` | Inspect cache entries & TTL | Internal monitoring |

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
# or development with nodemon:
npm run dev
```

### 3. Run Tests
```bash
npm test
```