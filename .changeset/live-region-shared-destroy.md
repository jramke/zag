---
"@zag-js/live-region": patch
---

Fixed issue where destroying one live region removed the region it shared with every other instance of the same level
and document. Closing a Select could delete the region a TagsInput or DateInput on the page still announced into, so its
next announcement was dropped. The region is now removed when the last instance using it is destroyed.
