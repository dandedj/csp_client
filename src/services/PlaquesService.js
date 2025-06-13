import config from '../config.json';

// define the PlaquesService class
export class PlaquesService {
    // Helper to normalize field names from API to frontend format
    normalizeFields(plaque) {
        if (!plaque) return null;
        
        // Create a copy to avoid mutating the original
        const normalizedPlaque = {...plaque};
        
        // Map plaque_text to text if needed
        if (normalizedPlaque.plaque_text !== undefined && normalizedPlaque.text === undefined) {
            normalizedPlaque.text = normalizedPlaque.plaque_text;
        }
        
        // Handle the case where text is an array (from the legacy format)
        if (Array.isArray(normalizedPlaque.text)) {
            // If text is an array with elements, take the first one
            if (normalizedPlaque.text.length > 0) {
                normalizedPlaque.text = normalizedPlaque.text[0];
            } else {
                // If it's an empty array, set a default
                normalizedPlaque.text = "No text available";
            }
        }
        
        // Handle other field mappings as needed
        if (normalizedPlaque.image_url && !normalizedPlaque.photo) {
            normalizedPlaque.photo = { url: normalizedPlaque.image_url };
        }
        
        // Log for debugging
        console.log('Normalized plaque:', normalizedPlaque);
        
        return normalizedPlaque;
    }
    
    // Normalize an array of plaques
    normalizePlaques(plaques) {
        if (!Array.isArray(plaques)) return [];
        return plaques.map(plaque => this.normalizeFields(plaque));
    }
    
