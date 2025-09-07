# File saving & reading (safe JSON operations)

Purpose
- Explain how this project reads and writes JSON files on disk safely, and where to find the utilities.

Where to look in code
- File utilities are implemented at the top of `server.js`:
  - `saveJsonToFile` function: starts at line ~14.
  - `readJsonFromFile` function: starts at line ~94.

What these functions do (simple explanation)
- readJsonFromFile(filePath)
  - Opens a file at `filePath`, reads its text, and parses JSON.
  - Returns the parsed object or array, or `null` on error.
  - Useful when you need to load current data (e.g., `src/data/products.json`) before modifying it.

- saveJsonToFile(data, filePath)
  - Validates `data` (not null/undefined).
  - Creates directories if needed.
  - Makes a `.backup` copy of the existing file when present.
  - Writes to a temporary file first (atomic write): `file.temp` then renames to the real file. This reduces the risk of a corrupted file if the process crashes mid-write.
  - Compares existing content with new content to avoid unnecessary writes.
  - Returns `true` when successful, `false` on failure.

Why these precautions are used
- Backups: Keep a copy of the previous version so you can recover if something goes wrong.
- Temp file + rename: Most file systems guarantee that rename is atomic. Writing to a temp file then renaming minimizes the chance of leaving a half-written file.
- Avoiding unnecessary writes: Reduces wear and frequent file operations and prevents triggering unnecessary events.

Student tips
- If you're writing small JSON files for a project, use a pattern like this to avoid data loss.
- Always handle errors; networked or multi-user systems can try to write the same file at once.

Code pointers
- Example calls in `server.js`:
  - `saveJsonToFile(products, 'src/data/products.json')` when saving product updates (around line 228).
  - `saveJsonToFile(data, filePath)` used by the generic `/api/savefile` endpoint (around lines 536-556).
