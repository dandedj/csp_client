import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import React, { useContext, useEffect, useState } from 'react';
import { ProgressBar, Toast } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { renderToString } from 'react-dom/server';
import { BiUpArrowCircle } from 'react-icons/bi';
import { PlaquesService } from '../../services/PlaquesService';
import { SearchContext } from './SearchContext';

const MapPlaques = () => {
    const [plaques, setPlaques] = useState([]);
    const [selectedPlaque, setSelectedPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { searchQuery } = useContext(SearchContext);
    const plaquesService = new PlaquesService();
    const MAP_API_KEY = process.env.REACT_APP_MAPS_API_KEY;

    const containerStyle = {
        width: '100%',
        height: '500px'
    };

    const center = {
        lat: 34.8414189,
        lng: -82.399055
    };

    const icons = [];

    for (let degree = 0; degree <= 350; degree += 10) {
        const svg = renderToString(<BiUpArrowCircle style={{ transform: `rotate(${degree}deg)`, color: 'white' }} />);
        const svgUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        icons.push({ degree, svgUrl });
    }

    useEffect(() => {
        setLoading(true);

        const query = searchQuery

        console.log("Query: ", query);
        console.log(query == null);

        const plaquesPromise = query == null || query.trim() === ''
            ? plaquesService.getAllPlaques()
            : plaquesService.getPlaques(query);

        plaquesPromise
            .then((res) => {
                setPlaques(res);
                setLoading(false);
                console.log("Plaques: ", res.length); // Fix: Use 'res.length' instead of 'plaques.length'
            })
            .catch((error) => {
                console.error('There has been a problem with your fetch operation:', error);
                setError('There has been a problem with your fetch operation');
                setLoading(false);
            });

    }, [searchQuery]);

    const handleMarkerClick = (plaque) => {
        setSelectedPlaque(plaque);
    }

    const handleClose = () => {
        setSelectedPlaque(null);
    }

    console.log("API Key: ", MAP_API_KEY);
    return (
        <div className="container">
            <h1>Plaques</h1>

            {error && (
                <Toast>
                    <Toast.Header>
                        <strong className="me-auto">Error</strong>
                    </Toast.Header>
                    <Toast.Body>{error}</Toast.Body>
                </Toast>
            )}
            <div style={{ height: '100vh', width: '100%' }}>
                <LoadScript
                    googleMapsApiKey={MAP_API_KEY}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        zoom={18}
                        onLoad={map => {
                            map.setMapTypeId(window.google.maps.MapTypeId.SATELLITE);
                            map.setTilt(0);
                        }}
                        center={center}
                    >
                        {plaques.map((plaque, index) => {
                            const rounded_bearing = Math.round(plaque.bearing / 10) * 10; // Round to the nearest 10s
                            const icon = icons.find((item) => item.degree === rounded_bearing);
                            const svgUrl = icon ? icon.svgUrl : null;

                            return (
                                <Marker
                                    key={index}
                                    position={{ lat: plaque.latitude, lng: plaque.longitude }}
                                    icon={{
                                        url: svgUrl,
                                        scaledSize: new window.google.maps.Size(25, 25),
                                    }}
                                    onClick={() => handleMarkerClick(plaque)}
                                />
                            );
                        })}
                    </GoogleMap>
                    <Modal show={selectedPlaque !== null} onHide={handleClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Plaque Details</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {selectedPlaque && (
                                <div>
                                    <p className="small">ID: {selectedPlaque.id}</p>
                                    <p><img alt="{selectedPlaque.id}" src={selectedPlaque.image_path} className="img-thumbnail" ></img></p>
                                    <h5>Text Found:</h5>
                                    <blockquote className="small">{selectedPlaque.text}</blockquote>
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </LoadScript>
                {loading && (
                    <ProgressBar animated now={100} />
                )}
            </div>
        </div>
    );
}

export default MapPlaques;
