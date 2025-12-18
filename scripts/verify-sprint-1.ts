import 'dotenv/config';
import { classifyDocument, suggestTags } from '../lib/services/ai.service';
import { extractTextFromImage } from '../lib/services/ocr.service';

async function main() {
    console.log('--- Starting Verification ---');

    // Test OCR (using mock if no URL)
    console.log('\nTesting OCR Service...');
    try {
        const text = await extractTextFromImage('https://dummyimage.com/600x400/000/fff&text=Lab+Report');
        console.log('OCR Output:', text.substring(0, 100) + '...');
    } catch (e: any) {
        console.error('OCR Failed:', e.message);
    }

    // Test AI Classification
    console.log('\nTesting AI Classification...');
    const sampleText = "Patient Name: John Doe. Date: 2023-10-10. Test: CBC. Hemoglobin: 14.0 g/dL. White Blood Cells: 6.5. Platelets: 250.";
    try {
        const classification = await classifyDocument(sampleText);
        console.log('Classification:', classification);
    } catch (e: any) {
        console.error('Classification Failed:', e.message);
    }

    // Test AI Tagging
    console.log('\nTesting AI Tagging...');
    try {
        const tags = await suggestTags(sampleText);
        console.log('Tags:', tags);
    } catch (e: any) {
        console.error('Tagging Failed:', e.message);
    }
}

main().catch(console.error);
