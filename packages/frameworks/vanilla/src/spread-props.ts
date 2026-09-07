export interface Attrs {
  [key: string]: any
}

const prevAttrsMap = new WeakMap<Element, Map<string, Attrs>>()

// CSS property names previously applied to an element's inline style by `spreadProps` itself,
// keyed like `prevAttrsMap`. Tracked separately so the `style` prop can be reconciled property by
// property instead of replacing the whole `style` attribute.
const prevStylePropsMap = new WeakMap<Element, Map<string, Set<string>>>()

const assignableProps = new Set<string>(["value", "checked", "selected"])

// SVG attributes that need to preserve case
const caseSensitiveSvgAttrs = new Set<string>([
  "viewBox",
  "preserveAspectRatio",
  "clipPath",
  "clipRule",
  "fillRule",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
])

// Check if element is SVG
const isSvgElement = (node: Element): boolean => {
  return node.tagName === "svg" || node.namespaceURI === "http://www.w3.org/2000/svg"
}

// Get the correct attribute name, preserving case for SVG attributes
const getAttributeName = (node: Element, attrName: string): string => {
  const shouldPreserveCase = isSvgElement(node) && caseSensitiveSvgAttrs.has(attrName)
  return shouldPreserveCase ? attrName : attrName.toLowerCase()
}

// Scratch element reused to parse style strings via the browser's own CSS parser (see
// `parseStyleString`) rather than a naive `;`-split, which would break on a semicolon that's part
// of a value itself (e.g. `content: "a;b"`, or a `data:` URI's `;base64,`).
const styleParserEl = typeof document !== "undefined" ? document.createElement("div") : null

// Parses a `prop:value;` style string back into a map
const parseStyleString = (style: string): Map<string, string> => {
  const result = new Map<string, string>()
  if (!styleParserEl) return result
  styleParserEl.style.cssText = style
  for (let i = 0; i < styleParserEl.style.length; i++) {
    const prop = styleParserEl.style.item(i)
    result.set(prop, styleParserEl.style.getPropertyValue(prop))
  }
  return result
}

// Reconciles the element's inline style against only the CSS properties Zag previously applied
// for this scope, adding/updating/removing exactly those - never touching any other property that
// may be present on the element's `style`.
const applyStyle = (node: Element, style: unknown, scopeKey: string): void => {
  if (!("style" in node)) return
  const declaration = (node as HTMLElement).style

  let machineMap = prevStylePropsMap.get(node)
  if (!machineMap) {
    machineMap = new Map<string, Set<string>>()
    prevStylePropsMap.set(node, machineMap)
  }

  const prevProps = machineMap.get(scopeKey) ?? new Set<string>()
  const nextProps = parseStyleString(typeof style === "string" ? style : "")

  for (const prop of prevProps) {
    if (!nextProps.has(prop)) declaration.removeProperty(prop)
  }
  for (const [prop, value] of nextProps) {
    declaration.setProperty(prop, value)
  }

  machineMap.set(scopeKey, new Set(nextProps.keys()))
}

export function spreadProps(node: Element, attrs: Attrs, machineId?: string): () => void {
  const scopeKey = machineId || "default"

  let machineMap = prevAttrsMap.get(node)
  if (!machineMap) {
    machineMap = new Map<string, Attrs>()
    prevAttrsMap.set(node, machineMap)
  }

  const oldAttrs = machineMap.get(scopeKey) || {}

  const attrKeys = Object.keys(attrs)

  const addEvt = (e: string, f: EventListener) => {
    node.addEventListener(e.toLowerCase(), f)
  }

  const remEvt = (e: string, f: EventListener) => {
    node.removeEventListener(e.toLowerCase(), f)
  }

  const onEvents = (attr: string) => attr.startsWith("on")
  const others = (attr: string) => !attr.startsWith("on")

  const setup = (attr: string) => addEvt(attr.substring(2), attrs[attr])
  const teardown = (attr: string) => remEvt(attr.substring(2), attrs[attr])

  const apply = (attrName: string) => {
    const value = attrs[attrName]

    const oldValue = oldAttrs[attrName]
    if (value === oldValue) return

    // Handle class as property (faster than setAttribute)
    if (attrName === "class") {
      ;(node as HTMLElement).className = value ?? ""
      return
    }

    // Reconcile style property-by-property instead of replacing the whole attribute
    if (attrName === "style") {
      applyStyle(node, value, scopeKey)
      return
    }

    // Handle DOM properties (value, checked, etc.) - must come before boolean check
    if (assignableProps.has(attrName)) {
      ;(node as any)[attrName] = value ?? ""
      return
    }

    // Handle boolean attributes with toggleAttribute (for non-property booleans like disabled, hidden)
    // Also skip aria- attributes to preserve their string values
    if (typeof value === "boolean" && !attrName.includes("aria-")) {
      ;(node as HTMLElement).toggleAttribute(getAttributeName(node, attrName), value)
      return
    }

    // Special handling for children attribute
    if (attrName === "children") {
      node.innerHTML = value
      return
    }

    if (value != null) {
      node.setAttribute(getAttributeName(node, attrName), value)
      return
    }

    node.removeAttribute(getAttributeName(node, attrName))
  }

  // reconcile old attributes (must match apply logic)
  for (const key in oldAttrs) {
    if (attrs[key] == null) {
      if (key === "class") {
        ;(node as HTMLElement).className = ""
      } else if (key === "style") {
        applyStyle(node, undefined, scopeKey)
      } else if (assignableProps.has(key)) {
        ;(node as any)[key] = ""
      } else {
        node.removeAttribute(getAttributeName(node, key))
      }
    }
  }

  const oldEvents = Object.keys(oldAttrs).filter(onEvents)
  oldEvents.forEach((evt) => {
    remEvt(evt.substring(2), oldAttrs[evt])
  })

  attrKeys.filter(onEvents).forEach(setup)
  attrKeys.filter(others).forEach(apply)

  machineMap.set(scopeKey, attrs)

  return function cleanup() {
    attrKeys.filter(onEvents).forEach(teardown)
    const currentMachineMap = prevAttrsMap.get(node)
    if (currentMachineMap) {
      currentMachineMap.delete(scopeKey)
      if (currentMachineMap.size === 0) {
        prevAttrsMap.delete(node)
      }
    }
    const currentStyleMap = prevStylePropsMap.get(node)
    if (currentStyleMap) {
      currentStyleMap.delete(scopeKey)
      if (currentStyleMap.size === 0) {
        prevStylePropsMap.delete(node)
      }
    }
  }
}
