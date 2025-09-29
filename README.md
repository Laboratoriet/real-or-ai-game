# Real or AI? — Can you spot the synthetic memories

A fast, minimalist guessing game by Alkemist where you decide if an image is a real photograph or AI‑generated. As models improve, the gap between reality and synthesis shrinks. This game challenges your perception — one image at a time on mobile, side‑by‑side on desktop — and tracks how sharp your eye really is.

## How it works

- **Goal**: Identify AI images correctly and build your streak.
- **Rounds**: A session runs for 10 attempts; then you’ll see your summary with accuracy and tips.
- **Scoring**: +1 for a correct guess. Streak resets on a miss. Confetti every 5 in a row.
- **Categories**: Filter by `people`, `nature`, `city`, `interior`, or play `all`.
- **Summary & sharing**: After 10 attempts, get dynamic feedback and a copy‑ready share message.

### Desktop gameplay
- You see a pair of images from the same category.
- **Your task**: Click the image you believe is **AI‑generated**.
- Instant feedback appears; the next pair loads automatically.
- Keyboard: `←` selects the left image, `→` selects the right image.

### Mobile gameplay
- You see a single image at a time.
- **Your task**: Tap **Real** or **AI**.
- Instant feedback overlays briefly; the next image advances automatically.
- Keyboard (optional): `←` for Real, `→` for AI.

## Live demo
- Play it here: [`www.aikemist.no`](https://aikemist.no)
- Read about it here: [`alkemist.no/realorai`](https://alkemist.no/realorai)

## Tech stack
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: lucide-react

## Getting started

### Prerequisites
- Node.js 18+ recommended
- pnpm installed (`npm i -g pnpm`)

### Installation
1. Clone the repo
   ```sh
   git clone https://github.com/alkemist-ai/real-or-ai-game.git
   cd real-or-ai-game
   ```
2. Install dependencies
   ```sh
   pnpm install
   ```
3. Start the dev server
   ```sh
   pnpm dev
   ```
4. Open the app at `http://localhost:5173`.

### Build
```sh
pnpm build
```
The static site is emitted to `dist/` and can be hosted on any static host (Vercel, Netlify, S3, etc.).

## Content and categories
Images live under `public/images/` in the following structure:

```
public/images/
  people/
    real/               # real photographs
    ai/                 # AI-generated images
    lqip/               # auto-generated low-quality placeholders (do not edit)
  nature/
    real/
    ai/
    lqip/
  city/
    real/
    ai/
    lqip/
  interior/
    real/
    ai/
    lqip/
```

- Filenames are simple sequential numbers like `1.jpg`, `2.jpg`, ... for consistency.
- LQIP placeholders are generated per folder into a `lqip/` subfolder; these are used for faster, smoother image loading.

## Adding and organizing new photos
When adding new images, we recommend this workflow to keep things tidy and fast:

1) Drop your images into the correct category and type
- Place files into `public/images/<category>/(real|ai)/`.
- Mixed formats are OK initially (`.png`, `.jpeg`, `.webp`, uppercase `.JPG`).

2) Standardize everything to `.jpg` (destructive rename/delete of originals)
```sh
node scripts/standardize-images-to-jpg.mjs
```
- Converts `.png`, `.jpeg`, `.webp`, `.gif`, and uppercase `.JPG` to `.jpg` using `sharp`.
- After a successful conversion, the original file is deleted. Ensure you have backups.

3) Rename images sequentially per folder
```sh
node scripts/rename_images.cjs
```
- Renames files in each `(real|ai)` folder to `1.jpg`, `2.jpg`, ...
- Safe to re-run; it detects and preserves already-correct names.

4) Generate LQIPs (low‑quality placeholders)
```sh
node scripts/generate-lqips.mjs
```
- Creates blurred, tiny `.jpg` placeholders inside each `lqip/` subfolder.
- Skips existing LQIPs; safe to re-run any time.

### Script details and caveats
- `scripts/standardize-images-to-jpg.mjs`
  - Uses `sharp` to convert to `.jpg` and auto-rotate from EXIF.
  - Warning: Deletes the original after a successful conversion.
- `scripts/rename_images.cjs`
  - Sequentially renames within each category’s `real/` and `ai/` folders.
  - Ignores hidden files and preserves already-numbered items.
- `scripts/generate-lqips.mjs`
  - Walks the tree, skips `lqip/` folders, and writes blurred thumbnails.

If you add new categories, ensure you mirror the same `real/`, `ai/`, and `lqip/` structure.

## NPM scripts (one‑liners)
You can run the image utilities via `pnpm` scripts defined in `package.json`:

```sh
# Convert non-JPGs/uppercase .JPG to .jpg (deletes originals after success)
pnpm images:standardize

# Rename files within each (real|ai) folder to 1.jpg, 2.jpg, ...
pnpm images:rename

# Generate blurred placeholders into lqip/ subfolders
pnpm images:lqip
```

## Controls and UX notes
- **Desktop**: Click to choose; `←/→` to select left/right.
- **Mobile**: Tap Real/AI; `←/→` also work if a keyboard is present.
- Feedback is brief; the game auto-advances to keep flow snappy.
- Category changes reset score and immediately load relevant images.

## Development notes
- Image selection avoids recently shown files to keep rounds fresh.
- After 10 attempts, the summary screen appears with accuracy, streak, and tips.
- Confetti triggers on every multiple of 5 correct streak on a correct answer.

## License
Copyright © Alkemist. All rights reserved. 