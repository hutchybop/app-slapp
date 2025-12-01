# AGENTS.md

## Commands

- **Lint**: `npm run lint` (ESLint with Prettier)
- **Lint fix**: `npm run lint:fix`
- **Test**: No test framework configured (echoes error)
- **Start**: `node app.js` (runs on port 3001)

## Code Style Guidelines

### Import Organization

- External imports first (express, mongoose, etc.)
- Local imports second (controllers, models, utils)
- Use CommonJS require() syntax throughout

### Formatting & Linting

- ESLint with Prettier integration
- ES2021, CommonJS for server files, script sourceType for public JS
- No semicolons required (Prettier handles)

### Naming Conventions

- Controllers: camelCase functions (index, new, create, etc.)
- Models: PascalCase schemas (MealSchema, UserSchema)
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE for enums/arrays

### Error Handling

- Use catchAsync wrapper for async route handlers
- Custom ExpressError class with message and statusCode
- Centralized error handler in utils/errorHandler.js

### Database Patterns

- Mongoose ODM with Schema definitions
- Author field for user ownership
- Population for related documents
- Enum validation for constrained fields

### Security

- MongoDB sanitization middleware
- Helmet for security headers
- Passport.js for authentication
- Session management with MongoStore
