import React, { useContext, useEffect, useState } from "react";
import { ProgressBar, Toast, Badge, Form, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { PlaquesService } from "../../services/PlaquesService";
import { SearchContext } from "./SearchContext";
import { BiGeo } from "react-icons/bi";
import CroppedImage from "../Common/CroppedImage";
import { getThumbnailUrl, getImageAltText, getImageSrcSet, getImageSizes } from "../../utils/imageUtils";

export default function ListPlaques() {
    const [plaques, setPlaques] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { searchQuery, setSearchQuery } = useContext(SearchContext);
    // Fixed confidence value - filter removed from UI
    const confidenceThreshold = 0;
    // Add sorting capability
    const [sortField, setSortField] = useState('confidence');
    const [sortDirection, setSortDirection] = useState('desc');
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    
    // Custom debounce hook for search
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
    
    // Debounce search query
    const debouncedSearchQuery = useDebounce(localSearchQuery, 500);
    
    // Set initial local search from context
    useEffect(() => {
        if (searchQuery) {
            setLocalSearchQuery(searchQuery);
        }
    }, []);
    
    // Update context when debounced query changes
    useEffect(() => {
        setSearchQuery(debouncedSearchQuery);
    }, [debouncedSearchQuery, setSearchQuery]);

    useEffect(() => {
        setLoading(true);

        const query = searchQuery;

        const plaquesService = new PlaquesService();

        const plaquesPromise =
            query == null || query.trim() === ""
                ? plaquesService.getAllPlaques(confidenceThreshold)
                : plaquesService.getPlaques(query, confidenceThreshold);

        plaquesPromise
            .then((res) => {
                // Handle the new API response format which includes pagination metadata
                if (res && res.plaques) {
                    // New format with pagination
                    setPlaques(res.plaques);
                    setLoading(false);
                    console.log(`Plaques: ${res.plaques.length} of ${res.totalCount || 'unknown'} total`);
                } else if (Array.isArray(res)) {
                    // Old format for backward compatibility
                    setPlaques(res);
                    setLoading(false);
                    console.log("Plaques: ", res.length);
                } else {
                    // Invalid response
                    console.error("Invalid response format:", res);
                    setPlaques([]);
                    setLoading(false);
                    setError("Received an invalid response format from the server");
                }
            })
            .catch((error) => {
                console.error(
                    "There has been a problem with your fetch operation:",
                    error
                );
                setError("There has been a problem with your fetch operation");
                setLoading(false);
            });
    }, [searchQuery, confidenceThreshold]);

    const handleSearchChange = (event) => {
        setLocalSearchQuery(event.target.value);
    };

    // Sort handler for table headers
    const handleSort = (field) => {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new field and default to descending
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleFormSubmit = (event) => {
        event.preventDefault();
        setSearchQuery(localSearchQuery);
    };

    // Helper to get text confidence color
    const getConfidenceColor = (confidence) => {
        if (!confidence) return "secondary";
        if (confidence > 80) return "success";
        if (confidence > 50) return "warning";
        return "danger";
    };
    
    // Helper to get brand confidence badge class
    const getConfidenceBadgeClass = (confidence) => {
        if (!confidence) return "badge-brand-secondary";
        if (confidence > 80) return "badge-green";
        if (confidence > 50) return "badge-purple";
        return "badge-brand-secondary";
    };

    return (
        <div className="container">
            {error && (
                <Toast>
                    <Toast.Header>
                        <strong className="me-auto">Error</strong>
                    </Toast.Header>
                    <Toast.Body>{error}</Toast.Body>
                </Toast>
            )}
            <div className="row align-items-center mb-3">
                <div className="col-md-4">
                    <small>
                        Select a plaque to view its details or search for
                        plaques by text.{" "}
                    </small>
                </div>
                <div className="col-md-3">
                    {loading && <ProgressBar animated now={100} />}
                </div>
                <div className="col-md-3">
                    <Form className="d-flex justify-content-end" onSubmit={handleFormSubmit}>
                        <Form.Control
                            type="search"
                            placeholder="Search"
                            aria-label="Search"
                            value={localSearchQuery}
                            onChange={handleSearchChange}
                            style={{ width: "200px" }}
                        />
                        <Button variant="primary" type="submit" className="ms-2">
                            SEARCH
                        </Button>
                    </Form>
                </div>
                <div className="col-md-2">
                    <div className="d-flex align-items-center h-100">
                        <small className="text-muted">
                            Click column headers to sort
                        </small>
                    </div>
                </div>
            </div>
            <table className="table table-striped table-brand">
                <thead>
                    <tr>
                        <th></th>
                        <th 
                            onClick={() => handleSort('text')} 
                            style={{cursor: 'pointer'}}
                        >
                            Text {sortField === 'text' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th 
                            onClick={() => handleSort('confidence')} 
                            style={{cursor: 'pointer'}}
                        >
                            Confidence {sortField === 'confidence' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                        <th>Location</th>
                        <th>Photo</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Sort plaques before display */}
                    {[...plaques]
                        .sort((a, b) => {
                            let valueA, valueB;
                            
                            // Determine how to extract the field's value
                            if (sortField === 'confidence') {
                                valueA = a.confidence || 0;
                                valueB = b.confidence || 0;
                            } else if (sortField === 'text') {
                                valueA = (a.text || a.plaque_text || '').toLowerCase();
                                valueB = (b.text || b.plaque_text || '').toLowerCase();
                            } else if (sortField === 'id') {
                                valueA = a.id || '';
                                valueB = b.id || '';
                            } else {
                                // Default fallback
                                valueA = a[sortField] || '';
                                valueB = b[sortField] || '';
                            }
                            
                            // Compare based on direction
                            if (sortDirection === 'asc') {
                                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
                            } else {
                                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
                            }
                        })
                        .map((plaque, index) => {
                            const lat = plaque.location?.latitude || plaque.latitude;
                            const lng = plaque.location?.longitude || plaque.longitude;
                            const mapPreviewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=120x80&markers=color:purple%7C${lat},${lng}&key=${process.env.REACT_APP_MAPS_API_KEY}`;
                            
                            return (
                                <tr key={index}>
                                    <td>
                                        <Link
                                            to={`/detail/${plaque.id}`}
                                            className="btn btn-sm btn-primary"
                                            title={`View details for plaque ${plaque.id}`}
                                            alt={`Plaque ID: ${plaque.id}`}
                                        >
                                            View
                                        </Link>
                                    </td>
                                    <td>
                                        {plaque.text ? 
                                            plaque.text.substring(0, 50) + (plaque.text.length > 50 ? "..." : "") : 
                                            plaque.plaque_text ? 
                                            plaque.plaque_text.substring(0, 50) + (plaque.plaque_text.length > 50 ? "..." : "") :
                                            "No text available"}
                                    </td>
                                    <td>
                                        {plaque.confidence ? (
                                            <span className={`badge ${getConfidenceBadgeClass(plaque.confidence)}`}>
                                                {plaque.confidence}%
                                            </span>
                                        ) : (
                                            <span className="badge badge-brand-secondary">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <Link to={`/map?query=${plaque.id}`} title="View on map">
                                                <img
                                                    src={mapPreviewUrl}
                                                    alt={`Map location: ${Math.round(lat * 100000) / 100000}, ${Math.round(lng * 100000) / 100000}`}
                                                    style={{ 
                                                        width: '120px', 
                                                        height: '80px', 
                                                        borderRadius: '4px',
                                                        border: '2px solid var(--brand-purple)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onError={(e) => {
                                                        // Fallback to coordinates if map fails to load
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <div style={{ display: 'none', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                                                    <small>
                                                        <span className="badge badge-green">
                                                            {Math.round(lat * 100000) / 100000}
                                                        </span>
                                                        {" , "}
                                                        <span className="badge badge-green">
                                                            {Math.round(lng * 100000) / 100000}
                                                        </span>
                                                    </small>
                                                </div>
                                            </Link>
                                        </div>
                                    </td>
                                    <td>
                                        <Link to={`/detail/${plaque.id}`} title="View plaque details">
                                            <div className="img-thumbnail" style={{ cursor: 'pointer' }}>
                                                <CroppedImage
                                                    plaque={plaque}
                                                    size="small"
                                                    width={80}
                                                    height={60}
                                                    context="thumbnail"
                                                />
                                            </div>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                </tbody>
            </table>
        </div>
    );
}
