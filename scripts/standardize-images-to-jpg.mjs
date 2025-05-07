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
      const ext = path.extname(item.name).toLowerCase();
      if (NON_JPG_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

async function standardizeImage(filePath) {
  const dirname = path.dirname(filePath);
  const extname = path.extname(filePath);
  const basename = path.basename(filePath, extname);
  const targetPath = path.join(dirname, `${basename}${TARGET_EXTENSION}`);

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
      .jpeg({ quality: 90, mozjpeg: true }) // Adjust quality as needed
      .toFile(targetPath);
    console.log(`Successfully created: ${targetPath}`);

    // If conversion was successful and target is different from source, delete original
    if (filePath !== targetPath) {
      await fs.unlink(filePath);
      console.log(`Successfully deleted original: ${filePath}`);
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
