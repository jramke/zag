---
"@zag-js/file-upload": minor
---

- Move focus to the next file's delete trigger when a file is removed, falling back to the previous one, then the
  trigger, then the dropzone. Clearing all files moves focus to the trigger, then the dropzone.
- Announce added and removed files to screen readers. Customize the messages with `translations.filesAdded` and
  `translations.fileDeleted`.
