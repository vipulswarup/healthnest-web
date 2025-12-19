'use client';

import { useState, useEffect } from 'react';

interface AISuggestionsProps {
    documentId: string;
    initialClassification?: string;
    initialTags?: string[];
    autoSelectedTags?: string[];
    onSave: (classification: string, tags: string[]) => void;
    isSaving: boolean;
    disabled?: boolean;
}

export function AISuggestions({
    documentId,
    initialClassification,
    initialTags = [],
    autoSelectedTags = [],
    onSave,
    isSaving,
    disabled = false
}: AISuggestionsProps) {
    const [classification, setClassification] = useState(initialClassification || '');
    // Auto-select tags that match existing tags, include all suggested tags
    const [tags, setTags] = useState<string[]>(() => {
        // Start with auto-selected tags, then add any other suggested tags not already included
        const allTags = [...autoSelectedTags];
        initialTags.forEach(tag => {
            if (!allTags.includes(tag)) {
                allTags.push(tag);
            }
        });
        return allTags;
    });
    const [newTag, setNewTag] = useState('');

    // Update local state when props change
    useEffect(() => {
        if (initialClassification) setClassification(initialClassification);
        // Merge auto-selected and suggested tags
        const allTags = [...autoSelectedTags];
        initialTags.forEach(tag => {
            if (!allTags.includes(tag)) {
                allTags.push(tag);
            }
        });
        setTags(allTags);
    }, [initialClassification, initialTags, autoSelectedTags]);

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const categories = [
        "Lab Report",
        "Radiology Report",
        "Prescription",
        "Discharge Summary",
        "Bill/Invoice",
        "Insurance",
        "Other"
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Review & Approve</h3>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type
                </label>
                <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    disabled={disabled}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border ${
                        disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                    }`}
                >
                    <option value="">Select a type...</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                {initialClassification && initialClassification !== "Unknown" && (
                    <p className="text-xs text-green-600 mt-1">
                        Build with confidence: AI suggested "{initialClassification}"
                    </p>
                )}
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => {
                        const isAutoSelected = autoSelectedTags.includes(tag);
                        return (
                            <span
                                key={tag}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                                    isAutoSelected 
                                        ? 'bg-green-100 text-green-800 border border-green-300' 
                                        : 'bg-indigo-100 text-indigo-800'
                                }`}
                            >
                                {tag}
                                {isAutoSelected && (
                                    <span className="ml-1 text-xs text-green-600" title="Auto-selected (matches existing tag)">
                                        ✓
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    disabled={disabled}
                                    className={`flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 focus:outline-none ${
                                        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-indigo-200 hover:text-indigo-500'
                                    }`}
                                >
                                    <span className="sr-only">Remove tag</span>
                                    &times;
                                </button>
                            </span>
                        );
                    })}
                    {tags.length === 0 && (
                        <span className="text-sm text-gray-400 italic">No tags added yet.</span>
                    )}
                </div>
                {autoSelectedTags.length > 0 && (
                    <p className="text-xs text-green-600 mt-1 mb-2">
                        {autoSelectedTags.length} tag{autoSelectedTags.length > 1 ? 's' : ''} auto-selected (matched existing tags)
                    </p>
                )}

                <form onSubmit={handleAddTag} className="flex gap-2">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        disabled={disabled}
                        className={`flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border ${
                            disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                        }`}
                    />
                    <button
                        type="submit"
                        disabled={disabled}
                        className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                            disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-indigo-200'
                        }`}
                    >
                        Add
                    </button>
                </form>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                    onClick={() => onSave(classification, tags)}
                    disabled={isSaving || !classification || disabled}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${isSaving || !classification || disabled
                            ? 'bg-indigo-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        }`}
                >
                    {isSaving ? 'Saving...' : 'Approve & Save'}
                </button>
            </div>
        </div>
    );
}
