import { faker } from "@faker-js/faker"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"

export const factories = {
  user: (overrides: Partial<User> = {}): User =>
    Object.assign(new User(), {
      id: crypto.randomUUID(),
      username: faker.internet.email(),
      deletedAt: null,
      ...overrides,
    }),

  post: (overrides: Partial<Post> = {}): Post =>
    Object.assign(new Post(), {
      id: crypto.randomUUID(),
      content: faker.hacker.phrase(),
      deletedAt: null,
      ...overrides,
    }),
}
