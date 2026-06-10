---
"@neomaventures/route-model-binding": minor
---

Throw a descriptive `RouteModelBindingNotAppliedException` (HTTP 500) when
`@RouteModel(...)` is invoked on a route where `RouteModelBindingMiddleware`
has not been applied, instead of surfacing as a generic 404.

Behaviour change: routes that previously returned `404 NotFoundException`
with message `Could not find <param> with id unknown` because the middleware
was not wired up will now return `500 RouteModelBindingNotAppliedException`
naming the param and pointing at `RouteModelBindingMiddleware`. Consumers
relying on the 404 response for an unwired route are misusing the package;
wire the middleware in your module's `configure()`.

Behaviour for resolved-but-missing entities (`null` lookup) and for routes
where the middleware ran but the param key was not declared is unchanged
(still `404 NotFoundException`).
