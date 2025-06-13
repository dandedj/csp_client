import { GoogleMap, LoadScript, useLoadScript } from "@react-google-maps/api";
import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ProgressBar, Toast, Form, Row, Col } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { renderToString } from "react-dom/server";
import { BiUpArrowCircle } from "react-icons/bi";
import { PlaquesService } from "../../services/PlaquesService";
import PlaqueCard from "./PlaqueCard";
import { SearchContext } from "./SearchContext";
import { useSearchParams } from "react-router-dom";

// Custom debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    
    return debouncedValue;
};

// Define static values outside of component to avoid re-creating them on each render
const mapLibraries = ['places', 'marker'];

// Container style for Google Map
const containerStyle = {
    width: "100%",
    height: "80vh",
};

// Initial map center
const initialMapCenter = {
    lat: 34.841326395062595,
    lng: -82.39848640537643,
};

// Map ID for Advanced Markers - this is required for AdvancedMarkerElement
const MAP_ID = "csp_plaques_map";

// Map options
const createMapOptions = (mapType) => ({
    gestureHandling: 'greedy',
    disableDefaultUI: false,
    clickableIcons: false,
    mapTypeControl: true,
    mapTypeId: mapType,
    zoomControl: true,
    fullscreenControl: true,
    mapTypeControlOptions: {
        style: window.google?.maps ? window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR : null,
        position: window.google?.maps ? window.google.maps.ControlPosition.TOP_RIGHT : null
    },
    // This is required for Advanced Markers
    mapId: MAP_ID
});

// Function to adjust coordinates by shifting them south
const adjustCoordinates = (latitude, longitude) => {
    // Calculate a southern offset based on the actual error observed
    // At the given coordinates, 0.0001 degrees latitude ≈ 11 meters
    // Shifting by approximately 10 meters south
    const offsetLat = -0.00009; // Approximately 10 meters south
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`Adjusting coordinates: ${latitude},${longitude} -> ${latitude + offsetLat},${longitude}`);
    }
    
    return {
        lat: latitude + offsetLat,
        lng: longitude
    };
};

