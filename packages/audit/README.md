# @neoma/audit

NestJS-idiomatic audit trails. Argos (Odysseus's faithful dog -- waited twenty years and never forgot) tracks **who** changed your entities and **when**.

## Installation

```bash
npm install @neoma/audit
```

Peer dependencies: `@nestjs/common`, `@nestjs/core`, `typeorm`

## Quick Start

### 1. Register the module

```typescript
import { ArgosModule } from "@neoma/audit"

@Module({
  imports: [
    ArgosModule.forRoot({
      resolveActor: (req) =>
        req.principal ? `principal:${req.principal.id}` : null,
    }),
  ],
})
export class AppModule {}
```

Or with async configuration:

```typescript
ArgosModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    resolveActor: (req) =>
      req.principal ? `principal:${req.principal.id}` : null,
  }),
  inject: [ConfigService],
})
```

### 2. Decorate your entities

```typescript
import { CreatedBy, UpdatedBy } from "@neoma/audit"

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public amount!: number

  @CreatedBy()
  public createdBy!: string

  @UpdatedBy()
  public updatedBy!: string
}
```

That's it. `createdBy` is set on insert, `updatedBy` is set on every save.

## Configuration

### `ArgosOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `resolveActor` | `(req: Request) => string \| null \| undefined \| Promise<string \| null \| undefined>` | `undefined` | Extracts the actor from the request. Return `null` or `undefined` to use the default. |
| `defaultActor` | `string` | `"system"` | Actor used when `resolveActor` is absent or returns `null` or `undefined`. |

### Actor format

Actors are prefixed strings -- not foreign keys:

- `principal:uuid` -- authenticated user
- `api:name` -- API key
- `webhook:source` -- webhook caller
- `system` -- unauthenticated or background

## Known Constraints

- **Must use `repository.save()` / `repository.remove()`** -- `manager.update()`, QueryBuilder, etc. bypass entity listeners silently.
- **`@CreatedBy()` sets on insert** and is never overwritten on update.
- **`@UpdatedBy()` sets on every `save()`** -- both insert and update.
