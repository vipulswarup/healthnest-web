import { AppError } from '@/lib/middleware/error-handler';
import { classificationPrompt } from './prompts/classification.prompt';
import { extractionPrompt } from './prompts/extraction.prompt';
import { taggingPrompt } from './prompts/tagging.prompt';
import { analysisPrompt } from './prompts/analysis.prompt';
import { DEFAULT_TAGS } from '../constants/tags';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface AnalysisResult {
    classification: string;
    confidence: number;
    source: string | null;
    doctorName: string | null;
    documentDate: string | null;
    tags: string[];
}

async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn('GROQ_API_KEY is missing. Returning mock AI response.');
        return JSON.stringify({ mock: true, message: "AI Service Unavailable" });
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1, // Low temperature for consistent JSON output
                response_format: { type: "json_object" }
            }),
        });

        // DEBUG LOGGING
        console.log('\n--- GROQ AI REQUEST ---');
        console.log('System Prompt:', systemPrompt);
        console.log('User Prompt:', prompt);
        console.log('-----------------------\n');

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || '{}';
        
        // DEBUG LOGGING - Raw AI Response
        console.log('\n--- GROQ AI RESPONSE ---');
        console.log('Raw Response:', aiResponse);
        console.log('-----------------------\n');
        
        return aiResponse;
    } catch (error) {
        console.error('AI Service Error:', error);
        throw new AppError('Failed to process request with AI service', 502);
    }
}

import { getRecordTypeOptions } from '../constants/labels';

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
    const recordTypes = getRecordTypeOptions().map(opt => `- "${opt.label}"`).join('\n');
    const dynamicSystemPrompt = `${analysisPrompt}\n\nValid Categories:\n${recordTypes}`;

    const response = await callGroq(text, dynamicSystemPrompt);
    try {
        const result = JSON.parse(response);
        
        // DEBUG LOGGING - Parsed Result
        console.log('\n--- AI ANALYSIS RESULT ---');
        console.log('Classification:', result.classification);
        console.log('Confidence:', result.confidence);
        console.log('Source:', result.source);
        console.log('Doctor Name:', result.doctorName);
        console.log('Document Date (raw):', result.documentDate);
        console.log('Document Date (type):', typeof result.documentDate);
        console.log('Tags:', result.tags);
        console.log('Full Result:', JSON.stringify(result, null, 2));
        console.log('-----------------------\n');
        
        // Use all tags returned by AI, normalize them
        const aiTags: string[] = result.tags || [];
        const normalizedTags = aiTags
            .map(tag => normalizeTag(String(tag)))
            .filter((tag, index, arr) => tag && arr.indexOf(tag) === index); // Remove empty and duplicates
        
        return {
            ...result,
            doctorName: result.doctorName || null,
            documentDate: result.documentDate || null,
            tags: normalizedTags
        };
    } catch (e) {
        console.error("Failed to parse AI analysis response");
        console.error("Raw response:", response);
        console.error("Parse error:", e);
        return {
            classification: "Unknown",
            confidence: 0,
            source: null,
            doctorName: null,
            documentDate: null,
            tags: []
        };
    }
}

export async function classifyDocument(text: string): Promise<{ classification: string; confidence: number }> {
    const recordTypes = getRecordTypeOptions().map(opt => `- "${opt.label}"`).join('\n');
    // Replace the default static list in the prompt (or append to it) - simpler to just pass it in role
    // But since the prompt file is static, let's prepend the dynamic list to the user prompt or system prompt

    // Actually, prompt.ts has a static list. I should update prompt.ts to have a placeholder or just override it here.
    // For now, let's append the valid categories to the system prompt to enforce strict adherence.
    const dynamicSystemPrompt = `${classificationPrompt}\n\nValid Categories:\n${recordTypes}`;

    const response = await callGroq(text, dynamicSystemPrompt);
    try {
        return JSON.parse(response);
    } catch (e) {
        console.error("Failed to parse AI classification response", response);
        return { classification: "Unknown", confidence: 0 };
    }
}

export async function extractData(text: string, documentType: string): Promise<Record<string, any>> {
    const systemPrompt = extractionPrompt.replace('{{DOCUMENT_TYPE}}', documentType);
    const response = await callGroq(text, systemPrompt);
    try {
        return JSON.parse(response);
    } catch (e) {
        console.error("Failed to parse AI extraction response", response);
        return {};
    }
}

function normalizeTag(tag: string): string {
    return tag.toLowerCase().trim().replace(/\s+/g, '_');
}

function matchTagToExisting(aiTag: string): string | null {
    const normalized = normalizeTag(aiTag);
    const defaultTagsLower = DEFAULT_TAGS.map(t => t.toLowerCase());
    
    // Exact match
    if (defaultTagsLower.includes(normalized)) {
        return DEFAULT_TAGS[defaultTagsLower.indexOf(normalized)];
    }
    
    // Fuzzy matching for common variations
    const tagVariations: Record<string, string> = {
        'lab': 'lab_report',
        'laboratory': 'lab_report',
        'lab_test': 'lab_report',
        'lab_result': 'lab_report',
        'scan': 'scan_result',
        'imaging': 'scan_result',
        'radiology': 'scan_result',
        'xray': 'scan_result',
        'ct_scan': 'scan_result',
        'mri': 'scan_result',
        'prescription': 'prescription',
        'meds': 'medication',
        'medication': 'medication',
        'drug': 'medication',
        'discharge': 'discharge_summary',
        'discharge_note': 'discharge_summary',
        'consult': 'consultation',
        'consultation': 'consultation',
        'visit': 'consultation',
        'appointment': 'consultation',
        'symptom': 'symptom',
        'symptoms': 'symptom',
        'vitals': 'vital_signs',
        'vital': 'vital_signs',
        'vital_sign': 'vital_signs',
    };
    
    if (tagVariations[normalized]) {
        return tagVariations[normalized];
    }
    
    // Check if tag contains any default tag as substring
    for (const defaultTag of DEFAULT_TAGS) {
        const defaultTagLower = defaultTag.toLowerCase();
        if (normalized.includes(defaultTagLower) || defaultTagLower.includes(normalized)) {
            return defaultTag;
        }
    }
    
    return null;
}

export interface TagSuggestionResult {
    matchedTags: string[];
    newTags: string[];
    allTags: string[];
}

export async function suggestTags(text: string): Promise<TagSuggestionResult> {
    const response = await callGroq(text, taggingPrompt);
    try {
        const data = JSON.parse(response);
        const aiTags: string[] = data.tags || [];
        
        // Normalize all tags and remove duplicates
        const normalizedTags = aiTags
            .map(tag => normalizeTag(String(tag)))
            .filter((tag, index, arr) => tag && arr.indexOf(tag) === index); // Remove empty and duplicates
        
        // For backward compatibility, still identify matched tags
        const matchedTags = normalizedTags.filter(tag => 
            DEFAULT_TAGS.some(defaultTag => defaultTag.toLowerCase() === tag.toLowerCase())
        );
        const newTags = normalizedTags.filter(tag => 
            !matchedTags.includes(tag)
        );
        
        return {
            matchedTags,
            newTags,
            allTags: normalizedTags
        };
    } catch (e) {
        console.error("Failed to parse AI tagging response", response);
        return {
            matchedTags: [],
            newTags: [],
            allTags: []
        };
    }
}
