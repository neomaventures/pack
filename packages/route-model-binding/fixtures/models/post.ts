import { faker } from "@faker-js/faker"
import { Post } from "src/post.entity"

export const post = {
  /**
   * Creates a fake post entity.
   *
   * @param [params] - Optional parameters to override default values.
   * @param [params.id] - Unique identifier for the post.
   * @param [params.content] - The post's content.
   *
   * @return A new instance of a User with the provided or default values.
   */
  entity(
    {
      id = crypto.randomUUID(),
      content = faker.hacker.phrase(),
      deletedAt = null,
    }: Partial<Post> = {
      id: crypto.randomUUID(),
      content: faker.hacker.phrase(),
      deletedAt: null,
    },
  ): Post {
    return Object.assign(new Post(), {
      id,
      content,
      deletedAt,
    })
  },
}
