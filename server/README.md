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
  - `controllers/healthController.js`: Handles health check response.
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
  - `routes/healthRoutes.js`: Mounts health check endpoint.
- `services/` - Core business logic
  - `services/authService.js`: Registration, login, password strength rules, and JWT generation with `{ sub: userId }`.
  - `services/levelService.js`: Level catalog retrieval and unlock status calculation.
  - `services/levelGenerator.js`: Seeded procedural level generator using Mulberry32 PRNG ensuring safe obstacle spacing and generous ink.
  - `services/scoreService.js`: Pure functions calculating stars (`starsFromInk`) and score (`scoreFor`) based on ink ratio, stars, and par time.
  - `services/healthService.js`: Business logic for health status and timestamps.
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

