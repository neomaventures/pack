/**
 * A list of common SQL injection attempts for testing purposes.
 * These can be used in tests to ensure that inputs are properly sanitized
 * and that the application is not vulnerable to SQL injection attacks.
 */
export const sqlInjectionAttempts = [
  "1; DROP TABLE users;--",
  "1' OR '1'='1",
  "1' UNION SELECT * FROM users--",
  "admin'--",
]