const MapPlaques = () => {
    const [plaques, setPlaques] = useState([]);
    const [selectedPlaque, setSelectedPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { searchQuery, setSearchQuery } = useContext(SearchContext);
    // Fixed confidence value - filter removed from UI
    const confidenceThreshold = 0;
    const [grouped, setGrouped] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState(initialMapCenter);
    const [mapRef, setMapRef] = useState(null);
    const [mapType, setMapType] = useState('hybrid'); // Track current map type
    const [mapOptions, setMapOptions] = useState(createMapOptions('hybrid'));
    const [markers, setMarkers] = useState([]); // Store marker references
    
    // Debounce the local search query before updating context and URL
    const debouncedSearchQuery = useDebounce(localSearchQuery, 500);

    const [searchParams, setSearchParams] = useSearchParams();
    
    // Define marker click handler
    const handleMarkerClick = useCallback((plaque) => {
        setSelectedPlaque(plaque);
        
        // When clicking a marker, center the map on that marker's position
        if (mapRef && plaque) {
            const rawLat = plaque.location?.latitude || plaque.latitude;
            const rawLng = plaque.location?.longitude || plaque.longitude;
            
            // Apply the same adjustment for consistency
            const position = adjustCoordinates(rawLat, rawLng);
            
            mapRef.panTo(position);
            setMapCenter(position);
        }
    }, [mapRef, setMapCenter]);
    const queryFromURL = searchParams.get('query');
    
    // Track if this is the first render
    const isFirstRender = useRef(true);

    const MAP_API_KEY = process.env.REACT_APP_MAPS_API_KEY;

    const icons = [];

    for (let degree = 0; degree <= 360; degree += 10) {
        const svg = renderToString(
            <BiUpArrowCircle
                style={{ transform: `rotate(${degree}deg)`, color: "white" }}
            />
        );
        const svgUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        icons.push({ degree, svgUrl });
    }

    // Generate marker icons based on map type and confidence
    // Simplified dot markers with direction indicator
    const generateMarkerIcon = (degree, confidence, currentMapType) => {
        // Use the passed map type or default to hybrid
        const effectiveMapType = currentMapType || 'hybrid';
        
        // Determine base color by map type
        let baseColor = effectiveMapType === 'roadmap' ? "#555555" : "#FFFFFF";
        
        // Adjust color based on confidence if needed
        let color = baseColor;
        if (confidence < 30) {
            // For very low confidence, add a slight color variation
            color = effectiveMapType === 'roadmap' ? "#777777" : "#EEEEEE";
        }
        
        // Create a simple dot marker with the direction indicator - made larger
        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="6" fill="${color}" stroke="#000000" stroke-width="1.5" />
            <line 
                x1="12" 
                y1="12" 
                x2="${12 + 4.5 * Math.sin(degree * Math.PI / 180)}" 
                y2="${12 - 4.5 * Math.cos(degree * Math.PI / 180)}" 
                stroke="#000000" 
                stroke-width="2" 
            />
        </svg>`;
        
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };

    // Sync context state with URL parameter on component mount
    useEffect(() => {
        if (queryFromURL && queryFromURL !== searchQuery) {
            setSearchQuery(queryFromURL);
            setLocalSearchQuery(queryFromURL);
            
            // If there's a plaque ID in the URL, try to find and select that plaque
            if (queryFromURL && queryFromURL.length > 10 && plaques.length > 0) {
                console.log("Looking for plaque ID from URL:", queryFromURL);
                const matchingPlaque = plaques.find(p => p.id === queryFromURL);
                if (matchingPlaque) {
                    console.log("Found matching plaque from URL:", matchingPlaque.id);
                    handleMarkerClick(matchingPlaque);
                } else {
                    console.log("No matching plaque found for ID:", queryFromURL);
                }
            }
        }
    }, [queryFromURL, setSearchQuery, plaques]);
    
    // Update search context and URL when debounced query changes
    useEffect(() => {
        // Skip the first render to avoid clearing the search on mount
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        
        setSearchQuery(debouncedSearchQuery);
        
        if (debouncedSearchQuery && debouncedSearchQuery.trim() !== "") {
            setSearchParams({ query: debouncedSearchQuery });
        } else {
            // Remove query parameter if search box is empty
            setSearchParams({});
        }
    }, [debouncedSearchQuery, setSearchQuery, setSearchParams]);

    const [paginationInfo, setPaginationInfo] = useState({
        totalCount: 0,
        filteredCount: 0,
        page: 1,
        limit: 1500,
        offset: 0
    });
    
    // State to track if more data is available
    const [hasMoreData, setHasMoreData] = useState(true);
    
    // Track current zoom level to determine how many markers to load
    const [currentZoom, setCurrentZoom] = useState(22);
    
    // Add a flag for visible bounds to request only plaques in current view
    const [mapBounds, setMapBounds] = useState(null);
    
    // Track if we're in the process of loading more plaques
    const [loadingMore, setLoadingMore] = useState(false);
    
    // Determine how many plaques to load based on zoom level - optimized for performance
    const getMarkerLimit = useCallback((zoom) => {
        if (zoom >= 18) return 800;  // High zoom - show detailed view
        if (zoom >= 16) return 500;  // Medium-high zoom - moderate detail
        if (zoom >= 14) return 300;  // Medium zoom - reduced for better performance
        if (zoom >= 12) return 200;  // Low-medium zoom - cluster heavily
        return 100; // Low zoom - minimal markers, heavy clustering
    }, []);
    
    // Load plaques based on search, confidence, and viewport
    useEffect(() => {
        setLoading(true);
        setHasMoreData(true); // Reset for new search
        
        // Use the searchQuery from context instead of queryFromURL
        const query = searchQuery;
        
        const plaquesService = new PlaquesService();
        
        // Calculate how many markers to load based on zoom level
        const limit = getMarkerLimit(currentZoom);
        
        // Prepare viewport bounds for spatial filtering
        let bounds = null;
        if (mapBounds && mapsLoaded && currentZoom >= 14) {
            // Only use spatial filtering at higher zoom levels to avoid empty results
            const ne = mapBounds.getNorthEast();
            const sw = mapBounds.getSouthWest();
            bounds = {
                north: ne.lat(),
                south: sw.lat(),
                east: ne.lng(),
                west: sw.lng()
            };
            console.log('Using viewport bounds for spatial filtering:', bounds);
        } else {
            console.log('Skipping spatial filtering: zoom level too low or bounds not available');
        }
        
        // Fetch plaques with pagination and optional spatial filtering
        const plaquesPromise =
            query == null || query.trim() === ""
                ? plaquesService.getAllPlaques(confidenceThreshold, grouped, limit, 0, bounds)
                : plaquesService.getPlaques(query, confidenceThreshold, limit);
        
        plaquesPromise
            .then((result) => {
                // Store plaques and pagination info separately
                setPlaques(result.plaques || []);
                
                // Update pagination info
                const total = result.totalCount || 0;
                setPaginationInfo({
                    totalCount: total,
                    filteredCount: result.filteredCount || 0,
                    page: result.page || 1,
                    limit: result.limit || limit,
                    offset: result.offset || 0
                });
                
                // Check if we have more data to load
                setHasMoreData(total > (result.plaques?.length || 0));
                
                setLoading(false);
                console.log(`Loaded ${result.plaques?.length || 0} plaques out of ${total} total`);
                
                // If there's a plaque ID in the URL, try to find and select that plaque
                if (queryFromURL && queryFromURL.length > 10 && result.plaques?.length > 0) {
                    console.log("Looking for plaque ID from URL after data load:", queryFromURL);
                    const matchingPlaque = result.plaques.find(p => p.id === queryFromURL);
                    if (matchingPlaque) {
                        console.log("Found matching plaque from URL after data load:", matchingPlaque.id);
                        
                        // Set the map center to the adjusted plaque location
                        const rawLat = matchingPlaque.location?.latitude || matchingPlaque.latitude;
                        const rawLng = matchingPlaque.location?.longitude || matchingPlaque.longitude;
                        
                        // Apply the same adjustment for consistency
                        const position = adjustCoordinates(rawLat, rawLng);
                        setMapCenter(position);
                        
                        // After a short delay, select the plaque to open the modal
                        setTimeout(() => {
                            setSelectedPlaque(matchingPlaque);
                        }, 500);
                    }
                }
            })
            .catch((error) => {
                console.error(
                    "There has been a problem with your fetch operation:",
                    error
                );
                setError("There has been a problem with your fetch operation");
                setLoading(false);
                setHasMoreData(false);
            });
    }, [searchQuery, confidenceThreshold, grouped, currentZoom, getMarkerLimit, mapBounds, mapsLoaded]);

    const handleSearchChange = (event) => {
        // Update local state immediately for responsive UI
        setLocalSearchQuery(event.target.value);
    };

    const handleFormSubmit = (event) => {
        event.preventDefault();
        // Immediately apply the current search without waiting for debounce
        setSearchQuery(localSearchQuery);
        
        if (localSearchQuery && localSearchQuery.trim() !== "") {
            setSearchParams({ query: localSearchQuery });
        } else {
            setSearchParams({});
        }
    };

    // Removed handleConfidenceChange function as confidence filter is removed

    const handleGroupedChange = (event) => {
        setGrouped(event.target.checked);
    };

    const handleMapLoad = (map) => {
        if (map && window.google) {
            try {
                map.setMapTypeId(window.google.maps.MapTypeId.HYBRID);
                map.setTilt(0);
                setMapsLoaded(true);
                setMapRef(map); // Save reference to the map
                
                // Initialize zoom state
                setCurrentZoom(map.getZoom());
                
                // Track map bounds for viewport-based loading
                const bounds = map.getBounds();
                if (bounds) setMapBounds(bounds);
                
                // Add listener for map type changes - use setTimeout to avoid React state updates during Google callback
                map.addListener('maptypeid_changed', () => {
                    const newMapType = map.getMapTypeId();
                    console.log('Map type changed to:', newMapType);
                    
                    // Use setTimeout to defer state updates until after the current call stack is cleared
                    setTimeout(() => {
                        setMapType(newMapType);
                    }, 0);
                });
                
                // Add listener for zoom changes
                map.addListener('zoom_changed', () => {
                    const newZoom = map.getZoom();
                    console.log('Zoom level changed to:', newZoom);
                    
                    // Update zoom level state
                    setTimeout(() => {
                        setCurrentZoom(newZoom);
                    }, 0);
                });
                
                // Add listener for bounds changes
                map.addListener('bounds_changed', () => {
                    const newBounds = map.getBounds();
                    if (newBounds) {
                        setTimeout(() => {
                            setMapBounds(newBounds);
                        }, 200); // Add some debounce to avoid excessive calls
                    }
                });
            } catch (e) {
                console.error("Error setting map properties:", e);
                setError("Error initializing map. Please refresh the page.");
            }
        }
    };

    // Track map center changes with debouncing to prevent excessive re-renders
    const handleCenterChanged = () => {
        if (mapRef) {
            const newCenter = mapRef.getCenter();
            if (newCenter) {
                // Only update center state when map is idle to prevent blanking during drag
                mapRef.addListener('idle', () => {
                    setMapCenter({
                        lat: newCenter.lat(),
                        lng: newCenter.lng()
                    });
                });
            }
        }
    };

    // handleMarkerClick is now defined above as a useCallback hook

    const handleClose = () => {
        // Just close the modal without changing the map position
        setSelectedPlaque(null);
    };

    // Check if the map markers can be rendered safely
    const canRenderMarkers = () => {
        return mapsLoaded && window.google && window.google.maps && mapRef;
    };
    
    // Use a ref to cache markers data to prevent unnecessary re-renders
    const plaquesRef = useRef([]);
    useEffect(() => {
        plaquesRef.current = plaques;
    }, [plaques]);
    
    // Handle map type changes safely
    useEffect(() => {
        console.log('Map type changed to:', mapType);
        
        // Update map options when map type changes
        const newOptions = createMapOptions(mapType);
        setMapOptions(newOptions);
        
        // If map reference exists, update the map's type directly to avoid React errors
        if (mapRef && window.google && window.google.maps) {
            try {
                // Safely update the map type without going through React props
                mapRef.setMapTypeId(mapType);
            } catch (error) {
                console.error('Error setting map type:', error);
            }
        }
    }, [mapType, mapRef]);
    
    // Memoize the marker icon generator to prevent unnecessary recalculations
    const memoizedGenerateMarkerIcon = useCallback((degree, confidence) => {
        return generateMarkerIcon(degree, confidence, mapType);
    }, [mapType]);
    
    // Helper function to create HTML for a plaque item in the cluster popup
    const createPlaqueItemHtml = useCallback((plaque) => {
        if (!plaque) return '';
        
        // Get text content
        let titleText = 'No text available';
        if (plaque.text) {
            if (Array.isArray(plaque.text)) {
                titleText = plaque.text[0] ? plaque.text[0].substring(0, 40) : 'No text available';
            } else if (typeof plaque.text === 'string') {
                titleText = plaque.text.substring(0, 40);
            }
        } else if (plaque.plaque_text && typeof plaque.plaque_text === 'string') {
            titleText = plaque.plaque_text.substring(0, 40);
        }
        
        // Get bearing for the icon
        const bearing = plaque.photo?.camera_position?.bearing || plaque.bearing || 0;
        const rounded_bearing = Math.round(bearing / 10) * 10; // Round to the nearest 10s
        
        // Create icon SVG
        const svgUrl = memoizedGenerateMarkerIcon(rounded_bearing, plaque.confidence || 0);
        
        // Create item HTML
        return `
            <div class="plaque-item" data-plaque-id="${plaque.id || ''}" title="${titleText}">
                <div class="plaque-icon" style="background-image: url('${svgUrl}');"></div>
                <div class="plaque-text">${titleText}</div>
                <div class="plaque-confidence">${plaque.confidence ? plaque.confidence + '%' : 'N/A'}</div>
            </div>
        `;
    }, [memoizedGenerateMarkerIcon]);
    
    // Create a memoized function to filter plaques that are in the current viewport
    const getVisiblePlaques = useCallback(() => {
        if (!mapBounds || !plaques.length) return plaques;
        
        // Only show plaques in the current viewport if we have bounds
        return plaques.filter(plaque => {
            // Skip invalid plaques
            if (!plaque) return false;
            
            // Get coordinates
            const rawLat = plaque.location?.latitude || plaque.latitude;
            const rawLng = plaque.location?.longitude || plaque.longitude;
            
            // Skip plaques without valid coordinates
            if (!rawLat || !rawLng) return false;
            
            // Check if the plaque is within the current map bounds
            const plaqueLat = parseFloat(rawLat);
            const plaqueLng = parseFloat(rawLng);
            
            return mapBounds.contains(new window.google.maps.LatLng(plaqueLat, plaqueLng));
        });
    }, [plaques, mapBounds]);
    
    // Get filtered plaques for current viewport
    const visiblePlaques = useMemo(() => {
        // Only calculate if we have the necessary data
        if (mapsLoaded && mapBounds && plaques.length > 0 && window.google?.maps) {
            return getVisiblePlaques();
        }
        return plaques;
    }, [plaques, mapBounds, mapsLoaded, getVisiblePlaques]);
    
    // Effect to manage marker clustering and viewport-based rendering
    useEffect(() => {
        // Clean up existing markers
        if (markers && markers.length > 0) {
            markers.forEach(marker => {
                if (marker) marker.map = null;
            });
        }
        
        // If the map isn't ready, don't create markers
        if (!mapsLoaded || !mapRef || !window.google?.maps) {
            return;
        }
        
        // Display loading indicator if there are many markers
        const shouldShowLoading = visiblePlaques.length > 100;
        if (shouldShowLoading) {
            setLoadingMore(true);
        }
        
        // Use a timeout to prevent UI blocking and allow the loading indicator to show
        const markerCreationTimeout = setTimeout(() => {
            try {
                // Determine if we should use clustering based on zoom and marker count
                const useMarkerClustering = currentZoom < 18 && visiblePlaques.length > 25;
                
                // Create markers with a more efficient approach
                const newMarkers = [];
                const plaqueMap = {}; // For collision detection at low zoom levels
                
                // Process visible plaques
                visiblePlaques.forEach(plaque => {
                    if (!plaque) return;
                    
                    // Get original location from either new or old data structure
                    const rawLat = plaque.location?.latitude || plaque.latitude;
                    const rawLng = plaque.location?.longitude || plaque.longitude;
                    
                    // Skip markers without valid coordinates
                    if (!rawLat || !rawLng) return;
                    
                    // Round coordinates for collision detection at low zoom
                    let roundedLat, roundedLng;
                    if (currentZoom < 18) {
                        // Round to fewer decimal places to create natural clustering
                        const precision = currentZoom < 14 ? 3 : currentZoom < 16 ? 4 : 5;
                        roundedLat = parseFloat(rawLat).toFixed(precision);
                        roundedLng = parseFloat(rawLng).toFixed(precision);
                        
                        // Skip if we already have a marker at this position (coarse clustering)
                        const posKey = `${roundedLat},${roundedLng}`;
                        if (plaqueMap[posKey]) {
                            plaqueMap[posKey].count++;
                            return;
                        }
                        
                        // Create new entry in map
                        plaqueMap[posKey] = { 
                            plaque, 
                            count: 1, 
                            highestConfidence: plaque.confidence || 0 
                        };
                    }
                    
                    // Apply coordinate adjustment to shift south
                    const position = adjustCoordinates(parseFloat(rawLat), parseFloat(rawLng));
                    
                    // Get bearing from either new or old data structure
                    const bearing = plaque.photo?.camera_position?.bearing || plaque.bearing || 0;
                    const rounded_bearing = Math.round(bearing / 10) * 10; // Round to the nearest 10s
                    
                    // Use memoized map-type aware marker icons
                    const svgUrl = memoizedGenerateMarkerIcon(
                        rounded_bearing, 
                        plaque.confidence || 0
                    );
                    
                    // Create title text
                    let titleText = 'No text available';
                    if (plaque.text) {
                        if (Array.isArray(plaque.text)) {
                            titleText = plaque.text[0] ? plaque.text[0].substring(0, 30) + '...' : 'No text available';
                        } else if (typeof plaque.text === 'string') {
                            titleText = plaque.text.substring(0, 30) + '...';
                        }
                    } else if (plaque.plaque_text && typeof plaque.plaque_text === 'string') {
                        titleText = plaque.plaque_text.substring(0, 30) + '...';
                    }
                    
                    const confidenceDisplay = plaque.confidence ? `(Confidence: ${plaque.confidence}%)` : '';
                    let markerTitle = `${titleText} ${confidenceDisplay}`;
                    
                    // For clustered markers, show count
                    if (currentZoom < 16 && plaqueMap[`${roundedLat},${roundedLng}`]?.count > 1) {
                        const clusterCount = plaqueMap[`${roundedLat},${roundedLng}`].count;
                        markerTitle = `Cluster of ${clusterCount} plaques`;
                    }
                    
                    // Create the appropriate marker
                    try {
                        let marker;
                        
                        // Use efficient markers based on zoom level and clustering status
                        if (useMarkerClustering && plaqueMap[`${roundedLat},${roundedLng}`]?.count > 1) {
                            // Create a cluster marker with count
                            const clusterCount = plaqueMap[`${roundedLat},${roundedLng}`].count;
                            
                            // Only create one marker per cluster
                            if (clusterCount === plaqueMap[`${roundedLat},${roundedLng}`].count) {
                                // Create a DOM element for the cluster marker to enable interactive features
                                const clusterDiv = document.createElement('div');
                                clusterDiv.className = 'cluster-marker';
                                clusterDiv.innerHTML = `
                                    <div class="cluster-circle">${clusterCount}</div>
                                    <div class="cluster-expanded">
                                        <div class="cluster-header">Group of ${clusterCount} plaques</div>
                                        <div class="cluster-content"></div>
                                    </div>
                                `;
                                
                                // Add styling if not already added
                                if (!document.getElementById('cluster-styles')) {
                                    const styleEl = document.createElement('style');
                                    styleEl.id = 'cluster-styles';
                                    styleEl.textContent = `
                                        .cluster-marker {
                                            position: relative;
                                        }
                                        .cluster-circle {
                                            background-color: #4285F4;
                                            color: white;
                                            border-radius: 50%;
                                            width: 36px;
                                            height: 36px;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            font-weight: bold;
                                            border: 2px solid white;
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                            cursor: pointer;
                                            transition: transform 0.2s ease-in-out;
                                            user-select: none;
                                        }
                                        .cluster-circle:hover {
                                            transform: scale(1.1);
                                            z-index: 1001;
                                        }
                                        .cluster-expanded {
                                            display: none;
                                            position: absolute;
                                            bottom: 40px;
                                            left: -140px;
                                            width: 320px;
                                            max-height: 300px;
                                            overflow-y: auto;
                                            background: white;
                                            border-radius: 8px;
                                            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                                            z-index: 2000;
                                            padding: 8px;
                                        }
                                        .cluster-marker:hover .cluster-expanded {
                                            display: block;
                                        }
                                        .cluster-header {
                                            font-weight: bold;
                                            text-align: center;
                                            margin-bottom: 8px;
                                            padding-bottom: 4px;
                                            border-bottom: 1px solid #eee;
                                        }
                                        .plaque-item {
                                            padding: 4px;
                                            margin-bottom: 4px;
                                            border-bottom: 1px solid #eee;
                                            cursor: pointer;
                                            display: flex;
                                            align-items: center;
                                        }
                                        .plaque-item:hover {
                                            background-color: #f0f9ff;
                                        }
                                        .plaque-icon {
                                            width: 12px;
                                            height: 12px;
                                            margin-right: 6px;
                                            display: inline-block;
                                        }
                                        .plaque-text {
                                            font-size: 12px;
                                            white-space: nowrap;
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            flex: 1;
                                        }
                                    `;
                                    document.head.appendChild(styleEl);
                                }
                                
                                try {
                                    // Try to use AdvancedMarkerElement for better performance with DOM elements
                                    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                                        const advancedMarker = new window.google.maps.marker.AdvancedMarkerElement({
                                            position: position,
                                            content: clusterDiv,
                                            map: mapRef,
                                            zIndex: 1000,
                                            collisionBehavior: window.google.maps.CollisionBehavior ? 
                                                window.google.maps.CollisionBehavior.REQUIRED : undefined
                                        });
                                        
                                        // Store all plaques in the cluster
                                        advancedMarker.plaquesInCluster = [plaque];
                                        
                                        // Store reference to content element for later updates
                                        advancedMarker.clusterContent = clusterDiv.querySelector('.cluster-content');
                                        
                                        // Add plaque to the cluster content
                                        const plaqueHtml = createPlaqueItemHtml(plaque);
                                        if (advancedMarker.clusterContent) {
                                            advancedMarker.clusterContent.innerHTML += plaqueHtml;
                                        }
                                        
                                        // Add click handler for the cluster circle
                                        const circleElement = clusterDiv.querySelector('.cluster-circle');
                                        if (circleElement) {
                                            circleElement.addEventListener('click', (e) => {
                                                e.stopPropagation();
                                                
                                                // If zoom is already high, show the first plaque details
                                                if (currentZoom >= 17) {
                                                    if (advancedMarker.plaquesInCluster && advancedMarker.plaquesInCluster.length > 0) {
                                                        handleMarkerClick(advancedMarker.plaquesInCluster[0]);
                                                    }
                                                } else {
                                                    // Otherwise zoom in to see the individual plaques
                                                    mapRef.setZoom(Math.min(22, currentZoom + 2));
                                                    mapRef.panTo(position);
                                                }
                                            });
                                        }
                                        
                                        marker = advancedMarker;
                                    } else {
                                        // Fallback to standard marker if advanced markers not supported
                                        marker = new window.google.maps.Marker({
                                            position: position,
                                            map: mapRef,
                                            label: {
                                                text: clusterCount.toString(),
                                                color: "#ffffff"
                                            },
                                            icon: {
                                                path: window.google.maps.SymbolPath.CIRCLE,
                                                scale: 18,
                                                fillColor: "#4285F4",
                                                fillOpacity: 0.9,
                                                strokeWeight: 1.5,
                                                strokeColor: "#ffffff"
                                            },
                                            title: `Cluster of ${clusterCount} plaques (click to zoom)`,
                                            optimized: true,
                                            zIndex: 1000 // Clusters appear on top
                                        });
                                        
                                        // Store all plaques in the cluster
                                        marker.plaquesInCluster = [plaque];
                                        
                                        // Add click handler to zoom in
                                        marker.addListener('click', () => {
                                            if (currentZoom >= 17) {
                                                // If already zoomed in, show first plaque
                                                if (marker.plaquesInCluster && marker.plaquesInCluster.length > 0) {
                                                    handleMarkerClick(marker.plaquesInCluster[0]);
                                                } else {
                                                    handleMarkerClick(plaque);
                                                }
                                            } else {
                                                // Zoom in to see individual plaques
                                                mapRef.setZoom(Math.min(22, currentZoom + 2));
                                                mapRef.panTo(position);
                                            }
                                        });
                                    }
                                    
                                    newMarkers.push(marker);
                                } catch (error) {
                                    console.error("Error creating cluster marker:", error);
                                }
                            } else {
                                // For other plaques in the cluster, add them to the cluster's list
                                const clusterMarker = newMarkers.find(m => {
                                    if (m.getPosition) {
                                        return m.getPosition().lat().toFixed(4) === position.lat.toFixed(4) && 
                                               m.getPosition().lng().toFixed(4) === position.lng.toFixed(4);
                                    } else if (m.position) {
                                        return m.position.lat.toFixed(4) === position.lat.toFixed(4) &&
                                               m.position.lng.toFixed(4) === position.lng.toFixed(4);
                                    }
                                    return false;
                                });
                                
                                if (clusterMarker) {
                                    // Add to the cluster's list of plaques
                                    clusterMarker.plaquesInCluster = clusterMarker.plaquesInCluster || [];
                                    clusterMarker.plaquesInCluster.push(plaque);
                                    
                                    // Add to the HTML content if using advanced markers
                                    if (clusterMarker.clusterContent) {
                                        const plaqueHtml = createPlaqueItemHtml(plaque);
                                        clusterMarker.clusterContent.innerHTML += plaqueHtml;
                                        
                                        // Add click event handlers to the new plaque item
                                        setTimeout(() => {
                                            const plaqueItems = clusterMarker.clusterContent.querySelectorAll('.plaque-item');
                                            const latestItem = plaqueItems[plaqueItems.length - 1];
                                            if (latestItem) {
                                                latestItem.addEventListener('click', (e) => {
                                                    e.stopPropagation();
                                                    handleMarkerClick(plaque);
                                                });
                                            }
                                        }, 0);
                                    }
                                }
                            }
                        } else {
                            // For individual markers, use simpler implementation at high zoom levels
                            if (currentZoom >= 16) {
                                // Use basic SVG marker for better performance at high zoom - bigger markers
                                marker = new window.google.maps.Marker({
                                    position: position,
                                    map: mapRef,
                                    icon: {
                                        url: svgUrl,
                                        scaledSize: new window.google.maps.Size(16, 16),
                                        anchor: new window.google.maps.Point(8, 8)
                                    },
                                    title: markerTitle,
                                    optimized: true,
                                    zIndex: Math.floor(plaque.confidence || 0)
                                });
                                
                                // Add click handler to standard marker
                                marker.addListener('click', () => handleMarkerClick(plaque));
                                
                                newMarkers.push(marker);
                            } else {
                                // Use simplified markers for medium zoom levels - slightly bigger
                                marker = new window.google.maps.Marker({
                                    position: position,
                                    map: mapRef,
                                    icon: {
                                        url: svgUrl,
                                        scaledSize: new window.google.maps.Size(14, 14),
                                        anchor: new window.google.maps.Point(7, 7)
                                    },
                                    title: markerTitle,
                                    optimized: true,
                                    zIndex: Math.floor(plaque.confidence || 0)
                                });
                                
                                // Add click handler to standard marker
                                marker.addListener('click', () => handleMarkerClick(plaque));
                                
                                newMarkers.push(marker);
                            }
                        }
                    } catch (error) {
                        console.error('Error creating marker:', error);
                    }
                });
                
                // Update markers state
                setMarkers(newMarkers);
                
                // Hide loading indicator
                setLoadingMore(false);
                
                // Add summary info to the console
                console.log(`Created ${newMarkers.length} markers from ${visiblePlaques.length} visible plaques`);
                
                // Return cleanup function
                return () => {
                    newMarkers.forEach(marker => {
                        if (marker) marker.map = null;
                    });
                };
            } catch (error) {
                console.error('Error in marker creation:', error);
                setLoadingMore(false);
            }
        }, shouldShowLoading ? 100 : 0); // Add slight delay when loading many markers
        
        // Cleanup function
        return () => {
            clearTimeout(markerCreationTimeout);
        };
    }, [visiblePlaques, mapRef, mapType, currentZoom, memoizedGenerateMarkerIcon, handleMarkerClick, mapsLoaded]);

    return (
        <div className="container">
            <div className="container-fluid mb-2">
                <div className="row align-items-center">
                    <div className="col-md-3">
                        <div>
                            <small>
                                {paginationInfo.totalCount > 0 ? 
                                    `${visiblePlaques?.length || 0} visible of ${plaques.length} loaded plaques` :
                                    "Loading plaques..."
                                }
                            </small>
                            {paginationInfo.totalCount > 0 && (
                                <small className="d-block text-muted">
                                    {paginationInfo.totalCount > plaques.length ? 
                                        `(${Math.round(plaques.length/paginationInfo.totalCount*100)}% of total ${paginationInfo.totalCount})` : 
                                        '(100% loaded)'
                                    }
                                </small>
                            )}
                            {(loading || loadingMore) && <ProgressBar animated now={100} className="mt-1" />}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <Form className="d-flex justify-content-center" onSubmit={handleFormSubmit}>
                            <input
                                className="form-control me-2"
                                type="search"
                                placeholder="Search plaque text"
                                aria-label="Search"
                                value={localSearchQuery}
                                onChange={handleSearchChange}
                                style={{ width: "300px" }}
                            />
                            <Button variant="outline-success" type="submit">
                                Search
                            </Button>
                        </Form>
                    </div>
                    <div className="col-md-3 text-end">
                        <Form.Check
                            type="switch"
                            id="grouped-switch"
                            label={<small>Group by photo</small>}
                            checked={grouped}
                            onChange={handleGroupedChange}
                            inline
                        />
                    </div>
                </div>
            </div>
            {error && (
                <Toast>
                    <Toast.Header>
                        <strong className="me-auto">Error</strong>
                    </Toast.Header>
                    <Toast.Body>{error}</Toast.Body>
                </Toast>
            )}
            <div style={{ height: "85vh", width: "100%" }}>
                <LoadScript 
                    googleMapsApiKey={MAP_API_KEY}
                    onLoad={() => console.log("Google Maps API loaded successfully")}
                    onError={(error) => {
                        console.error("Error loading Google Maps API:", error);
                        setError("Error loading Google Maps. Please check your internet connection and refresh the page.");
                    }}
                    loadingElement={<div style={{ height: '100%' }}>Loading Maps...</div>}
                    libraries={mapLibraries}
                    version="weekly" // Use the latest weekly version for advanced features
                >
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        zoom={22}
                        onLoad={handleMapLoad}
                        center={mapCenter}
                        options={{
                            gestureHandling: 'greedy',
                            disableDefaultUI: false,
                            clickableIcons: false,
                            mapTypeControl: true,
                            zoomControl: true,
                            fullscreenControl: true,
                            mapId: MAP_ID // Required for Advanced Markers
                        }}
                        onDragEnd={handleCenterChanged}
                    >
                        {/* Map markers are managed via the useEffect hook above */}
                    </GoogleMap>
                    
                    {/* Load more button - fixed at bottom of map */}
                    {plaques.length > 0 && plaques.length < paginationInfo.totalCount && (
                        <div 
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1000
                            }}
                        >
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    // Load more plaques
                                    setLoadingMore(true);
                                    const plaquesService = new PlaquesService();
                                    const nextOffset = plaques.length;
                                    const nextLimit = 500;
                                    
                                    const promise = searchQuery?.trim() 
                                        ? plaquesService.getPlaques(searchQuery, confidenceThreshold, nextLimit, nextOffset)
                                        : plaquesService.getAllPlaques(confidenceThreshold, grouped, nextLimit, nextOffset);
                                        
                                    promise.then(result => {
                                        if (result.plaques && result.plaques.length > 0) {
                                            // Merge with existing plaques
                                            setPlaques(prev => [...prev, ...result.plaques]);
                                            setLoadingMore(false);
                                            // Update pagination info
                                            setPaginationInfo(prev => ({
                                                ...prev,
                                                offset: nextOffset,
                                                totalCount: result.totalCount || prev.totalCount
                                            }));
                                        } else {
                                            // No more data
                                            setHasMoreData(false);
                                            setLoadingMore(false);
                                        }
                                    }).catch(error => {
                                        console.error("Error loading more plaques:", error);
                                        setLoadingMore(false);
                                        setError("Error loading additional plaques");
                                    });
                                }}
                                disabled={loadingMore}
                                className="shadow"
                            >
                                {loadingMore ? 'Loading...' : `Load ${Math.min(500, paginationInfo.totalCount - plaques.length)} More Plaques`}
                            </Button>
                        </div>
                    )}
                    
                    <Modal
                        show={selectedPlaque !== null}
                        onHide={handleClose}
                        size="lg"
                    >
                        <Modal.Header closeButton>
                            <Modal.Title>Plaque Details</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {selectedPlaque && (
                                <PlaqueCard plaque={selectedPlaque} />
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </LoadScript>
            </div>
        </div>
    );
};

export default MapPlaques;
