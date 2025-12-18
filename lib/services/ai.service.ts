import { AppError } from '@/lib/middleware/error-handler';
import { classificationPrompt } from './prompts/classification.prompt';
import { extractionPrompt } from './prompts/extraction.prompt';
import { taggingPrompt } from './prompts/tagging.prompt';
import { analysisPrompt } from './prompts/analysis.prompt';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface AnalysisResult {
    classification: string;
    confidence: number;
    source: string | null;
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
        return data.choices[0]?.message?.content || '{}';
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
        return JSON.parse(response);
    } catch (e) {
        console.error("Failed to parse AI analysis response", response);
        return {
            classification: "Unknown",
            confidence: 0,
            source: null,
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

export async function suggestTags(text: string): Promise<string[]> {
    const response = await callGroq(text, taggingPrompt);
    try {
        const data = JSON.parse(response);
        return data.tags || [];
    } catch (e) {
        console.error("Failed to parse AI tagging response", response);
        return [];
    }
}
