/**
 * Calculate text similarity between multiple AI extractions using a character-based approach
 * This provides a more nuanced score than simple exact matching
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - The edit distance
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Normalize strings for comparison
    const norm1 = str1.toLowerCase().trim();
    const norm2 = str2.toLowerCase().trim();
    
    // If strings are identical, return 100%
    if (norm1 === norm2) return 100;
    
    // Calculate Levenshtein distance
    const distance = levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    // Convert distance to similarity percentage
    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.max(0, similarity);
}

/**
 * Calculate word-based similarity using Jaccard index
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function calculateWordSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Tokenize and normalize
    const words1 = new Set(str1.toLowerCase().trim().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().trim().split(/\s+/));
    
    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return 0;
    return (intersection.size / union.size) * 100;
}

/**
 * Calculate consensus score across multiple AI extractions
 * @param {Object} individualExtractions - Object containing AI service extractions
 * @returns {number} - Consensus score (0-100)
 */
export function calculateAIConsensusScore(individualExtractions) {
    if (!individualExtractions) return 0;
    
    // Get all extractions (including null/empty ones)
    const allExtractions = [];
    const services = ['openai', 'claude', 'google_vision'];
    
    for (const service of services) {
        const extraction = individualExtractions[service];
        if (extraction !== undefined) {
            // Include all services that were queried, even if they returned null or empty
            allExtractions.push({
                service,
                text: extraction && extraction.text ? extraction.text.trim() : null
            });
        }
    }
    
    // If no services were queried, return 0
    if (allExtractions.length === 0) return 0;
    
    // Count services with text vs without
    const withText = allExtractions.filter(e => e.text !== null && e.text !== '');
    const withoutText = allExtractions.filter(e => e.text === null || e.text === '');
    
    // If all services returned null/empty, they agree on "no text"
    if (withText.length === 0) return 100;
    
    // If all services returned text, calculate similarity between texts
    if (withoutText.length === 0) {
        // Check if all texts are identical
        const firstText = withText[0].text.toLowerCase();
        const allIdentical = withText.every(e => e.text.toLowerCase() === firstText);
        if (allIdentical) return 100;
        
        // Calculate pairwise similarities
        const similarities = [];
        
        for (let i = 0; i < withText.length; i++) {
            for (let j = i + 1; j < withText.length; j++) {
                const text1 = withText[i].text;
                const text2 = withText[j].text;
                
                // Use a weighted combination of character and word similarity
                const charSimilarity = calculateStringSimilarity(text1, text2);
                const wordSimilarity = calculateWordSimilarity(text1, text2);
                
                // Weight character similarity more heavily for accuracy
                const combinedSimilarity = (charSimilarity * 0.7) + (wordSimilarity * 0.3);
                similarities.push(combinedSimilarity);
            }
        }
        
        // Return average similarity across all pairs
        if (similarities.length === 0) return 100; // Only one service with text
        const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        
        // Round up if very close to 100 (99.5 or higher)
        if (averageSimilarity >= 99.5) return 100;
        return Math.round(averageSimilarity);
    }
    
    // Mixed case: some services found text, others didn't
    // Treat null as completely different from any text (0% similarity)
    // Calculate the consensus as the percentage of services that agree
    
    // If only one service found text, consensus is 1/total services
    if (withText.length === 1) {
        return Math.round((1 / allExtractions.length) * 100);
    }
    
    // Multiple services found text - calculate their internal similarity
    // then weight by the fraction of total services
    let textSimilarities = [];
    for (let i = 0; i < withText.length; i++) {
        for (let j = i + 1; j < withText.length; j++) {
            const text1 = withText[i].text;
            const text2 = withText[j].text;
            
            const charSimilarity = calculateStringSimilarity(text1, text2);
            const wordSimilarity = calculateWordSimilarity(text1, text2);
            const combinedSimilarity = (charSimilarity * 0.7) + (wordSimilarity * 0.3);
            textSimilarities.push(combinedSimilarity);
        }
    }
    
    // Get average similarity among services that found text
    const avgTextSimilarity = textSimilarities.length > 0 
        ? textSimilarities.reduce((sum, sim) => sum + sim, 0) / textSimilarities.length
        : 100; // If only one text service, it agrees with itself
    
    // Final consensus: weight by fraction of services that found similar text
    const textAgreementFraction = withText.length / allExtractions.length;
    const consensus = avgTextSimilarity * textAgreementFraction;
    
    return Math.round(consensus);
}

/**
 * Get a descriptive label for the consensus score
 * @param {number} score - Consensus score (0-100)
 * @returns {string} - Descriptive label
 */
export function getConsensusLabel(score) {
    if (score >= 90) return 'Strong Agreement';
    if (score >= 75) return 'Good Agreement';
    if (score >= 60) return 'Moderate Agreement';
    if (score >= 40) return 'Some Agreement';
    return 'Low Agreement';
}

/**
 * Get the consensus text (the most common or average text)
 * @param {Object} individualExtractions - Object containing AI service extractions
 * @returns {string} - The consensus text
 */
export function getConsensusText(individualExtractions) {
    if (!individualExtractions) return '';
    
    const texts = [];
    const services = ['openai', 'claude', 'google_vision'];
    
    for (const service of services) {
        const extraction = individualExtractions[service];
        if (extraction && extraction.text && extraction.text.trim()) {
            texts.push(extraction.text.trim());
        }
    }
    
    if (texts.length === 0) return '';
    if (texts.length === 1) return texts[0];
    
    // For now, return the text that's most similar to all others
    // (This could be enhanced with more sophisticated consensus algorithms)
    let bestText = texts[0];
    let bestScore = 0;
    
    for (const candidateText of texts) {
        let totalSimilarity = 0;
        for (const otherText of texts) {
            if (candidateText !== otherText) {
                totalSimilarity += calculateStringSimilarity(candidateText, otherText);
            }
        }
        
        if (totalSimilarity > bestScore) {
            bestScore = totalSimilarity;
            bestText = candidateText;
        }
    }
    
    return bestText;
}

/**
 * Calculate how similar each service's text is to the consensus
 * @param {Object} individualExtractions - Object containing AI service extractions
 * @returns {Object} - Object with similarity scores for each service
 */
export function calculateServiceSimilarities(individualExtractions) {
    if (!individualExtractions) return {};
    
    const consensusText = getConsensusText(individualExtractions);
    if (!consensusText) return {};
    
    const similarities = {};
    const services = ['openai', 'claude', 'google_vision'];
    
    for (const service of services) {
        const extraction = individualExtractions[service];
        if (extraction && extraction.text && extraction.text.trim()) {
            similarities[service] = calculateStringSimilarity(extraction.text.trim(), consensusText);
        }
    }
    
    return similarities;
}