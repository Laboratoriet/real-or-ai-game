import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const TARGET_EXTENSION = '.jpg';
const NON_JPG_EXTENSIONS = ['.jpeg', '.png', '.webp', '.gif']; // Files to convert
const LQIP_SUBFOLDER_NAME = 'lqip'; // To avoid processing LQIPs if they exist in subfolders

async function findProcessableImageFiles(dir) {
  let files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name.toLowerCase() === LQIP_SUBFOLDER_NAME) {
        // console.log(`Skipping LQIP directory: ${fullPath}`);
        continue; // Skip the 'lqip' subfolder
      }
      files = files.concat(await findProcessableImageFiles(fullPath));
    } else {
      const originalExt = path.extname(item.name); // Get original extension with its case
      const lowerExt = originalExt.toLowerCase();

      // Process if it's a non-JPG extension that needs conversion,
      // OR if it's an original .JPG (uppercase) that needs to be standardized to .jpg (lowercase)
      if (NON_JPG_EXTENSIONS.includes(lowerExt) || originalExt === '.JPG') {
        files.push(fullPath);
      }
    }
  }
  return files;
}

async function standardizeImage(filePath) {
  const originalExt = path.extname(filePath); // Get original extension with its case
  const dirname = path.dirname(filePath);
  // Ensure basename is derived correctly, and then always append lowercase .jpg
  const basename = path.basename(filePath, originalExt); 
  const targetPath = path.join(dirname, `${basename}${TARGET_EXTENSION}`); // TARGET_EXTENSION is .jpg (lowercase)

  // If the filePath is already the targetPath (e.g. it was already lowercase .jpg), nothing to do.
  if (filePath === targetPath) {
    // console.log(`File ${filePath} is already in target format and case. Skipping.`);
    return;
  }

  // Safety check: if a .jpg version already exists, and it's not the same file path (e.g. .jpeg to .jpg)
  // This is a basic check. More robust would be to compare content or modification times if needed.
  if (targetPath !== filePath) {
      try {
        await fs.access(targetPath);
        console.log(`Target ${TARGET_EXTENSION} already exists for ${filePath} (${targetPath}), skipping conversion. Please verify manually if this is intended or if the original should be removed.`);
        return; // Skip if target .jpg already exists
      } catch (error) {
        // Target .jpg does not exist, proceed
      }
  } else {
      // This case means the original file itself is a .jpeg that will be converted to .jpg with the same basename.
      // This is fine.
  }

  console.log(`Standardizing: ${filePath} -> ${targetPath}`);
  try {
    await sharp(filePath)
      .rotate() // Add EXIF-based auto-rotation
      .jpeg({ quality: 90, mozjpeg: true }) // Adjust quality as needed
      .toFile(targetPath);
    console.log(`Successfully created: ${targetPath}`);

    // If conversion was successful and target is different from source, delete original
    // This check is important: if original was 'image.JPG' and target is 'image.jpg',
    // they are different file paths on case-sensitive systems, so original should be deleted.
    // If original was 'image.png' and target is 'image.jpg', also delete.
    if (filePath.toLowerCase() !== targetPath.toLowerCase()) { // Compare case-insensitively for path difference before delete
        try {
            await fs.access(filePath); // Check if original still exists before unlinking
            await fs.unlink(filePath);
            console.log(`Successfully deleted original: ${filePath}`);
        } catch (e) {
            // Original might have been same as target in a case-insensitive OS and already replaced
            // or was already deleted in a previous step. This is not an error.
            // console.log(`Original ${filePath} not found for deletion, possibly already replaced or deleted.`);
        }
    }
  } catch (err) {
    console.error(`Error standardizing ${filePath}:`, err);
  }
}

async function main() {
  console.log('Starting image extension standardization to .jpg...');
  console.warn('IMPORTANT: This script will DELETE original non-JPG files after conversion.');
  console.warn('Make sure you have a BACKUP of your public/images directory before proceeding.');
  // Add a small delay or a prompt here in a real scenario, e.g., using readline for confirmation.
  // For now, just logging a warning.

  try {
    const imagePaths = await findProcessableImageFiles(IMAGES_DIR);
    if (imagePaths.length === 0) {
      console.log('No non-JPG image files found to standardize.');
      return;
    }
    console.log(`Found ${imagePaths.length} non-JPG images to process.`);

    for (const imagePath of imagePaths) {
      await standardizeImage(imagePath);
    }

    console.log('Image standardization complete.');
  } catch (err) {
    console.error('Error during standardization process:', err);
  }
}

main();
