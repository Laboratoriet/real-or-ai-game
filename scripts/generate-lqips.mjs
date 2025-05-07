import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const LQIP_SUBFOLDER_NAME = 'lqip';
const TARGET_LQIP_EXTENSION = '.jpg'; // LQIPs will also be JPEGs

const LQIP_WIDTH = 40; // pixels
const LQIP_BLUR_SIGMA = 2; // Adjust for more/less blur
const LQIP_QUALITY = 70; // JPEG quality for LQIP

const ORIGINAL_ALLOWED_EXTENSION = '.jpg'; // Only process .jpg files as originals

async function findImageFiles(dir) {
  let files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name.toLowerCase() === LQIP_SUBFOLDER_NAME) {
        // console.log(`Skipping LQIP directory: ${fullPath}`);
        continue; // Explicitly skip our LQIP subfolders
      }
      files = files.concat(await findImageFiles(fullPath));
    } else if (path.extname(item.name).toLowerCase() === ORIGINAL_ALLOWED_EXTENSION) {
      // Only consider .jpg files as originals
      files.push(fullPath);
    }
  }
  return files;
}

async function generateLqip(filePath) {
  const dirname = path.dirname(filePath);
  // Get basename, stripping .jpg or .JPG case-insensitively
  const basename = path.basename(filePath).replace(/\.jpg$/i, ''); 

  const lqipTargetDirectory = path.join(dirname, LQIP_SUBFOLDER_NAME);
  const lqipPath = path.join(lqipTargetDirectory, `${basename}${TARGET_LQIP_EXTENSION}`);

  try {
    // Ensure the LQIP target directory exists
    await fs.mkdir(lqipTargetDirectory, { recursive: true });

    // Check if LQIP already exists (optional, but good for reruns)
    await fs.access(lqipPath);
    // console.log(`LQIP already exists for ${filePath}, skipping.`);
    return;
  } catch (error) {
    // LQIP does not exist or directory needed creation, proceed with generation
  }

  try {
    console.log(`Generating LQIP for: ${filePath} -> ${lqipPath}`);
    await sharp(filePath)
      .rotate() // Auto-rotate based on EXIF data
      .resize(LQIP_WIDTH)
      .blur(LQIP_BLUR_SIGMA)
      .jpeg({ quality: LQIP_QUALITY, mozjpeg: true })
      .toFile(lqipPath);
    console.log(`Successfully generated LQIP: ${lqipPath}`);
  } catch (err) {
    console.error(`Error generating LQIP for ${filePath}:`, err);
  }
}

async function main() {
  console.log('Starting LQIP generation (output to lqip/ subfolders)...');
  try {
    const imagePaths = await findImageFiles(IMAGES_DIR);
    if (imagePaths.length === 0) {
      console.log('No .jpg image files found to process in main directories.');
      return;
    }
    console.log(`Found ${imagePaths.length} original .jpg images to process.`);
    
    for (const imagePath of imagePaths) {
      await generateLqip(imagePath);
    }
    
    console.log('LQIP generation complete.');
  } catch (err) {
    console.error('Error finding image files:', err);
  }
}

main();