# Happy Drop - Backend

Backend service for Happy Drop, a physics-based water and drawing puzzle game.

## Tech Stack
- Node.js (v20+)
- Express.js
- MongoDB & Mongoose
- Zod (Input validation)
- JSON Web Tokens (JWT) & bcryptjs (Authentication)

## Project Architecture
The project follows a layered architecture:
`routes -> middleware -> controllers -> services -> models`

### Core Files
- `app.js` - Configures Express middlewares and routes, exports app without starting the server (useful for testing).
- `server.js` - Connects to MongoDB and starts listening on the configured PORT.

### Directory Structure
- `config/` - Environment variables and database setup
  - `config/env.js`: Validates all environment variables using Zod at startup.
  - `config/db.js`: Handles MongoDB connection lifecycle and errors.
- `controllers/` - Thin request handlers
  - `controllers/authController.js`: Handlers for register, login, and getMe.
  - `controllers/gameController.js`: Handlers for starting and completing game sessions.
  - `controllers/healthController.js`: Handles health check response.
  - `controllers/leaderboardController.js`: Handlers for global leaderboard ranking and user standing (`/me`).
  - `controllers/levelController.js`: Handlers for levels catalog and procedural generation.
  - `controllers/progressController.js`: Handlers for user progress and dashboard.
  - `controllers/statsController.js`: Handlers for player statistics dashboard (`/me`).
- `middleware/` - Auth, validation, rate limiting, and error handling
  - `middleware/validate.js`: Zod schema validation middleware that strips unknown fields or returns `400 VALIDATION_ERROR`.
  - `middleware/auth.js`: JWT verification middleware loading user without password, returning 401 with `NO_TOKEN`, `INVALID_TOKEN`, or `TOKEN_EXPIRED`.
  - `middleware/errorHandler.js`: Catches 404s and handles global errors with standard JSON structure `{ message, code }`.
- `models/` - Mongoose schemas and data models
  - `models/User.js`: User schema with bcrypt password hashing hook, `comparePassword` method, and compound leaderboard index.
  - `models/LevelProgress.js`: Tracks player level attempts, stars (0-3), best stats, and unique `(userId, levelId)` index.
  - `models/GameSession.js`: Tracks active/completed/abandoned play sessions with `(userId, levelId, status)` index.
- `routes/` - Express route definitions
  - `routes/authRoutes.js`: Auth endpoints (`/register`, `/login`, `/me`) with Zod body validation.
  - `routes/dashboardRoutes.js`: User dashboard endpoint (`/`).
  - `routes/gameRoutes.js`: Game lifecycle endpoints (`/start`, `/complete`).
  - `routes/healthRoutes.js`: Mounts health check endpoint.
  - `routes/leaderboardRoutes.js`: Global leaderboard endpoint (`/`).
  - `routes/levelRoutes.js`: Level catalog endpoints.
  - `routes/progressRoutes.js`: Level progress retrieval endpoints.
  - `routes/statsRoutes.js`: Player statistics and achievements endpoint (`/me`).
- `services/` - Core business logic
  - `services/authService.js`: Registration, login, password strength rules, and JWT generation with `{ sub: userId }`.
  - `services/gameService.js`: Session management, attempt tracking, server-side validation, score updates.
  - `services/healthService.js`: Business logic for health status and timestamps.
  - `services/leaderboardService.js`: Top player rankings and individual rank computation using compound index.
  - `services/levelGenerator.js`: Seeded procedural level generator using Mulberry32 PRNG ensuring safe obstacle spacing and generous ink.
  - `services/levelService.js`: Level catalog retrieval and unlock status calculation.
  - `services/progressService.js`: Progress queries and dashboard aggregation.
  - `services/scoreService.js`: Pure functions calculating stars (`starsFromInk`) and score (`scoreFor`) based on ink ratio, stars, and par time.
  - `services/statsService.js`: Player stats calculations, progress percent, recent sessions, and unlocked milestone achievements.
- `scripts/` - Database and utility scripts
  - `scripts/checkModels.js`: Verifies MongoDB connection, creates test user, tests duplicate prevention, and cleans up.
- `data/` - Static game data and level seeds
  - `data/levels.json`: Static puzzle levels configuration (targets, ink thresholds, obstacles, cups, and taps).
- `tests/` - Unit and integration tests
  - `tests/health.test.js`: Integration tests for health check and 404 handler.
  - `tests/userModel.test.js`: Unit tests for User model schema and password hashing.
  - `tests/gameModels.test.js`: Unit tests for LevelProgress and GameSession models.
  - `tests/authMiddleware.test.js`: Unit tests for validation and authentication middlewares.
  - `tests/authService.test.js`: Unit tests for registration and login business rules.
  - `tests/authRoutes.test.js`: Integration tests for auth endpoints.