    async getAllPlaques(confidenceThreshold = 50, grouped = false, limit = 500, offset = 0, bounds = null) {
        // call the google cloud function called app to get the list of plaques and return them
        try {
            let url = `${config.api.listPlaquesUrl}?confidence_threshold=${confidenceThreshold}&grouped=${grouped}&limit=${limit}&offset=${offset}`;
            
            // Add viewport bounds for spatial filtering if provided
            if (bounds && bounds.north && bounds.south && bounds.east && bounds.west) {
                url += `&north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
            }
            
            console.log(`Fetching plaques from: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            // Log response status
            console.log(`Plaques response status: ${response.status}`);
            
            const data = await response.json();

            if (!response.ok) {
                console.error("Plaque service error response:", data);
                throw new Error('Network response was not ok: ' + (data.message || response.statusText));
            }

            // New API format returns pagination metadata
            const paginationInfo = {
                totalCount: data.total_count || 0,
                page: data.page || 1,
                limit: data.limit || limit,
                offset: data.offset || offset
            };

            // Ensure we're returning an array
            const plaques = data.plaques || data;
            if (!Array.isArray(plaques)) {
                console.warn("Expected array of plaques but got:", typeof plaques);
                return { plaques: [], ...paginationInfo };
            }
            
            // Filter out any invalid plaque objects and normalize field names
            const validPlaques = plaques.filter(plaque => plaque && typeof plaque === 'object');
            console.log(`Received ${validPlaques.length} plaques out of ${paginationInfo.totalCount} total`);
            
            return { 
                plaques: this.normalizePlaques(validPlaques),
                ...paginationInfo
            };
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
            return { plaques: [], totalCount: 0, page: 1, limit, offset };
        }
    }

    // add a function to get a list of plaques given a search term
    async getPlaques(query, confidenceThreshold = 50, limit = 100, offset = 0) {
        // call the google cloud function called app to get the list of plaques and return them
        try {
            // Simplify request to just use 'q' parameter for cleaner code, add offset for pagination
            const url = `${config.api.searchPlaquesUrl}?q=${encodeURIComponent(query)}&confidence_threshold=${confidenceThreshold}&limit=${limit}&offset=${offset}`;
            console.log(`Searching plaques: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`Search response status: ${response.status}`);
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Search error response:", data);
                throw new Error('Network response was not ok: ' + (data.message || response.statusText));
            }

            // Get pagination metadata if available
            const paginationInfo = {
                totalCount: data.total_count || 0,
                filteredCount: data.filtered_count || 0,
                offset: offset,
                limit: limit
            };

            // Ensure we're returning an array
            const plaques = data.plaques || data;
            if (!Array.isArray(plaques)) {
                console.warn("Expected array of plaques but got:", typeof plaques);
                return { plaques: [], ...paginationInfo };
            }
            
            // Filter out any invalid plaque objects and normalize field names
            const validPlaques = plaques.filter(plaque => plaque && typeof plaque === 'object');
            console.log(`Received ${validPlaques.length} plaques from search (offset: ${offset}, limit: ${limit})`);
            
            return { 
                plaques: this.normalizePlaques(validPlaques),
                ...paginationInfo
            };
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
            return { plaques: [], totalCount: 0, filteredCount: 0, offset, limit };
        }
    }

    async getPlaqueById(id) {
        try {
            console.log(`Fetching plaque with ID: ${id}`);
            
            if (!id) {
                console.error('No ID provided to getPlaqueById');
                return null;
            }
            
            // For Google Cloud Functions, we'll try path parameter first, then query parameter
            let url = `${config.api.plaqueDetailUrl}/${id}`;

            console.log(`Sending request to: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            console.log(`Response status: ${response.status}`);
            
            if (!response.ok) {
                console.error(`API response error: ${response.status}`);
                
                // Try to get error details from response
                let errorMessage = `API responded with status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error || errorData.message) {
                        errorMessage = errorData.error || errorData.message;
                    }
                } catch (parseError) {
                    console.warn('Could not parse error response:', parseError);
                }
                
                throw new Error(errorMessage);
            }
            
            let data;
            try {
                data = await response.json();
                console.log('Raw API response data:', data);
            } catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                throw new Error('Failed to parse API response');
            }

            // Check if we got anything back
            if (data === null || data === undefined) {
                console.warn('API returned null or undefined');
                return null;
            }
            
            // If we get an empty array, try the old format URL with query parameter
            if (Array.isArray(data) && data.length === 0) {
                console.log('Empty array returned, trying alternative URL format');
                url = `${config.api.plaqueDetailUrl}?id=${id}`;
                console.log(`Trying alternative URL: ${url}`);
                
                const altResponse = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (!altResponse.ok) {
                    console.warn(`Alternative URL also failed: ${altResponse.status}`);
                    return null;
                }
                
                try {
                    data = await altResponse.json();
                    console.log('Alternative URL response data:', data);
                } catch (parseError) {
                    console.error('Error parsing JSON from alternative URL:', parseError);
                    return null;
                }
            }
            
            // Process the data based on its format
            if (Array.isArray(data)) {
                if (data.length === 0) {
                    console.warn('Both API endpoints returned empty arrays');
                    return null;
                }
                console.log(`Array response with ${data.length} items, using first item`);
                return this.normalizeFields(data[0]);
            } else if (typeof data === 'object') {
                console.log('Object response, normalizing fields');
                return this.normalizeFields(data);
            } else {
                console.warn(`Unexpected data type: ${typeof data}`);
                return null;
            }
        } catch (error) {
            console.error('Error in getPlaqueById:', error);
            return null;
        }
    }

    // New method to get plaques by photo ID
    async getPlaquesByPhotoId(photoId, confidenceThreshold = 50) {
        try {
            let url = `${config.api.searchPlaquesUrl}?photo_id=${photoId}&confidence_threshold=${confidenceThreshold}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();

            if (!response.ok) {
                console.log("Plaque service response : " + response);
                throw new Error('Network response was not ok');
            }

            // Ensure we're returning an array
            const plaques = data.plaques || data;
            if (!Array.isArray(plaques)) {
                console.warn("Expected array of plaques but got:", typeof plaques);
                return [];
            }
            
            // Filter out any invalid plaque objects and normalize field names
            const validPlaques = plaques.filter(plaque => plaque && typeof plaque === 'object');
            return this.normalizePlaques(validPlaques);
        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
            return [];
        }
    }
}