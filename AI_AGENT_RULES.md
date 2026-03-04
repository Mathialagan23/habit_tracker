# AI Agent Rules

Rules for AI coding assistants (Claude, Copilot, or similar) when modifying this codebase. Follow these rules strictly to avoid breaking existing functionality.

---

## 1. Understand the Codebase First

Before making any change, read and understand the relevant parts of the project.

- Read `ARCHITECTURE.md` for system design, layer interactions, and data flow
- Read `DEVELOPMENT_GUIDE.md` for project structure, environment setup, and conventions
- Read the specific files you intend to modify before writing any code
- Trace the full request path (Route → Middleware → Controller → Service → Model) for the feature area you are working in
- Never propose changes to code you have not read

**Required reading before any backend change:**
- `server/src/app.js` - middleware stack and route mounting
- The relevant route, controller, service, and model files

**Required reading before any frontend change:**
- `client/src/App.jsx` - routing and layout structure
- `client/src/App.css` - design tokens and existing class conventions
- The relevant page and component files

---

## 2. Do Not Rebuild the Project

Never recreate the project structure, directories, or configuration files.

- Do not regenerate `package.json`, `vite.config.js`, or config files
- Do not rewrite `app.js`, `server.js`, or `main.jsx` from scratch
- Do not restructure existing directories or rename established modules
- Do not replace the existing tech stack (Express, Mongoose, Zustand, etc.)
- The project is already built and running. Your job is to extend it, not rebuild it

---

## 3. Change Isolation

Only modify files directly related to the requested feature.

- Identify the minimum set of files that need to change
- Do not edit unrelated modules, services, or components
- Do not "clean up" or "improve" code outside the scope of the current task
- Do not add comments, docstrings, or type annotations to files you did not functionally change
- Do not rename variables, reformat code, or adjust whitespace in unrelated sections
- If a change requires touching more than 5-6 files, confirm the scope before proceeding

---

## 4. Prefer Adding New Modules

When the change is substantial, add new files rather than heavily modifying stable existing ones.

- New services go in `server/src/services/`
- New workers go in `server/src/workers/`
- New middleware goes in `server/src/middleware/`
- New React components go in `client/src/components/`
- New pages go in `client/src/pages/`
- New utility functions go in `server/src/utils/` or as a new client utility file

When to add vs modify:
- **Add** a new file when introducing a new domain concept (e.g., a social feature, an achievement system)
- **Modify** an existing file when extending current behavior (e.g., adding a field to a model, adding a method to a service)

Never rewrite a stable file from scratch. If a file needs significant changes, make targeted edits to specific sections.

---

## 5. Maintain Existing Architecture

Follow the patterns already established in the codebase.

### Backend Patterns

- **Layered architecture:** Routes → Middleware → Controllers → Services → Models
- **Controllers are thin:** Extract request data, call service, send response. No business logic in controllers
- **Services are singletons:** Export `new ClassName()`. Services handle all business logic, caching, and job dispatch
- **Models define schemas:** Validation, indexes, methods, and hooks live in Mongoose model files
- **Validation uses Zod:** All request validation schemas go in `server/src/utils/schemas.js`
- **Errors use AppError:** Throw `new AppError(message, statusCode, 'ERROR_CODE')` for operational errors
- **Dates use UTC midnight:** Always normalize dates with `utils/date.js` helpers
- **Cache follows cache-aside:** Check cache → compute on miss → store result → invalidate on mutation

### Frontend Patterns

- **State management:** Zustand stores in `client/src/store/`. Do not introduce Redux, Context API, or other state libraries
- **API calls:** All endpoints defined in `client/src/api/index.js`. Use the existing Axios instance from `client/src/api/client.js`
- **Styling:** Pure CSS in `client/src/App.css` using CSS custom properties from `:root`. Do not introduce CSS modules, Tailwind, styled-components, or other styling systems
- **Icons:** Use `lucide-react`. Do not add other icon libraries
- **Notifications:** Use `react-hot-toast`. Do not add other toast/notification libraries
- **Routing:** React Router v7 in `client/src/App.jsx`. Protected routes use the `ProtectedRoute` wrapper

---

## 6. Backward Compatibility

New changes must not break existing features or APIs.

### Database Changes

- When adding fields to Mongoose schemas, always provide a `default` value so existing documents remain valid
- Never remove or rename existing schema fields unless explicitly asked
- Never drop indexes. Add new indexes alongside existing ones
- Test that existing API responses still contain the same fields after your changes

### API Changes

- Do not change the shape of existing API responses (adding fields is acceptable, removing or renaming is not)
- Do not change existing endpoint paths or HTTP methods
- Do not modify authentication or middleware behavior for existing routes
- New endpoints should follow the established URL patterns

### Frontend Changes

- Do not remove existing UI elements unless explicitly asked
- New components should not affect the layout or behavior of existing components
- Preserve all existing CSS classes. Add new classes rather than modifying existing ones
- Verify the build passes after every change: `cd client && npm run build`

---

## 7. Plan Before Coding

Every feature implementation should follow three phases.

### Phase 1: Planning

- Identify all files that need to change
- List the specific modifications for each file
- Determine if new files need to be created
- Check for potential conflicts with existing functionality
- Identify which cache keys need invalidation

