import { faker } from "@faker-js/faker"
import { User } from "src/user.entity"

export const user = {
  /**
   * Creates a fake user entity.
   *
   * @param [params] - Optional parameters to override default values.
   * @param [params.id] - Unique identifier for the user.
   * @param [params.username] - The User's username.
   *
   * @return A new instance of a User with the provided or default values.
   */
  entity({
    id = crypto.randomUUID(),
    username = faker.internet.email(),
    deletedAt = null,
  }: Partial<User> = {}): User {
    return Object.assign(new User(), {
      id,
      username,
      deletedAt,
    })
  },
}
