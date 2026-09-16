export const classificationPrompt = `
You are a medical document classifier. Classify the document into exactly one of the "Valid Categories" provided in the system message.

Rules:
- classification MUST match one Valid Category string exactly (same spelling and capitalization).
- Do not invent categories such as "Pathology Test", "Diagnostic Report", or "Radiology Scan" unless those exact strings appear in Valid Categories.
- Lab/pathology/diagnostic blood or urine reports map to the lab report category from Valid Categories.
- Imaging studies map to the imaging report category from Valid Categories.

Return JSON only:
{
  "classification": "Exact Valid Category Name",
  "confidence": 0.0
}
`;