### Phase 2: Architecture Review

- Verify the change fits within the existing layered architecture
- Confirm the data flow makes sense (frontend → API → service → model → cache/queue)
- Check that no circular dependencies are introduced
- Ensure the change follows the established patterns documented in this file

### Phase 3: Implementation

- Make changes incrementally, one file at a time
- Verify the backend loads after each server-side change: `node -e "require('./src/app')"`
- Verify the frontend builds after each client-side change: `npm run build`
- Test the complete flow end to end

---

## 8. Incremental Development

Implement one feature at a time. Do not batch multiple unrelated changes.

- Complete one feature fully before starting the next
- Verify each feature works before moving on
- If a task involves multiple features, break it into sequential steps and track progress
- After each step, confirm the server loads and the client builds

---

## 9. Avoid Large Refactors

Unless the user explicitly requests a refactor, do not reorganize the codebase.

Do not:
- Move files between directories
- Rename existing functions, variables, or classes
- Change the export style of existing modules (e.g., class to function, CommonJS to ESM)
- Restructure the component hierarchy
- Change the database schema strategy (e.g., embedding vs. referencing)
- Introduce new architectural patterns (e.g., event sourcing, CQRS) unless asked

If you believe a refactor would be beneficial, explain the reasoning and get approval before making changes.

---

## 10. Documentation

Update documentation when the architecture changes.

- If you add new API endpoints, note them for documentation updates
- If you add new models or collections, document the schema
- If you add new environment variables, add them to `server/.env.example` and document them
- If you add new npm scripts, document the command and its purpose
- Do not create new documentation files unless explicitly requested
- Do not modify `ARCHITECTURE.md` or `DEVELOPMENT_GUIDE.md` unless the changes you made require it

---

## 11. Testing

Ensure existing functionality remains operational after every modification.

### Backend Verification

```bash
# Verify all modules load without syntax errors
cd server && node -e "require('./src/app')"

# Verify health endpoint
curl http://localhost:5000/health
```

### Frontend Verification

```bash
# Verify the build passes with zero errors
cd client && npm run build

# Verify linting
cd client && npm run lint
```

### Manual Verification

After implementing a feature, mentally trace or test these flows:
- User registration and login still work
- Existing habits display correctly on the dashboard
- Habit completion toggle still works
- Streak calculation still triggers after log creation
- Dashboard analytics (heatmap, charts, scores) still render

---

## 12. Performance Awareness

Write efficient code that respects the system's resource constraints.

### Database

- Use indexes for any field that appears in query filters or sort operations
- Use MongoDB aggregation pipelines for complex data transformations instead of loading all documents into memory
- Avoid N+1 query patterns. Use `populate()` sparingly and prefer denormalization or aggregation
- Use `select()` to fetch only the fields you need
- Set `lean()` on read-only queries that don't need Mongoose document methods

### Caching

- Cache expensive or frequently-accessed query results using the existing `CacheService`
- Use consistent TTL values: 5 minutes for frequently-changing data, 10 minutes for slower-changing data
- Always invalidate affected cache keys when the underlying data changes
- Cache key naming convention: `domain:userId` (e.g., `dashboard:abc123`, `streaks:abc123`)
- Do not cache data that changes on every request or data that is rarely accessed

### Background Jobs

- Offload expensive computations to BullMQ workers instead of handling them in API request handlers
- Keep worker processing idempotent (safe to retry without side effects)
- Use appropriate concurrency settings (high for independent jobs like streaks, low for sequential jobs like analytics)

### Frontend

- Fetch data in parallel using `Promise.all()` when requests are independent
- Avoid unnecessary re-renders by keeping state updates targeted
- Use `useMemo` and `useCallback` only when there is a measurable performance issue, not preemptively

---

## Quick Reference

### File Locations

| What | Where |
|---|---|
| Add a model field | `server/src/models/<Model>.js` |
| Add validation | `server/src/utils/schemas.js` |
| Add business logic | `server/src/services/<domain>.service.js` |
| Add a request handler | `server/src/controllers/<domain>.controller.js` |
| Add an API endpoint | `server/src/routes/<domain>.routes.js` |
| Add a background job | `server/src/workers/<name>.worker.js` |
| Add a frontend API call | `client/src/api/index.js` |
| Add a React component | `client/src/components/<Name>.jsx` |
| Add a page | `client/src/pages/<Name>.jsx` |
| Add a route | `client/src/App.jsx` |
| Add styles | `client/src/App.css` |
| Add an env variable | `server/.env.example` and `server/src/config/index.js` |

### Verification Commands

```bash
# Backend loads cleanly
cd server && node -e "require('./src/app')"

# Frontend builds cleanly
cd client && npm run build

# Server is running
curl http://localhost:5000/health

# MongoDB is connected
curl http://localhost:5000/ready
```

### CSS Design Tokens

```css
--primary: #6366f1
--primary-hover: #4f46e5
--bg: #f8fafc
--surface: #ffffff
--text: #1e293b
--text-muted: #64748b
--border: #e2e8f0
--success: #10b981
--danger: #f43f5e
--radius: 10px
```
