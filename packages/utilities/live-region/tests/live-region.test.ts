// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createLiveRegion } from "../src"

let doc: Document

beforeEach(() => {
  vi.useFakeTimers()
  doc = document.implementation.createHTMLDocument("")
})

afterEach(() => {
  vi.useRealTimers()
})

const getRegion = (id: string, d = doc) => d.getElementById(id)

describe("shared region", () => {
  test("is only removed once the last instance is destroyed", () => {
    const a = createLiveRegion({ level: "assertive", document: doc })
    const b = createLiveRegion({ level: "assertive", document: doc })

    const region = getRegion(a.toJSON())
    expect(region).not.toBeNull()
    expect(getRegion(b.toJSON())).toBe(region)

    a.destroy()
    expect(getRegion(b.toJSON())).toBe(region)

    b.announce("Row removed")
    vi.advanceTimersByTime(1)
    expect(region?.textContent).toBe("Row removed")

    b.destroy()
    expect(getRegion(b.toJSON())).toBeNull()
  })

  test("a repeated destroy does not release another instance", () => {
    const a = createLiveRegion({ level: "assertive", document: doc })
    const b = createLiveRegion({ level: "assertive", document: doc })

    a.destroy()
    a.destroy()
    expect(getRegion(b.toJSON())).not.toBeNull()

    b.destroy()
    expect(getRegion(b.toJSON())).toBeNull()
  })

  test("leaves regions of another level or document alone", () => {
    const otherDoc = document.implementation.createHTMLDocument("")
    const polite = createLiveRegion({ level: "polite", document: doc })
    const assertive = createLiveRegion({ level: "assertive", document: doc })
    const other = createLiveRegion({ level: "assertive", document: otherDoc })

    polite.destroy()
    expect(getRegion(polite.toJSON())).toBeNull()
    expect(getRegion(assertive.toJSON())).not.toBeNull()
    expect(getRegion(other.toJSON(), otherDoc)).not.toBeNull()
  })

  test("announce re-creates the region after the last destroy", () => {
    const a = createLiveRegion({ level: "assertive", document: doc })
    a.destroy()
    expect(getRegion(a.toJSON())).toBeNull()

    a.announce("Row removed")
    vi.advanceTimersByTime(1)
    expect(getRegion(a.toJSON())?.textContent).toBe("Row removed")
  })
})
