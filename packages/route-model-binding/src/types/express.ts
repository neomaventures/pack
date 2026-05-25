declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      /**
       * Models resolved from route parameters by
       * {@link RouteModelBindingMiddleware}, keyed by the route parameter name.
       */
      routeModels?: Record<string, unknown>
    }
  }
}

export {}
