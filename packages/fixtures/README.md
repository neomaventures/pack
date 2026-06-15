# @neomaventures/fixtures

Test fixtures for @neomaventures/* NestJS packages. Provides mock Express and NestJS objects, custom Jest matchers, and a mock logger for unit-testing NestJS building blocks (guards, interceptors, filters, pipes, middleware).

## Installation

```bash
npm install --save-dev @neomaventures/fixtures
```

### Peer dependencies

- `@nestjs/common` 11.x
- `jest` >= 29.0.0
- `@types/jest` >= 29.0.0

## Usage

### Express mocks

```typescript
import { express } from '@neomaventures/fixtures'
import type { MockRequest, MockResponse } from '@neomaventures/fixtures'

// Create a request with randomized defaults
const req = express.request()

// Override specific properties
const customReq = express.request({
  method: 'POST',
  headers: { authorization: 'Bearer token' },
  body: { name: 'test' },
})

// Case-insensitive header access
req.get('Authorization')   // => 'Bearer token'
req.get('authorization')   // => 'Bearer token'
req.header('Authorization') // => 'Bearer token'

// Create a response with locals and headers
const res = express.response({
  locals: { user: { id: 'abc' } },
  headers: { 'Content-Type': 'text/html' },
})

// status() sets statusCode AND returns this for chaining
res.status(404).json({ error: 'Not found' })
expect(res.statusCode).toBe(404)
expect(res.json).toHaveBeenCalledWith({ error: 'Not found' })

// Mutable headers
res.setHeader('X-Custom', 'value')
res.getHeader('x-custom') // => 'value'

// Create a signed cookie (HMAC-SHA256, cookie-parser format)
const cookie = express.cookie('user123', 'my-secret')
const jsonCookie = express.cookie({ userId: 'abc' }, 'my-secret')
```

### NestJS ExecutionContext

```typescript
import { executionContext, express } from '@neomaventures/fixtures'

// Minimal context (just switchToHttp)
const ctx = executionContext(req, res)
ctx.switchToHttp().getRequest()  // => req
ctx.switchToHttp().getResponse() // => res

// With bare handler function (for isolated guard testing)
const handler = (): void => {}
Reflect.defineMetadata('roles', ['admin'], handler)
const ctx = executionContext(req, res, handler)
ctx.getHandler() // => handler
ctx.getClass()   // => Object

// With custom class
const ctx = executionContext(req, res, handler, MyController)
ctx.getClass() // => MyController

// With typed route object (for integration-style testing)
const ctx = executionContext(req, res, {
  controller: UserController,
  method: 'findAll',
})
ctx.getHandler() // => UserController.prototype.findAll
ctx.getClass()   // => UserController
```

### MockLoggerService

```typescript
import { MockLoggerService } from '@neomaventures/fixtures'

const logger = new MockLoggerService()
// Implements the `Logger` contract from `@neomaventures/logging`.
// All six methods (trace, debug, info, warn, error, fatal) are jest.fn().

logger.error('something failed', { err: new Error('boom') })
expect(logger.error).toHaveBeenCalledWith(
  'something failed',
  expect.objectContaining({ err: expect.any(Error) }),
)
```

### Custom Jest matchers

Add to your Jest config's `setupFilesAfterEnv`:

```json
{
  "setupFilesAfterEnv": ["@neomaventures/fixtures/matchers"]
}
```

Then use in tests:

```typescript
// Check that a function throws a specific error class
expect(() => service.register(email)).toThrowMatching(
  EmailAlreadyExistsException,
)

// Check class + properties
expect(() => service.register(email)).toThrowMatching(
  EmailAlreadyExistsException,
  { email: 'test@example.com' },
)

// Check an already-caught error
expect(caughtError).toMatchError(NotFoundException, { message: 'Not found' })
```

## License

MIT
