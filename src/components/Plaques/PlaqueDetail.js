import React, { useEffect, useState } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import { PlaquesService } from "../../services/PlaquesService";
import PlaqueCard from "./PlaqueCard";

const PlaqueDetail = () => {
    const [plaque, setPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rawResponse, setRawResponse] = useState(null);

    const { id } = useParams();

    useEffect(() => {
        setLoading(true);
        const plaquesService = new PlaquesService();

        plaquesService
            .getPlaqueById(id)
            .then((res) => {
                // Log the raw response for debugging
                console.log('Raw API response:', res);
                setRawResponse(res);
                
                // Handle different response formats more gracefully
                if (Array.isArray(res)) {
                    // If it's an array with items, use the first one
                    if (res.length > 0) {
                        console.log('Using first item from array response');
                        setPlaque(res[0]);
                    } else {
                        console.warn('API returned empty array');
                        setError("No plaque found with the specified ID");
                    }
                } else if (res && typeof res === 'object') {
                    // If it's a non-null object, use it directly
                    console.log('Using object response directly');
                    setPlaque(res);
                } else if (res === null) {
                    // Handle null response
                    console.warn('API returned null');
                    setError("No plaque found with the specified ID");
                } else {
                    // Handle other unexpected formats
                    console.error('Unexpected API response format:', typeof res);
                    setError(`Invalid data format received from API: ${typeof res}`);
                }
                
                setLoading(false);
            })
            .catch((error) => {
                console.error(
                    "There has been a problem with your fetch operation:",
                    error
                );
                setError("Failed to load plaque details: " + error.message);
                setRawResponse(null);
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" className="spinner-border-purple" />
                    <span className="ms-2">Loading plaque details...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <Alert variant="danger">
                    <Alert.Heading>Error Loading Plaque</Alert.Heading>
                    <p>{error}</p>
                    <hr />
                    <div className="d-flex justify-content-end">
                        <Link to="/list" className="btn btn-outline-primary">
                            Return to Plaque List
                        </Link>
                    </div>
                </Alert>
                
                {/* Show raw response for debugging */}
                {process.env.NODE_ENV === 'development' && rawResponse && (
                    <div className="mt-4">
                        <h5>Raw API Response (Debug):</h5>
                        <pre className="bg-light p-3">
                            {JSON.stringify(rawResponse, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    if (!plaque) {
        return (
            <div className="container mt-4">
                <Alert variant="warning">
                    <Alert.Heading>Plaque Not Found</Alert.Heading>
                    <p>The requested plaque could not be found. It may have been removed or the ID is invalid.</p>
                    <hr />
                    <div className="d-flex justify-content-end">
                        <Link to="/list" className="btn btn-outline-primary">
                            Return to Plaque List
                        </Link>
                    </div>
                </Alert>
                
                {/* Show raw response for debugging */}
                {process.env.NODE_ENV === 'development' && rawResponse && (
                    <div className="mt-4">
                        <h5>Raw API Response (Debug):</h5>
                        <pre className="bg-light p-3">
                            {JSON.stringify(rawResponse, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Plaque Detail</h1>
                <div>
                    <Link to="/list" className="btn btn-outline-primary me-2">
                        BACK TO LIST
                    </Link>
                    <Link to={`/map?query=${id}`} className="btn btn-primary">
                        VIEW ON MAP
                    </Link>
                </div>
            </div>
            <PlaqueCard plaque={plaque} />
            
            {/* Show raw response for debugging */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-4">
                    <h5>Debug Info:</h5>
                    <pre className="bg-light p-3">
                        <strong>ID from URL:</strong> {id}<br/>
                        <strong>Raw plaque object:</strong><br/>
                        {JSON.stringify(plaque, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default PlaqueDetail;
