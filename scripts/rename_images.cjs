const fs = require('fs');
const path = require('path');

const baseDir = path.resolve('public/images'); // Resolve path from workspace root

console.log(`Starting image renaming process in: ${baseDir}`);

try {
    if (!fs.existsSync(baseDir)) {
        console.error(`Error: Base directory not found: ${baseDir}`);
        process.exit(1);
    }

    const categories = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.')) // Exclude hidden directories
        .map(dirent => dirent.name);

    console.log(`Found categories: ${categories.join(', ')}`);
    if (categories.length === 0) {
        console.log("No category directories found. Exiting.");
        process.exit(0);
    }

    for (const category of categories) {
        const categoryPath = path.join(baseDir, category);
        let types;
        try {
            types = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && (dirent.name === 'real' || dirent.name === 'ai'))
                .map(dirent => dirent.name);
        } catch (err) {
            console.error(`Error reading types in category ${category}:`, err);
            continue; // Skip this category if there's an error reading types
        }

        console.log(`Processing category: ${category}, types: ${types.join(', ') || 'None'}`);

        for (const type of types) {
            const typePath = path.join(categoryPath, type);
            console.log(`---> Renaming images in: ${typePath}`);

            let files;
            try {
                files = fs.readdirSync(typePath)
                          .filter(file => !file.startsWith('.') && /\.(jpg|jpeg|png|webp|gif)$/i.test(file)); // Filter for images and exclude hidden files
            } catch (err) {
                console.error(`Error reading directory ${typePath}:`, err);
                continue; // Skip this directory if unreadable
            }

            if (files.length === 0) {
                console.log(`No image files found in ${typePath}. Skipping.`);
                continue;
            }

            // Sort files numerically based on existing names, if possible, otherwise alphabetically.
            // This handles rerunning the script correctly.
            files.sort((a, b) => {
                const numA = parseInt(a.match(/^(\d+)\./)?.[1] || '-1', 10);
                const numB = parseInt(b.match(/^(\d+)\./)?.[1] || '-1', 10);
                if (numA !== -1 && numB !== -1) {
                    return numA - numB; // Numeric sort if both have leading numbers
                } else {
                    return a.localeCompare(b); // Fallback to alphabetical if numbers missing
                }
            });

            let index = 1;
            let renamedCount = 0;
            let skippedCount = 0;
            for (const file of files) {
                const oldPath = path.join(typePath, file);
                const extension = path.extname(file);
                const newFilename = `${index}${extension}`;
                const newPath = path.join(typePath, newFilename);

                // Avoid renaming if the file already has the correct name
                if (oldPath !== newPath) {
                    try {
                        fs.renameSync(oldPath, newPath);
                       // console.log(`Renamed "${file}" to "${newFilename}"`); // Keep logs less verbose
                        renamedCount++;
                    } catch (renameError) {
                        console.error(`Failed to rename "${file}" to "${newFilename}" in ${category}/${type}:`, renameError);
                    }
                } else {
                     // console.log(`Skipped "${file}" (already correctly named)`);
                     skippedCount++;
                }
                index++;
            }
            console.log(`Finished ${category}/${type}. Renamed: ${renamedCount}, Skipped: ${skippedCount}, Total files: ${files.length}`);
        }
    }
    console.log("\nImage renaming process completed successfully.");

} catch (error) {
    console.error("\nError during the renaming process:", error);
    process.exit(1); // Exit with error code
} 