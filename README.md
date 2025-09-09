# Turbopack Edge Runtime Bug Reproduction

This is a minimal reproduction of the Turbopack Edge Runtime error that occurs when using webpack loaders with middleware files.

## The Bug

When both conditions are met:
1. A middleware file exists (`src/middleware.ts`)
2. Webpack loaders are configured in Turbopack rules that match the middleware file (e.g., `**/*.ts`)

Turbopack throws an error from its own internal code when it processes the middleware file with the webpack loader:
```
## Error Type
Runtime Error

## Error Message
[turbopack-node]/transforms/transforms.ts:53:10
lint TP1006 path.join(???*0*, (???*2* ? ???*5* : ???*7*)) is very dynamic
  51 | }
  52 | export const fromPath = (path: string) => {
> 53 |   return join(contextDir, sep !== '/' ? path.replaceAll('/', sep) : path)
     |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  54 | }
  55 |
  56 | // Patch process.env to track which env vars are read

- *0* process.cwd*1*()
  ⚠️  process.cwd is not specified in the environment
  ⚠️  This value might have side effects
```

## Steps to Reproduce

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```
   
   This will throw the error because the project uses Turbopack by default.

## Root Cause

The error occurs when Turbopack processes Edge Runtime files (like middleware) with webpack loaders. Here's what happens:

1. The webpack loader rule `'**/*.{jsx,tsx,js,ts,mjs,mts}'` matches the middleware.ts file
2. Turbopack uses its internal webpack loader handling code (`[turbopack-node]/transforms/transforms.ts`) to process the file
3. This internal code uses Node.js APIs like `process.cwd()` and `path.join()`
4. Because middleware runs in Edge Runtime, Turbopack performs static analysis on ALL code involved - including its own internal transform code
5. The analyzer detects these Node.js APIs in Turbopack's own code and throws an error

The specific problematic line is:
```typescript
return join(contextDir, sep !== '/' ? path.replaceAll('/', sep) : path)
```

This uses:
- `process.cwd()` (via `contextDir`)
- `path.join()`
- `path.sep`

All of which are Node.js-specific APIs that are not available in the Edge Runtime.

## Files

### `src/middleware.ts`
A minimal middleware file - its mere existence triggers the bug:
```typescript
// Simple middleware file - its mere existence triggers the bug
export function middleware() {
}
```

### `minimal-loader.js`
A webpack loader that does nothing (shows the bug isn't in the loader):
```javascript
module.exports = function(content) {
  return content;
};
```

### `next.config.ts`
Configures Turbopack to use the loader:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // Apply minimal loader to all JS/TS files including middleware.ts
      '**/*.{jsx,tsx,js,ts,mjs,mts}': {
        loaders: [{
          loader: './minimal-loader.js',
          options: {}
        }]
      }
    }
  }
};

export default nextConfig;
```

## Expected Behavior

Turbopack's internal code should be exempt from Edge Runtime static analysis, or should be rewritten to be Edge-compatible.