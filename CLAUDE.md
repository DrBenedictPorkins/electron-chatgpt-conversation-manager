# CLAUDE.md - Development Guidelines

## Commands
- Run application: `npm start`
- Build: None configured yet
- Test: None configured yet
- Lint: None configured yet

## Code Conventions
- JavaScript (not TypeScript)
- camelCase for variables and functions
- PascalCase for classes/constructors
- Use ES6+ features (arrow functions, destructuring, etc.)
- Keep functions small and focused
- Add JSDoc comments for functions

## Project Structure
- main.js: Electron main process
- index.html: Application UI
- No current separation of concerns

## Electron Configuration
- Node.js integration enabled in renderer
- Context isolation disabled
- Default window size: 800x600

## Error Handling
- Use try/catch blocks for async operations
- Log errors with appropriate context