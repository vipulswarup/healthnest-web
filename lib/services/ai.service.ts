import { AppError } from '@/lib/middleware/error-handler';
import { classificationPrompt } from './prompts/classification.prompt';
import { extractionPrompt } from './prompts/extraction.prompt';
import { taggingPrompt } from './prompts/tagging.prompt';
import { analysisPrompt } from './prompts/analysis.prompt';
import { DEFAULT_TAGS } from '../constants/tags';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** llama-3.3-70b-versatile shut down on Groq 2026-08-16. */
const MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';

export interface AnalysisResult {
    classification: string;
    confidence: number;
    source: string | null;
    doctorName: string | null;
    documentDate: string | null;
    idType: string | null;
    expiryDate: string | null;
    tags: string[];
}

async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
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

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || '{}';
        
        return aiResponse;
    } catch {
        throw new AppError('Failed to process request with AI service', 502);
    }
}

import { getRecordTypeOptions } from '../constants/labels';
import {
    getAllCategories,
    getValidCategoryDisplayNames,
    resolveClassification,
} from './category.service';

async function getValidCategoryLabels(): Promise<string[]> {
    try {
        const categories = await getAllCategories();
        const names = getValidCategoryDisplayNames(categories);
        if (names.length > 0) return names;
    } catch {
        // The static label set is intentionally retained as a resilient fallback.
    }
    return getRecordTypeOptions().map((opt) => opt.label);
}

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
    const validCategories = await getValidCategoryLabels();
    const recordTypes = validCategories.map((label) => `- "${label}"`).join('\n');
    const dynamicSystemPrompt =
        `${analysisPrompt}\n\nValid Categories (classification MUST be exactly one of these strings):\n${recordTypes}`;

    const response = await callGroq(text, dynamicSystemPrompt);
    try {
        const result = JSON.parse(response);
        const classification = resolveClassification(result.classification, validCategories);

        const aiTags: string[] = result.tags || [];
        const normalizedTags = aiTags
            .map(tag => normalizeTag(String(tag)))
            .filter((tag: string, index: number, arr: string[]) => tag && arr.indexOf(tag) === index);

        const isIdDocument = classification.toLowerCase() === 'id document';
        return {
            classification,
            confidence: typeof result.confidence === 'number' ? result.confidence : 0,
            source: result.source || null,
            doctorName: isIdDocument ? null : (result.doctorName || null),
            documentDate: result.documentDate || null,
            idType: isIdDocument ? (result.idType || null) : null,
            expiryDate: isIdDocument ? (result.expiryDate || null) : null,
            tags: normalizedTags
        };
    } catch {
        return {
            classification: resolveClassification(null, validCategories),
            confidence: 0,
            source: null,
            doctorName: null,
            documentDate: null,
            idType: null,
            expiryDate: null,
            tags: []
        };
    }
}

export async function classifyDocument(text: string): Promise<{ classification: string; confidence: number }> {
    const validCategories = await getValidCategoryLabels();
    const recordTypes = validCategories.map((label) => `- "${label}"`).join('\n');
    const dynamicSystemPrompt =
        `${classificationPrompt}\n\nValid Categories (classification MUST be exactly one of these strings):\n${recordTypes}`;

    const response = await callGroq(text, dynamicSystemPrompt);
    try {
        const parsed = JSON.parse(response);
        return {
            classification: resolveClassification(parsed.classification, validCategories),
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        };
    } catch {
        return { classification: resolveClassification(null, validCategories), confidence: 0 };
    }
}

export async function extractData(text: string, documentType: string): Promise<Record<string, unknown>> {
    const systemPrompt = extractionPrompt.replace('{{DOCUMENT_TYPE}}', documentType);
    const response = await callGroq(text, systemPrompt);
    try {
        return JSON.parse(response);
    } catch {
        return {};
    }
}

function normalizeTag(tag: string): string {
    return tag.toLowerCase().trim().replace(/\s+/g, '_');
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
    } catch {
        return {
            matchedTags: [],
            newTags: [],
            allTags: []
        };
    }
}
