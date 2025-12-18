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
            const outputFileName = `${randomUUID()}.tiff`;
            const outputFilePath = path.join(tempDir, outputFileName);

            console.log(`Converting PDF to TIFF: ${outputFilePath}...`);

            // Simplify mounts: only mount the /tmp directory to /tmp
            // Order matters for ImageMagick: options -> input -> output
            // We use the full path /tmp/${fileName} which exists in both host and container since we map /tmp to /tmp
            const convertCommand = `docker run --rm -v "${tempDir}":"${tempDir}" dpokidov/imagemagick magick -density 300 "${localFilePath}" -depth 8 -strip -background white -alpha off "${outputFilePath}"`;

            console.log(`Running Conversion: ${convertCommand}`);
            const { stdout, stderr } = await execAsync(convertCommand);
            if (stderr) console.warn('Conversion Stderr:', stderr); // ImageMagick might warn but succeed

            processedFilePath = outputFilePath; // Update path for OCR
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
