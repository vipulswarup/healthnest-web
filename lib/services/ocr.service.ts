import { AppError } from '@/lib/middleware/error-handler';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';

import { getR2Object } from '../r2';
import { Readable } from 'stream';

const execAsync = promisify(exec);

export async function extractTextFromImage(input: string, isR2Key: boolean = false): Promise<string> {
    const tempDir = '/tmp';
    const fileExtension = path.extname(input) || '.jpg';
    const fileName = `${randomUUID()}${fileExtension}`;
    const localFilePath = path.join(tempDir, fileName);
    let processedFilePath = localFilePath; // File to be fed to OCR

    try {
        // DEBUG LOGGING
        console.log('\n--- OCR REQUEST ---');
        console.log('Input:', input);
        console.log('Extension:', fileExtension);
        console.log('-------------------\n');

        // 1. Download file to local temp directory
        console.log(`Downloading file to ${localFilePath}...`);

        if (isR2Key) {
            const body = await getR2Object(input);
            if (!body) throw new Error('Empty body from R2');
            // body is likely a stream
            await pipeline(body as any, fs.createWriteStream(localFilePath));
        } else {
            const response = await fetch(input);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('Response body is empty');
            }

            await pipeline(response.body as any, fs.createWriteStream(localFilePath));
        }

        // 2. Convert PDF if necessary
        if (fileExtension.toLowerCase() === '.pdf') {
            const outputBaseName = randomUUID();
            const outputBasePath = path.join(tempDir, outputBaseName);

            console.log(`Converting PDF to TIFF: ${outputBasePath}...`);

            // Use pdftocairo from poppler-utils to convert PDF to TIFF
            // pdftocairo is more reliable than pdftoppm for single-page conversion
            // -tiff: output format
            // -r 300: resolution (300 DPI)
            // -f 1 -l 1: first page only
            // Output pattern: basename-1.tiff (page number appended)
            const convertCommand = `docker run --rm -v "${tempDir}":"${tempDir}" minidocks/poppler pdftocairo -tiff -r 300 -f 1 -l 1 "${localFilePath}" "${outputBasePath}"`;

            console.log(`Running Conversion: ${convertCommand}`);
            try {
                const { stdout, stderr } = await execAsync(convertCommand);
                if (stdout) console.log('Conversion Stdout:', stdout);
                if (stderr && !stderr.includes('Writing')) {
                    console.warn('Conversion Stderr:', stderr);
                }
            } catch (error: any) {
                console.error('Conversion command failed:', error);
                throw new Error(`PDF conversion command failed: ${error.message}`);
            }

            // pdftocairo outputs files with pattern: basename-page.tif or basename-page.tiff
            // With -f 1 -l 1, it may create: basename-1.tif, basename-01.tif, or basename-1.tiff
            // Check for various page number formats (1, 01) and extensions (.tif, .tiff)
            const possiblePaths = [
                path.join(tempDir, `${outputBaseName}-1.tif`),
                path.join(tempDir, `${outputBaseName}-01.tif`),
                path.join(tempDir, `${outputBaseName}-1.tiff`),
                path.join(tempDir, `${outputBaseName}-01.tiff`),
            ];
            
            let foundPath: string | null = null;
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    foundPath = possiblePath;
                    break;
                }
            }
            
            if (!foundPath) {
                // If exact matches fail, search for any file matching the pattern
                const files = await fs.promises.readdir(tempDir);
                const matchingFiles = files.filter(f => 
                    f.startsWith(outputBaseName) && 
                    (f.endsWith('.tif') || f.endsWith('.tiff'))
                );
                
                if (matchingFiles.length > 0) {
                    // Use the first matching file
                    foundPath = path.join(tempDir, matchingFiles[0]);
                    console.log(`Found output file: ${foundPath}`);
                } else {
                    console.error(`Expected file not found. Files matching base name: ${files.filter(f => f.startsWith(outputBaseName)).join(', ')}`);
                    throw new Error(`PDF conversion failed: output file not found. Checked: ${possiblePaths.join(', ')}`);
                }
            }
            
            processedFilePath = foundPath;
        }

        // 3. Run Tesseract via Docker
        // Using processedFilePath (original image or converted TIFF)
        // Map processedFilePath to /tmp/input.img inside container
        // Note: If processedFilePath is /tmp/abc.tiff, we map "/tmp/abc.tiff":/tmp/input.img
        // Tesseract handles TIFF

        // Again, simplified mount mapping /tmp to /tmp
        const dockerCommand = `docker run --rm -v "${tempDir}":"${tempDir}" jitesoft/tesseract-ocr "${processedFilePath}" stdout`;

        console.log(`Running OCR on ${processedFilePath}: ${dockerCommand}`);
        const { stdout, stderr } = await execAsync(dockerCommand);

        if (stderr && !stderr.includes('tesseract')) {
            console.warn('OCR Stderr:', stderr);
        }

        // 4. Cleanup
        // Delete download
        await fs.promises.unlink(localFilePath).catch(console.error);
        // Delete converted file if it exists and is different
        if (processedFilePath !== localFilePath) {
            await fs.promises.unlink(processedFilePath).catch(console.error);
        }

        return stdout.trim();

    } catch (error: any) {
        console.error('OCR Processing Error:', error);

        // Cleanup
        if (fs.existsSync(localFilePath)) {
            await fs.promises.unlink(localFilePath).catch(console.error);
        }
        if (processedFilePath !== localFilePath && fs.existsSync(processedFilePath)) {
            await fs.promises.unlink(processedFilePath).catch(console.error);
        }

        throw new AppError(`Failed to process document with OCR: ${error.message}`, 502);
    }
}
