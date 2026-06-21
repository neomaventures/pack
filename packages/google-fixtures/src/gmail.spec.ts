import { gmail } from "./gmail"

describe("gmail", () => {
  describe("label()", () => {
    describe("Given no overrides", () => {
      it("should default to an INBOX system label with faker-backed counts mirrored onto threads", () => {
        const label = gmail.label()

        expect(label).toEqual({
          id: "INBOX",
          name: "INBOX",
          type: "system",
          messagesTotal: expect.any(Number),
          messagesUnread: expect.any(Number),
          threadsTotal: label.messagesTotal,
          threadsUnread: label.messagesUnread,
        })
        expect(label.messagesTotal).toBeWithin(100, 5001)
        expect(label.messagesUnread).toBeWithin(0, 201)
      })
    })

    describe("Given explicit message counts without thread counts", () => {
      it("should use the provided message counts and mirror them onto threads", () => {
        const label = gmail.label({
          messagesTotal: 1234,
          messagesUnread: 56,
        })

        expect(label).toMatchObject({
          messagesTotal: 1234,
          messagesUnread: 56,
          threadsTotal: 1234,
          threadsUnread: 56,
        })
      })
    })

    describe("Given explicit thread counts", () => {
      it("should keep thread counts independent from message counts", () => {
        const label = gmail.label({
          messagesTotal: 100,
          messagesUnread: 5,
          threadsTotal: 80,
          threadsUnread: 3,
        })

        expect(label).toMatchObject({
          messagesTotal: 100,
          messagesUnread: 5,
          threadsTotal: 80,
          threadsUnread: 3,
        })
      })
    })

    describe("Given a user-defined label override", () => {
      it("should use the provided id, name, and type", () => {
        const label = gmail.label({
          id: "Label_42",
          name: "Receipts",
          type: "user",
        })

        expect(label).toMatchObject({
          id: "Label_42",
          name: "Receipts",
          type: "user",
        })
      })
    })
  })
})
