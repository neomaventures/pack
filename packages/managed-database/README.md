# @neoma/managed-database

A managed database fixture for NestJS integration testing with TypeORM. Automatically handles in-memory SQLite database lifecycle for Jest tests.

[![npm version](https://badge.fury.io/js/@neoma%2Fmanaged-database.svg)](https://www.npmjs.com/package/@neoma/managed-database)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Motivation

Integration testing NestJS applications with TypeORM requires setting up and tearing down database connections for each test. This package eliminates the boilerplate by:

- Automatically managing a single DataSource instance across tests
- Using in-memory SQLite for fast, isolated test execution
- Handling initialization and cleanup via Jest lifecycle hooks
- Auto-discovering entities from your project structure

## Problem / Solution

### Without @neoma/managed-database

```typescript
import { DataSource } from "typeorm"
import { User } from "./user.entity"
import { Post } from "./post.entity"

describe("UserRepository", () => {
  let dataSource: DataSource

  beforeEach(async () => {
    // Manually create and initialize datasource for each test
    dataSource = new DataSource({
      type: "sqlite",
      database: ":memory:",
      entities: [User, Post], // Must manually list all entities
      synchronize: true,
    })
    await dataSource.initialize()
  })

  afterEach(async () => {
    // Manually destroy datasource after each test
    await dataSource.destroy()
  })

  it("should create a user", async () => {
    const repo = dataSource.getRepository(User)
    // Test code...
  })
})
```

### With @neoma/managed-database

```typescript
import { managedDatasourceInstance } from "@neoma/managed-database"
import { User } from "./user.entity"

describe("UserRepository", () => {
  it("should create a user", async () => {
    // Get the managed instance - lifecycle handled automatically!
    const dataSource = managedDatasourceInstance()
    const repo = dataSource.getRepository(User)

    const user = await repo.save({ username: "alice" })
    expect(user.id).toBeDefined()
  })

  it("gets a fresh database for each test", async () => {
    // Each test starts with a clean database
    const dataSource = managedDatasourceInstance()
    const repo = dataSource.getRepository(User)

    const users = await repo.find()
    expect(users).toHaveLength(0) // Always starts empty
  })
})
```

## Installation

### 1. Install the package

```bash
npm install --save-dev @neoma/managed-database
```

### 2. Install peer dependencies

```bash
npm install --save-dev sqlite3 typeorm @nestjs/typeorm
npm install @nestjs/common @nestjs/core
```

### 3. Import in your test files

```typescript
import { managedDatasourceInstance } from "@neoma/managed-database"
```

That's it! The package automatically registers Jest hooks when imported, so your database lifecycle is managed automatically.

## Basic Usage

### Repository Testing

```typescript
import { managedDatasourceInstance } from "@neoma/managed-database"
import { User } from "./user.entity"

describe("User Repository", () => {
  it("should create and retrieve users", async () => {
    const dataSource = managedDatasourceInstance()
    const userRepo = dataSource.getRepository(User)

    const user = await userRepo.save({
      username: "alice",
    })

    const found = await userRepo.findOne({ where: { id: user.id } })
    expect(found.username).toBe("alice")
  })
})
```

### Testing Services

```typescript
import { managedDatasourceInstance } from "@neoma/managed-database"
import { UserService } from "./user.service"
import { User } from "./user.entity"

describe("UserService", () => {
  let service: UserService

  beforeEach(() => {
    const dataSource = managedDatasourceInstance()
    service = new UserService(dataSource.getRepository(User))
  })

  it("should create users", async () => {
    const user = await service.create({ username: "alice" })
    expect(user.id).toBeDefined()
  })
})
```

## API Reference

### `managedDatasourceInstance(): DataSource`

Returns the managed DataSource instance for the current test.

**Returns:** `DataSource` - A TypeORM DataSource instance configured with in-memory SQLite

**Lifecycle:**
- Automatically initialized before each test via `beforeEach` hook
- Automatically destroyed after each test via `afterEach` hook
- Returns the same instance within a single test
- Returns a fresh instance for each new test

**Example:**
```typescript
const dataSource = managedDatasourceInstance()
const repo = dataSource.getRepository(User)
```

**Note:** The lifecycle hooks are registered automatically when you import anything from this package, so you don't need to call any setup functions.

### `datasource(): Promise<DataSource>`

Low-level function to create a new DataSource instance. Used internally by `managedDatasourceInstance()`.

**Returns:** `Promise<DataSource>` - A new, initialized DataSource instance

**Configuration:**
- Type: SQLite
- Database: In-memory (`:memory:`)
- Entities: Auto-discovered from `src/**/*.entity.ts`
- Synchronize: Enabled (auto-creates schema)

## Configuration

### Entity Discovery

The package automatically discovers entities from:

```
src/**/*.entity.ts
```

This pattern will find all entity files in your `src` directory and subdirectories. Ensure your entities:

1. Use the `.entity.ts` naming convention
2. Are located under the `src/` directory
3. Export classes decorated with `@Entity()`

**Example Structure:**
```
src/
├── user.entity.ts
├── post.entity.ts
└── modules/
    └── auth/
        └── session.entity.ts
```

All three entities (User, Post, Session) will be automatically discovered.

### Database Configuration

The package uses the following TypeORM configuration:

```typescript
{
  type: "sqlite",
  database: ":memory:",
  entities: ["src/**/*.entity.ts"],
  synchronize: true,
}
```

**Key Features:**
- **SQLite In-Memory:** Each test gets a completely isolated database
- **Auto-Sync:** Schema is automatically created from your entities
- **Fast:** In-memory databases are extremely fast for testing
- **Clean State:** Every test starts with a fresh, empty database

## Why SQLite In-Memory?

Testing with SQLite in-memory provides several advantages:

1. **Speed:** Orders of magnitude faster than traditional databases
2. **Isolation:** Each test gets a completely independent database
3. **Portability:** No external database setup required
4. **CI/CD Friendly:** Works out of the box in any environment
5. **Consistency:** Deterministic test behavior

## Requirements

- Node.js >= 22.0.0
- Jest testing framework
- TypeScript >= 5.0
- NestJS >= 11.0
- TypeORM >= 0.3

## Links

- [npm package](https://www.npmjs.com/package/@neoma/managed-database)
- [GitHub repository](https://github.com/shipdventures/neoma-managed-database)
- [Report Issues](https://github.com/shipdventures/neoma-managed-database/issues)

## Related Packages

- [@neoma/managed-app](https://www.npmjs.com/package/@neoma/managed-app) - Managed NestJS app instances for E2E testing

## License

MIT

---

Built with love by [Shipdventures](https://github.com/shipdventures) for the NestJS community.
