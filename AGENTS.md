# AGENTS.md

## Build, Lint, and Test Commands
- **Development server:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Test:** _No test script found; add one in package.json as needed (e.g. with Jest or Vitest)._

## Running a Single Test
- _No test runner configured. If using Jest, add:_
  - `npm test path/to/testfile`
- _If using another runner, update this section accordingly._

## Code Style Guidelines
- **Imports:** Use ES6 `import`/`export` syntax. Group external imports first, then internal.
- **Formatting:** Follow Prettier/Next.js defaults. Indent with 2 spaces. Use semicolons.
- **Types:** Use TypeScript for type safety in `.ts`/`.tsx` files. JS files should use JSDoc for complex types.
- **Naming:** Use camelCase for variables/functions, PascalCase for components/classes, UPPER_SNAKE_CASE for constants.
- **Error Handling:** Always catch and handle errors in async code. Use helper functions like `handleApiError` and `validateApiResponse` (see `app/lib/apiHandler.js`).
- **Components:** Prefer functional React components. Use prop destructuring and default values.
- **CSS:** Use Tailwind classes for styling. Avoid inline styles unless necessary.
- **File Structure:** Organize by feature/module. Place shared utilities in `lib/`.
- **ESLint:** Follows `eslint:recommended` with Babel parser. See `.eslintrc.json`.
- **TypeScript:** See `tsconfig.json` for config. JS interop allowed.
- **Path Aliases:** Use `@/*` for root imports (see `jsconfig.json`).

## Special Rules
- _No Cursor or Copilot rules detected. Add them here if needed._

---

If you add test scripts or style rules, update this file to keep agents in sync with project conventions.
