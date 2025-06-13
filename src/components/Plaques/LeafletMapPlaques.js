import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ProgressBar, Toast, Form } from 'react-bootstrap';
import Modal from 'react-bootstrap/Modal';
import { PlaquesService } from '../../services/PlaquesService';
import PlaqueCard from './PlaqueCard';
import { SearchContext } from './SearchContext';
import { useSearchParams } from 'react-router-dom';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

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

// Initial map center (approximate park center)
const initialMapCenter = [34.841326395062595, -82.39848640537643];

// Map bounds updater component
const MapBoundsUpdater = ({ onBoundsChange, parkGeoJSON, setMapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    // Store map reference for parent component
    setMapRef(map);
    
    const updateBounds = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    };
    
    // Initial bounds
    updateBounds();
    
    // Listen for map events
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    
    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map, onBoundsChange, setMapRef]);
  
  // Note: Removed automatic fitBounds to preserve initial zoom level
  // The "Fit to Park" button can be used to manually fit to park bounds if needed
  
  return null;
};

// Custom marker clustering component
const MarkerCluster = ({ plaques, onMarkerClick, currentZoom }) => {
  const shouldCluster = currentZoom < 18 && plaques.length > 25;
  
  if (!shouldCluster) {
    // Render individual markers
    return plaques.map((plaque) => {
      const lat = plaque.location?.latitude || plaque.latitude;
      const lng = plaque.location?.longitude || plaque.longitude;
      
      if (!lat || !lng) return null;
      
      return (
        <Marker
          key={plaque.id}
          position={[lat, lng]}
          eventHandlers={{
            click: () => onMarkerClick(plaque)
          }}
        >
          <Popup>
            <div style={{ maxWidth: '300px' }}>
              <strong>Confidence: {plaque.confidence}%</strong>
              <br />
              {plaque.text ? plaque.text.substring(0, 100) + '...' : 'No text available'}
            </div>
          </Popup>
        </Marker>
      );
    });
  }
  
  // Simple clustering by rounding coordinates
  const clusters = {};
  const precision = currentZoom < 14 ? 3 : currentZoom < 16 ? 4 : 5;
  
  plaques.forEach(plaque => {
    const lat = plaque.location?.latitude || plaque.latitude;
    const lng = plaque.location?.longitude || plaque.longitude;
    
    if (!lat || !lng) return;
    
    const roundedLat = parseFloat(lat).toFixed(precision);
    const roundedLng = parseFloat(lng).toFixed(precision);
    const key = `${roundedLat},${roundedLng}`;
    
    if (!clusters[key]) {
      clusters[key] = [];
    }
    clusters[key].push(plaque);
  });
  
  return Object.entries(clusters).map(([key, clusterPlaques]) => {
    if (clusterPlaques.length === 1) {
      const plaque = clusterPlaques[0];
      const lat = plaque.location?.latitude || plaque.latitude;
      const lng = plaque.location?.longitude || plaque.longitude;
      
      return (
        <Marker
          key={plaque.id}
          position={[lat, lng]}
          eventHandlers={{
            click: () => onMarkerClick(plaque)
          }}
        >
          <Popup>
            <div style={{ maxWidth: '300px' }}>
              <strong>Confidence: {plaque.confidence}%</strong>
              <br />
              {plaque.text ? plaque.text.substring(0, 100) + '...' : 'No text available'}
            </div>
          </Popup>
        </Marker>
      );
    } else {
      // Create cluster marker
      const firstPlaque = clusterPlaques[0];
      const lat = firstPlaque.location?.latitude || firstPlaque.latitude;
      const lng = firstPlaque.location?.longitude || firstPlaque.longitude;
      
      const clusterIcon = L.divIcon({
        html: `<div style="background: #8B5A96; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${clusterPlaques.length}</div>`,
        className: 'cluster-marker marker-cluster-purple',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      return (
        <Marker
          key={key}
          position={[lat, lng]}
          icon={clusterIcon}
        >
          <Popup>
            <div style={{ maxWidth: '300px' }}>
              <strong>{clusterPlaques.length} plaques in this area</strong>
              <br />
              Click to zoom in for individual plaques
            </div>
          </Popup>
        </Marker>
      );
    }
  });
};

const LeafletMapPlaques = () => {
  const [plaques, setPlaques] = useState([]);
  const [selectedPlaque, setSelectedPlaque] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { searchQuery, setSearchQuery } = useContext(SearchContext);
  const confidenceThreshold = 0;
  const [grouped, setGrouped] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
      const [currentZoom, setCurrentZoom] = useState(18);
  const [mapBounds, setMapBounds] = useState(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState({});
  const [parkGeoJSON, setParkGeoJSON] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  
  // Debounce the local search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromURL = searchParams.get('query');
  const isFirstRender = useRef(true);

  // Determine how many plaques to load based on zoom level
  const getMarkerLimit = useCallback((zoom) => {
    if (zoom >= 18) return 800;
    if (zoom >= 16) return 500;
    if (zoom >= 14) return 300;
    if (zoom >= 12) return 200;
    return 100;
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((plaque) => {
    setSelectedPlaque(plaque);
  }, []);

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  // Load park GeoJSON data
  useEffect(() => {
    fetch('/geo/park.geojson')
      .then(response => response.json())
      .then(data => setParkGeoJSON(data))
      .catch(error => console.error('Error loading park GeoJSON:', error));
  }, []);

  // Sync context state with URL parameter on component mount
  useEffect(() => {
    if (queryFromURL && queryFromURL !== searchQuery) {
      setSearchQuery(queryFromURL);
      setLocalSearchQuery(queryFromURL);
      
      if (queryFromURL && queryFromURL.length > 10 && plaques.length > 0) {
        const matchingPlaque = plaques.find(p => p.id === queryFromURL);
        if (matchingPlaque) {
          handleMarkerClick(matchingPlaque);
        }
      }
    }
  }, [queryFromURL, setSearchQuery, plaques, handleMarkerClick, searchQuery]);

  // Update search context and URL when debounced query changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSearchQuery(debouncedSearchQuery);
    
    if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
      setSearchParams({ query: debouncedSearchQuery });
    } else {
      setSearchParams({});
    }
  }, [debouncedSearchQuery, setSearchQuery, setSearchParams]);

  // Load plaques based on search, confidence, and viewport
  useEffect(() => {
    setLoading(true);
    setHasMoreData(true);
    
    const query = searchQuery;
    const plaquesService = new PlaquesService();
    const limit = getMarkerLimit(currentZoom);
    
    // Prepare viewport bounds for spatial filtering
    let bounds = null;
    if (mapBounds && currentZoom >= 14) {
      bounds = {
        north: mapBounds.north,
        south: mapBounds.south,
        east: mapBounds.east,
        west: mapBounds.west
      };
      console.log('Using viewport bounds for spatial filtering:', bounds);
    } else {
      console.log('Skipping spatial filtering: zoom level too low or bounds not available');
    }
    
    // Fetch plaques with pagination and optional spatial filtering
    const plaquesPromise =
      query == null || query.trim() === ''
        ? plaquesService.getAllPlaques(confidenceThreshold, grouped, limit, 0, bounds)
        : plaquesService.getPlaques(query, confidenceThreshold, limit);
    
    plaquesPromise
      .then((result) => {
        setPlaques(result.plaques || []);
        
        const total = result.totalCount || 0;
        setPaginationInfo({
          totalCount: total,
          filteredCount: result.filteredCount || 0,
          page: result.page || 1,
          limit: result.limit || limit,
          offset: result.offset || 0
        });
        
        setHasMoreData(total > (result.plaques?.length || 0));
        setLoading(false);
        console.log(`Loaded ${result.plaques?.length || 0} plaques out of ${total} total`);
        
        // If there's a plaque ID in the URL, try to find and select that plaque
        if (queryFromURL && queryFromURL.length > 10 && result.plaques?.length > 0) {
          const matchingPlaque = result.plaques.find(p => p.id === queryFromURL);
          if (matchingPlaque) {
            setTimeout(() => {
              setSelectedPlaque(matchingPlaque);
            }, 500);
          }
        }
      })
      .catch((error) => {
        console.error('There has been a problem with your fetch operation:', error);
        setError('There has been a problem with your fetch operation');
        setLoading(false);
        setHasMoreData(false);
      });
  }, [searchQuery, confidenceThreshold, grouped, currentZoom, getMarkerLimit, mapBounds, queryFromURL]);

  const handleSearchChange = (event) => {
    setLocalSearchQuery(event.target.value);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setSearchQuery(localSearchQuery);
    
    if (localSearchQuery && localSearchQuery.trim() !== '') {
      setSearchParams({ query: localSearchQuery });
    } else {
      setSearchParams({});
    }
  };

  const handleGroupedChange = (event) => {
    setGrouped(event.target.checked);
  };

  const handleFitToPark = () => {
    if (parkGeoJSON && mapRef) {
      try {
        const geoJsonLayer = L.geoJSON(parkGeoJSON);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          mapRef.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (error) {
        console.error('Error fitting to park bounds:', error);
      }
    }
  };

  // GeoJSON style
  const geoJsonStyle = {
    color: '#8B5A96',
    weight: 2,
    opacity: 0.6,
    fillOpacity: 0.1
  };

  return (
    <div>
      {/* Search Controls */}
      <div className="row mb-3">
        <div className="col-md-8">
          <Form onSubmit={handleFormSubmit}>
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Search plaques by text..."
                value={localSearchQuery}
                onChange={handleSearchChange}
              />
            </Form.Group>
          </Form>
        </div>
        <div className="col-md-4 d-flex align-items-center justify-content-between">
          <Form.Check
            type="checkbox"
            label="Group nearby plaques"
            checked={grouped}
            onChange={handleGroupedChange}
          />
          <button 
            className="btn btn-primary btn-sm"
            onClick={handleFitToPark}
            disabled={!parkGeoJSON}
          >
            📍 Fit to Park
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="mb-3">
          <ProgressBar animated now={100} label="Loading plaques..." className="progress-bar-purple" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Toast show={true} onClose={() => setError(null)} className="mb-3">
          <Toast.Header>
            <strong>Error</strong>
          </Toast.Header>
          <Toast.Body>{error}</Toast.Body>
        </Toast>
      )}

      {/* Map Container */}
      <div style={{ height: '80vh', width: '100%' }}>
        <MapContainer
          center={initialMapCenter}
          zoom={18}
          minZoom={10}
          maxZoom={22}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          boxZoom={true}
          keyboard={true}
          dragging={true}
          whenReady={(map) => {
            setCurrentZoom(map.target.getZoom());
            map.target.on('zoomend', () => {
              setCurrentZoom(map.target.getZoom());
            });
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
            minZoom={10}
          />
          
          {/* Park GeoJSON Layer */}
          {parkGeoJSON && <GeoJSON data={parkGeoJSON} style={geoJsonStyle} />}
          
          {/* Map bounds updater */}
          <MapBoundsUpdater 
            onBoundsChange={handleBoundsChange} 
            parkGeoJSON={parkGeoJSON}
            setMapRef={setMapRef}
          />
          
          {/* Plaque Markers */}
          <MarkerCluster
            plaques={plaques}
            onMarkerClick={handleMarkerClick}
            currentZoom={currentZoom}
          />
        </MapContainer>
      </div>

      {/* Stats */}
      <div className="mt-3 d-flex justify-content-between align-items-center">
        <small className="text-muted">
          Showing {plaques.length} plaques
          {paginationInfo.totalCount && ` of ${paginationInfo.totalCount} total`}
          {currentZoom < 18 && plaques.length > 25 && ' (clustered)'}
        </small>
        <small className="text-muted">
          Zoom: {currentZoom} | Use mouse wheel, +/- keys, or zoom controls to navigate
        </small>
      </div>

      {/* Selected Plaque Modal */}
      <Modal
        show={selectedPlaque !== null}
        onHide={() => setSelectedPlaque(null)}
        size="lg"
      >
        <Modal.Header closeButton className="bg-brand-purple text-white">
          <Modal.Title>Plaque Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPlaque && <PlaqueCard plaque={selectedPlaque} />}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default LeafletMapPlaques;