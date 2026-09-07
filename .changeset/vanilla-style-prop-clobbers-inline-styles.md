---
"@zag-js/vanilla": patch
---

Fix `spreadProps` replacing the entire `style` attribute whenever the serialized `style` prop string changed, which wiped out any inline style properties set on the same element outside of Zag's prop system (e.g. `@zag-js/dismissable`'s layer-stack, which writes `--layer-index`/`--nested-layer-count`/`--z-index` directly via `element.style.setProperty(...)`).

`style` is now reconciled property by property - only the CSS properties Zag itself computed are added, updated, or removed, and any other inline style on the element is left untouched. This mirrors how the React adapter patches styles.
