import { Post } from "./post.entity"
import { User } from "./user.entity"

import { managedDatasourceInstance } from "./index"

describe("managedDatasourceInstance", () => {
  it("it should return a Datasource instance with all the project's entities loaded", async () => {
    const targets = managedDatasourceInstance().entityMetadatas.map(
      (metadata) => metadata.target,
    )
    expect(targets).toHaveLength(2)
    expect(targets).toEqual(expect.arrayContaining([User, Post]))
  })

  it("it should return the same instance on subsequent calls", async () => {
    expect(managedDatasourceInstance()).toBe(managedDatasourceInstance())
  })
})
