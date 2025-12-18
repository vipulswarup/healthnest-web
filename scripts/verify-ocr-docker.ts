import 'dotenv/config';
import { extractTextFromImage } from '../lib/services/ocr.service';
import { classifyDocument } from '../lib/services/ai.service';

async function main() {
    console.log('--- Verifying OCR & Categorization ---');

    // Test 1: OCR with Docker
    // Need a real public URL for this to work as per implementation
    const testImageUrl = 'https://picsum.photos/200/300.jpg';
    // This is just a random image, OCR will produce garbage but it proves the pipeline works (Download -> Docker -> Output)

    console.log(`\n1. Testing OCR (Docker) with ${testImageUrl}...`);
    try {
        const text = await extractTextFromImage(testImageUrl);
        console.log('OCR Output Length:', text.length);
        console.log('OCR Output Preview:', text.substring(0, 50));
    } catch (error: any) {
        console.error('OCR Verification Failed:', error.message);
    }

    // Test 2: AI Classification with Dynamic Types
    console.log('\n2. Testing AI Classification...');
    // Mock text that should clearly be a pathology test
    const labText = "Blood Test Results. Hemoglobin: 13.5. White Blood Cells: 7.0.";

    try {
        const result = await classifyDocument(labText);
        console.log('Classification Result:', result);
        if (result.classification === 'Pathology Test') {
            console.log('SUCCESS: Correctly classified as Pathology Test');
        } else {
            console.log(`NOTE: Classified as '${result.classification}'. (Expected 'Pathology Test' ideally, but depends on AI)`);
        }
    } catch (error: any) {
        console.error('AI Verification Failed:', error.message);
    }
}

main().catch(console.error);
