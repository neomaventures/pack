import { Post } from "./post.entity"
import { User } from "./user.entity"

import { managedDatasourceInstance } from "./index"

const targetsOf = (ds: { entityMetadatas: { target: unknown }[] }): unknown[] =>
  ds.entityMetadatas.map((metadata) => metadata.target)

describe("managedDatasourceInstance", () => {
  describe("with the default entities (src glob)", () => {
    it("loads all the project's entities", async () => {
      const ds = await managedDatasourceInstance()
      expect(targetsOf(ds)).toEqual(expect.arrayContaining([User, Post]))
      expect(ds.entityMetadatas).toHaveLength(2)
    })

    it("returns the cached instance for the same config within a test", async () => {
      expect(await managedDatasourceInstance()).toBe(
        await managedDatasourceInstance(),
      )
    })
  })

  describe("given an explicit array of entity classes", () => {
    it("registers only those entities", async () => {
      const ds = await managedDatasourceInstance([User])
      expect(targetsOf(ds)).toEqual([User])
    })
  })

  describe("given an explicit glob", () => {
    it("loads only the entities matching the glob", async () => {
      const ds = await managedDatasourceInstance(["src/post.entity.ts"])
      expect(targetsOf(ds)).toEqual([Post])
    })
  })

  it("caches distinct instances per config", async () => {
    const users = await managedDatasourceInstance([User])
    const posts = await managedDatasourceInstance([Post])
    expect(users).not.toBe(posts)
    expect(targetsOf(users)).toEqual([User])
    expect(targetsOf(posts)).toEqual([Post])
  })
})
