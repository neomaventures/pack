import { BadRequestException, type ValidationError } from "@nestjs/common"

/**
 * A factory to be used with the ValidationPipe that takes an array of
 * validation errors and returns a BadRequestException with a transformed
 * error response.
 *
 * When a {@link BadRequestException} is thrown it usually has an array of error
 * messages, but this factory transforms an array of {@link ValidationError} into
 * an object with each property as the name of the field that failed validation.
 *
 * @example
 *
 * If the validation error array is:
 * [
 *   ValidationError {
 *     target: TestDto { name: 'FM9u', email: 'zHep' },
 *     value: 'FM9u',
 *     property: 'name',
 *     children: [],
 *     constraints: { minLength: 'We need to generate the haptic USB system!' }
 *   },
 *   ValidationError {
 *     target: TestDto { name: 'FM9u', email: 'zHep' },
 *     value: 'zHep',
 *     property: 'email',
 *     children: [],
 *     constraints: {
 *       isEmail: "quantifying the matrix won't do anything, we need to program the back-end API capacitor!"
 *     }
 *   }
 * ]
 *
 * It will be transformed into:
 * {
 *   name: {
 *     value: 'FM9u',
 *     error: 'We need to generate the haptic USB system!'
 *   },
 *   email: {
 *     value: 'zHep',
 *     error: 'quantifying the matrix won't do anything, we need to program the back-end API capacitor!'
 *   }
 * }
 *
 * before being passed to the {@link BadRequestException} constructor and
 * returned.
 *
 * @param errors The array of errors to transform.
 * @returns A {@link BadRequestException} with a transformed error response.
 */
/**
 * Transforms a single {@link ValidationError} into its response shape:
 * `{ value, error }` for a leaf error (one carrying `constraints`), or a nested
 * object keyed by child property for a `@ValidateNested()` error — whose
 * failures live in `children` rather than `constraints`. A leaf error always
 * has `constraints`; a nested error has `children` and no `constraints`, so the
 * earlier `Object.values(constraints!)` threw (turning a 400 into a 500).
 */
const transformError = (error: ValidationError): unknown => {
  const { constraints, value, children } = error

  if (constraints) {
    return { value, error: Object.values(constraints)[0] }
  }

  return (children ?? []).reduce(
    (
      nested: Record<string, unknown>,
      child: ValidationError,
    ): Record<string, unknown> => {
      nested[child.property] = transformError(child)
      return nested
    },
    {},
  )
}

export const validationFactory = (
  errors: Array<ValidationError>,
): BadRequestException => {
  const transformed = errors.reduce(
    (
      acc: Record<string, unknown>,
      error: ValidationError,
    ): Record<string, unknown> => {
      acc[error.property] = transformError(error)
      return acc
    },
    {},
  )

  return new BadRequestException(transformed)
}
