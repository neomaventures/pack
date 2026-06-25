// Module
export * from "./exception-handler.module"

// Filters
export * from "./filters/exception.filter"

// Decorators (ErrorTemplateMetadata is the internal stored shape — kept out of
// the public surface; the decorator + bridge guard import it directly)
export {
  ErrorTemplate,
  ERROR_TEMPLATE_KEY,
  type ErrorTemplateOptions,
} from "./decorators/error-template.decorator"

// Interfaces
export * from "./interfaces/neoma-exception.interface"

// Pipes
export * from "./pipes/validation.factory"
