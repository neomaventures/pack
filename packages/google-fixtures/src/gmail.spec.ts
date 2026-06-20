import { gmail } from "./gmail"

describe("gmail", () => {
  describe("label()", () => {
    describe("Given no overrides", () => {
      it("should default to the INBOX system label", () => {
        const label = gmail.label()

        expect(label.id).toBe("INBOX")
        expect(label.name).toBe("INBOX")
        expect(label.type).toBe("system")
      })

      it("should generate faker-backed message counts", () => {
        const label = gmail.label()

        expect(label.messagesTotal).toBeGreaterThanOrEqual(100)
        expect(label.messagesTotal).toBeLessThanOrEqual(5000)
        expect(label.messagesUnread).toBeGreaterThanOrEqual(0)
        expect(label.messagesUnread).toBeLessThanOrEqual(200)
      })

      it("should mirror message counts onto thread counts", () => {
        const label = gmail.label()

        expect(label.threadsTotal).toBe(label.messagesTotal)
        expect(label.threadsUnread).toBe(label.messagesUnread)
      })
    })

    describe("Given explicit message counts", () => {
      it("should use the provided counts and mirror them onto threads", () => {
        const label = gmail.label({
          messagesTotal: 1234,
          messagesUnread: 56,
        })

        expect(label.messagesTotal).toBe(1234)
        expect(label.messagesUnread).toBe(56)
        expect(label.threadsTotal).toBe(1234)
        expect(label.threadsUnread).toBe(56)
      })
    })

    describe("Given explicit thread counts", () => {
      it("should keep thread counts independent when provided", () => {
        const label = gmail.label({
          messagesTotal: 100,
          messagesUnread: 5,
          threadsTotal: 80,
          threadsUnread: 3,
        })

        expect(label.threadsTotal).toBe(80)
        expect(label.threadsUnread).toBe(3)
      })
    })

    describe("Given a user-defined label override", () => {
      it("should use the provided id, name, and type", () => {
        const label = gmail.label({
          id: "Label_42",
          name: "Receipts",
          type: "user",
        })

        expect(label.id).toBe("Label_42")
        expect(label.name).toBe("Receipts")
        expect(label.type).toBe("user")
      })
    })
  })
})