- `utils/` - Shared helper utilities and custom error classes
  - `utils/ApiError.js`: Custom operational error class carrying `statusCode`, `code`, and `message`.

## API Endpoints

### Authentication
- **`POST /api/auth/register`**
  - **Body:** `{ "name": "...", "email": "...", "password": "..." }`
  - **Response (201 Created):** `{ "token": "...", "user": { ... } }`
- **`POST /api/auth/login`**
  - **Body:** `{ "email": "...", "password": "..." }`
  - **Response (200 OK):** `{ "token": "...", "user": { ... } }`
- **`GET /api/auth/me`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):** `{ "user": { ... } }`
  - *Note:* Password is never returned in any response.

### Levels
- **`GET /api/levels`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "First Drop",
        "difficulty": "easy",
        "maxInk": 300,
        "stars": 2,
        "unlocked": true
      },
      {
        "id": 2,
        "name": "The Divider",
        "difficulty": "medium",
        "maxInk": 350,
        "stars": 0,
        "unlocked": true
      }
    ]
    ```
  - *Security rule:* `referenceSolution` is strictly omitted from responses.
- **`GET /api/levels/generated/:seed`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Params:** `seed` must be an integer.
  - **Response (200 OK):** Deterministically generated level with ID `gen-<seed>` for practice play. Does not unlock progress.
- **`GET /api/levels/:id`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Responses:**
    - `200 OK`: Full level configuration (tap, glass, targetWater, maxInk, starThresholds, obstacles) without `referenceSolution`.
    - `400 Bad Request`: `INVALID_INPUT` if `id` is not an integer.
    - `403 Forbidden`: `LEVEL_LOCKED` if the player hasn't unlocked the level yet.
    - `404 Not Found`: `LEVEL_NOT_FOUND` if the level ID does not exist.

### Game Sessions
- **`POST /api/games/start`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Body:** `{ "levelId": 1 }`
  - **Rules:**
    - Validates `levelId` as an integer.
    - Returns `404 LEVEL_NOT_FOUND` if missing; `403 LEVEL_LOCKED` if locked.
    - Marks any prior active sessions for this user/level as `abandoned`.
    - Creates a new `active` `GameSession`.
    - Increments `attempts` in `LevelProgress` (sets up initial 0 stars).
  - **Response (201 Created):**
    ```json
    {
      "sessionId": "6acdf0...",
      "level": {
        "id": 1,
        "maxInk": 300,
        "parTime": 12
      },
      "startedAt": "2026-10-13T10:00:00.000Z"
    }
    ```
- **`POST /api/games/complete`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Body:** `{ "sessionId": "...", "levelId": 1, "inkUsed": 100, "completionTime": 10 }`
  - **Server-side validation order:**
    1. Session belongs to authenticated user and matches levelId (or `404 SESSION_NOT_FOUND`).
    2. Session status: duplicate check for `completed` returning saved result with `duplicate: true`; `409 SESSION_NOT_ACTIVE` if `abandoned`.
    3. `inkUsed <= maxInk` from server data (or `400 INVALID_INK`).
    4. `completionTime` between 2 and 1800 seconds (or `400 INVALID_TIME`).
    5. `completionTime <= elapsedSeconds + 3` (or `400 INVALID_TIME`).
  - **Response (200 OK):**
    ```json
    {
      "stars": 3,
      "score": 1033,
      "isNewBest": true,
      "bestStars": 3,
      "nextLevelUnlocked": 2,
      "duplicate": false
    }
    ```

### Progress & Dashboard
- **`GET /api/progress`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):** All LevelProgress rows of the user with `levelId`, `stars`, `bestInkUsed`, `bestTime`, `bestScore`, `attempts`, `completedAt`.
- **`GET /api/progress/:levelId`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Rules:**
    - `400 INVALID_INPUT` if `levelId` is not an integer.
    - `404 LEVEL_NOT_FOUND` if the level does not exist.
    - If user has no progress row, returns:
      ```json
      {
        "levelId": 1,
        "stars": 0,
        "attempts": 0,
        "unlocked": true
      }
      ```
- **`GET /api/dashboard`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):** Aggregated summary with user stats and 5 most recent completed sessions.
- **`GET /api/stats/me`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):**
    ```json
    {
      "levelsCompleted": 10,
      "totalStars": 28,
      "perfectLevels": 5,
      "totalAttempts": 25,
      "bestCompletion": 3,
      "progressPercent": 50,
      "recentLevels": [
        {
          "levelId": 10,
          "stars": 2,
          "score": 780,
          "completedAt": "2026-10-14T11:00:00.000Z"
        }
      ],
      "achievements": [
        "First Drop",
        "Halfway",
        "Perfect Five"
      ]
    }
    ```
- **`GET /api/leaderboard`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params:** `limit` must be an integer between 1 and 100 (defaults to 20).
  - **Ranking Rules (Compound Index):**
    1. `totalStars`, higher first (DESC).
    2. `completedLevels`, higher first (DESC).
    3. `perfectLevels`, higher first (DESC).
    4. Account age, older first (`createdAt` ASC).
  - **Filter:** Only includes players with `totalStars > 0`. Never exposes email or private credentials.
  - **Response (200 OK):**
    ```json
    [
      {
        "rank": 1,
        "name": "Ace",
        "totalStars": 30,
        "completedLevels": 10,
        "perfectLevels": 10
      }
    ]
    ```
- **`GET /api/leaderboard/me`** *(Protected)*
  - **Headers:** `Authorization: Bearer <token>`
  - **Rules:**
    - `rank = 1 + number of users strictly ahead` using the compound ranking rules.
    - If the user has 0 stars yet, `rank` is `null`.
  - **Response (200 OK):**
    ```json
    {
      "rank": 5,
      "totalStars": 25,
      "completedLevels": 9,
      "perfectLevels": 4
    }
    ```

### Health Check
- **`GET /api/health`**
  - **Response (200 OK):**
    ```json
    {
      "status": "ok",
      "time": "2026-10-13T08:18:00.000Z"
    }
    ```

### Error Responses
All errors follow a unified structure:
```json
{
  "message": "Resource not found",
  "code": "NOT_FOUND"
}
```

## Security Hardening

The backend incorporates multiple defense-in-depth security layers:

| Security Measure | Implementation | Behavior |
| --- | --- | --- |
| **HTTP Security Headers** | `helmet` | Sets standard security headers (XSS, HSTS, noSniff, frameguard). |
| **CORS Restriction** | `config/cors.js` | Restricts browser origins to comma-separated `CLIENT_URL`. Blocked origins receive `403 FORBIDDEN`. |
| **Trust Proxy** | `app.set('trust proxy', 1)` | Safely trusts proxy headers from upstream load balancers (Render). |
| **Body Size Limit** | `express.json({ limit: '10kb' })` | Prevents denial-of-service via payload bloating; returns `413 PAYLOAD_TOO_LARGE`. |
| **NoSQL Injection Shield** | `middleware/sanitize.js` | Recursively rejects any input keys starting with `$` or containing `.`; returns `400 INVALID_INPUT`. |
| **Auth Rate Limiting** | `express-rate-limit` | Caps `/api/auth/login` and `/api/auth/register` to 10 requests per 15 mins per IP (`429 RATE_LIMITED`). |
| **Games Rate Limiting** | `express-rate-limit` | Caps `/api/games` to 60 actions per minute per IP (`429 RATE_LIMITED`). |
| **General API Rate Limiting** | `express-rate-limit` | Caps all other `/api` routes to 200 requests per 15 mins per IP (`429 RATE_LIMITED`). |
| **Error Mapping & Shielding** | `middleware/errorHandler.js` | Maps Mongoose Validation (400), CastError (400), Duplicate Key 11000 (409), Payload Size (413), and masks 500s. |
| **Request Logging Privacy** | `morgan` | Uses `dev` in development, `combined` in production, skipped in tests. Never logs request payloads. |
| **Graceful Crash Handling** | `server.js` | Intercepts `uncaughtException` & `unhandledRejection`, logs details, closes server, and terminates cleanly. |
| **Rate Limit Test Bypass** | `config/rateLimiter.js` | Automatically disables rate limits when `NODE_ENV === 'test'` to avoid test suite throttling. |

## Running the Server

1. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in your values:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Available Scripts:**
   - **Start in production:**
     ```powershell
     npm start
     ```
   - **Start in development (auto-reload):**
     ```powershell
     npm run dev
     ```
   - **Run tests:**
     ```powershell
     npm test
     ```

### How to Run Tests

Run the complete automated test suite powered by Jest, Supertest, and in-memory MongoDB (`mongodb-memory-server`):
```powershell
npm test
```

To run a specific test suite or test pattern:
```powershell
# Run end-to-end API integration tests
npm test -- --testPathPattern=apiIntegration

# Run scoring unit tests
npm test -- --testPathPattern=scoreService
```

### Manual API Testing (REST Client)

Executable request templates for all endpoints are available in [`requests.http`](requests.http):
1. Open `requests.http` in your editor with the **REST Client** extension.
2. Set `@baseUrl` (defaults to `http://localhost:5000`).
3. Send the **Register** or **Login** request to receive a JWT token.
4. Set `@authToken` at the top of the file to test protected endpoints.

