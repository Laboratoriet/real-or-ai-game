import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const LQIP_SUFFIX = '.lqip.jpg';
const LQIP_WIDTH = 40; // pixels
const LQIP_BLUR_SIGMA = 2; // Adjust for more/less blur
const LQIP_QUALITY = 70; // JPEG quality

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

async function findImageFiles(dir) {
  let files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(await findImageFiles(fullPath));
    } else if (ALLOWED_EXTENSIONS.includes(path.extname(item.name).toLowerCase()) && !item.name.endsWith(LQIP_SUFFIX)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function generateLqip(filePath) {
  const dirname = path.dirname(filePath);
  const extname = path.extname(filePath);
  const basename = path.basename(filePath, extname);
  const lqipPath = path.join(dirname, `${basename}${LQIP_SUFFIX}`);

  try {
    // Check if LQIP already exists
    await fs.access(lqipPath);
    // console.log(`LQIP already exists for ${filePath}, skipping.`);
    return;
  } catch (error) {
    // LQIP does not exist, proceed with generation
  }

  try {
    console.log(`Generating LQIP for: ${filePath} -> ${lqipPath}`);
    await sharp(filePath)
      .rotate() // Auto-rotate based on EXIF data
      .resize(LQIP_WIDTH)
      .blur(LQIP_BLUR_SIGMA)
      .jpeg({ quality: LQIP_QUALITY, mozjpeg: true }) // mozjpeg for better compression
      .toFile(lqipPath);
    console.log(`Successfully generated LQIP: ${lqipPath}`);
  } catch (err) {
    console.error(`Error generating LQIP for ${filePath}:`, err);
  }
}

async function main() {
  console.log('Starting LQIP generation...');
  try {
    const imagePaths = await findImageFiles(IMAGES_DIR);
    if (imagePaths.length === 0) {
      console.log('No image files found to process.');
      return;
    }
    console.log(`Found ${imagePaths.length} images to process.`);
    
    // Process images sequentially to avoid overwhelming the system
    for (const imagePath of imagePaths) {
      await generateLqip(imagePath);
    }
    
    console.log('LQIP generation complete.');
  } catch (err) {
    console.error('Error finding image files:', err);
  }
}

main();