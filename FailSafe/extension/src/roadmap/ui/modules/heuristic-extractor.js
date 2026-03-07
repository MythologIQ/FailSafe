// FailSafe Command Center — Heuristic Keyword Extractor (last-resort, zero-LLM)
// Guarantees that SOMETHING always reaches the mindmap.
// Uses simple NLP: keyword extraction, sentence segmentation, type inference.

export const TYPE_SIGNALS = {
    Risk:         /\b(risk|danger|threat|vulnerability|fail|crash|breach|attack|exploit|unsafe)\b/i,
    Question:     /\b(how|why|should|could|what if|whether|question|ask|concern)\b/i,
    Database:     /\b(database|sql|table|schema|migration|store|persist|cache|redis|postgres|mongo)\b/i,
    Integration:  /\b(api|endpoint|webhook|third.?party|integration|external|upstream|downstream|service)\b/i,
    Architecture: /\b(architect|pattern|layer|module|component|system|design|structure|framework|engine)\b/i,
};

export function heuristicExtract(transcript) {
    // Split into meaningful chunks (sentences or clauses)
    const sentences = transcript
        .replace(/([.!?;])\s*/g, '$1\n')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 3);

    if (sentences.length === 0) {
        // Even from garbage, extract the whole thing as a single node
        return {
            status: 'heuristic-extracted',
            nodes: [{
                id: `h-${Date.now()}`,
                label: transcript.substring(0, 30).trim() || 'Brainstorm idea',
                type: 'Feature',
                confidence: 20,
            }],
            edges: [],
            verbalResponse: 'Extracted via keyword analysis (no LLM available).',
        };
    }

    // Extract 1 node per sentence, up to 8
    const nodes = [];
    const usedLabels = new Set();

    for (const sentence of sentences.slice(0, 8)) {
        // Extract key phrase: longest noun-like chunk or first N words
        let label = sentence
            .replace(/^(I think|we should|maybe|probably|let's|I want to|we need to|how about)\s+/i, '')
            .replace(/[.!?,;:]+$/, '')
            .trim();

        if (label.length > 30) label = label.substring(0, 30).trim();
        if (label.length < 3 || usedLabels.has(label.toLowerCase())) continue;
        usedLabels.add(label.toLowerCase());

        // Infer type from content
        let type = 'Feature';
        for (const [t, regex] of Object.entries(TYPE_SIGNALS)) {
            if (regex.test(sentence)) { type = t; break; }
        }

        nodes.push({
            id: `h-${Date.now()}-${nodes.length}`,
            label,
            type,
            confidence: 25,
        });
    }

    // Create edges between sequential nodes (simple chain)
    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
        edges.push({
            source: nodes[i - 1].id,
            target: nodes[i].id,
            label: 'relates to',
        });
    }

    return {
        status: 'heuristic-extracted',
        nodes,
        edges,
        verbalResponse: `Extracted ${nodes.length} concept(s) via keyword analysis. Refine with an LLM when available.`,
    };
}
