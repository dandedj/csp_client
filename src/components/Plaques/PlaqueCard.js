import React from "react";
import PropTypes from "prop-types";
import { Card, Row, Col, Badge, ProgressBar } from "react-bootstrap";
import Plaque from "./Plaque";
import CroppedImage from "../Common/CroppedImage";
import PlaqueImageComparison from "../Common/PlaqueImageComparison";
import { getCardImageUrl, getImageAltText, getImageSrcSet, getImageSizes, getImageUrl, hasCroppingCoordinates, hasCroppedImageUrl } from "../../utils/imageUtils";

function PlaqueCard({ plaque }) {
    // Helper to get the plaque text, supporting both field naming conventions
    const getPlaqueText = () => {
        if (!plaque) return "No text available";
        // Check both possible field names
        return plaque.text || plaque.plaque_text || "No text available";
    };
    
    // Log the plaque data for debugging
    console.log("PlaqueCard received:", plaque);

    const hasCropping = hasCroppingCoordinates(plaque);
    const hasCroppedUrl = hasCroppedImageUrl(plaque);
    const shouldShowComparison = hasCroppedUrl || hasCropping;

    return (
        <>
            {plaque && (
                <Card>
                    <Card.Body>
                        {/* Plaque Text at the top */}
                        <Row className="mb-3">
                            <Col>
                                {plaque.text ? (
                                    <Plaque text={plaque.text} confidence={plaque.confidence} />
                                ) : plaque.plaque_text ? (
                                    <Plaque text={plaque.plaque_text} confidence={plaque.confidence} />
                                ) : (
                                    <Plaque text="No text available" confidence={plaque.confidence} />
                                )}
                            </Col>
                        </Row>
                        
                        {/* Images Section */}
                        <div className="mb-3">
                            {shouldShowComparison ? (
                                <PlaqueImageComparison
                                    plaque={plaque}
                                    size="large"
                                    width="100%"
                                    height={400}
                                    showBothWhenAvailable={true}
                                />
                            ) : (
                                <div>
                                    <h6 className="text-muted mb-2">Plaque Image</h6>
                                    <CroppedImage
                                        plaque={plaque}
                                        size="large"
                                        width="100%"
                                        height="auto"
                                        className="rounded"
                                        context="detail"
                                        imageType="original"
                                        style={{maxHeight: '500px', objectFit: 'contain'}}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* Compact data section */}
                        <Card.Text className="small">
                            <Row>
                                <Col md={6}>
                                    <strong>ID:</strong> <span className="badge badge-brand-secondary">{plaque.id}</span><br />
                                    <strong>Location:</strong>{" "}
                                    <span className="badge badge-green">
                                        {Math.round(plaque.location?.latitude*100000)/100000 || Math.round(plaque.latitude*100000)/100000},
                                        {Math.round(plaque.location?.longitude*100000)/100000 || Math.round(plaque.longitude*100000)/100000}
                                    </span><br />
                                    <strong>Camera:</strong>{" "}
                                    <span className="badge badge-purple">
                                        {Math.round(plaque.photo?.camera_position?.latitude*100000)/100000 || Math.round(plaque.latitude*100000)/100000},
                                        {Math.round(plaque.photo?.camera_position?.longitude*100000)/100000 || Math.round(plaque.longitude*100000)/100000}
                                    </span>
                                    {(plaque.photo?.camera_position?.bearing || plaque.bearing) && (
                                        <> <span className="badge badge-brand-secondary">{plaque.photo?.camera_position?.bearing || plaque.bearing}&deg;</span></>
                                    )}
                                </Col>
                                <Col md={6}>
                                    <strong>Confidence:</strong><br />
                                    <div className="d-flex align-items-center mb-1">
                                        <span style={{minWidth: '60px'}}>Text:</span>
                                        <ProgressBar 
                                            now={plaque.confidence} 
                                            label={`${plaque.confidence}%`} 
                                            className={plaque.confidence > 80 ? "progress-bar-green" : "progress-bar-purple"}
                                            style={{ width: '100%', maxWidth: '150px' }}
                                        />
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <span style={{minWidth: '60px'}}>Location:</span>
                                        <ProgressBar 
                                            now={plaque.location?.confidence} 
                                            label={`${plaque.location?.confidence}%`} 
                                            className={plaque.location?.confidence > 80 ? "progress-bar-green" : "progress-bar-purple"}
                                            style={{ width: '100%', maxWidth: '150px' }}
                                        />
                                    </div>
                                </Col>
                            </Row>
                            
                            {/* Additional details in a compact format */}
                            {(plaque.estimated_distance || plaque.position_in_image || plaque.cropping_coordinates) && (
                                <Row className="mt-2">
                                    <Col>
                                        {plaque.estimated_distance && (
                                            <>
                                                <strong>Distance:</strong>{" "}
                                                <span className="badge badge-brand-secondary">{plaque.estimated_distance}m</span>
                                                {plaque.offset_direction && (
                                                    <> <span className="badge badge-brand-secondary">{plaque.offset_direction}</span></>
                                                )}
                                                <br />
                                            </>
                                        )}
                                        {plaque.position_in_image && (
                                            <>
                                                <strong>Image Position:</strong>{" "}
                                                <span className="badge badge-brand-secondary">x: {Math.round(plaque.position_in_image.x * 100)}%</span>{" "}
                                                <span className="badge badge-brand-secondary">y: {Math.round(plaque.position_in_image.y * 100)}%</span>
                                                <br />
                                            </>
                                        )}
                                        {plaque.cropping_coordinates && (
                                            <>
                                                <strong>Cropping:</strong>{" "}
                                                <span className="badge badge-green">x: {Math.round(plaque.cropping_coordinates.x * 100)}%</span>{" "}
                                                <span className="badge badge-green">y: {Math.round(plaque.cropping_coordinates.y * 100)}%</span>{" "}
                                                <span className="badge badge-green">w: {Math.round(plaque.cropping_coordinates.width * 100)}%</span>{" "}
                                                <span className="badge badge-green">h: {Math.round(plaque.cropping_coordinates.height * 100)}%</span>
                                                <br />
                                            </>
                                        )}
                                    </Col>
                                </Row>
                            )}
                            
                            {/* Related plaques */}
                            {plaque.related_plaques && plaque.related_plaques.length > 0 && (
                                <>
                                    <hr className="my-3" />
                                    <strong>Related Plaques:</strong>
                                    <Row className="mt-2">
                                        {plaque.related_plaques.map((relatedPlaque, index) => (
                                            <Col md={6} key={index} className="mb-2">
                                                <Card>
                                                    <Card.Body className="p-2">
                                                        <Card.Title className="h6 mb-1">
                                                            <span className="badge badge-purple">{relatedPlaque.id}</span>
                                                        </Card.Title>
                                                        <Card.Text className="small mb-0">
                                                            {relatedPlaque.text || relatedPlaque.plaque_text || "No text available"}
                                                        </Card.Text>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                </>
                            )}
                            
                            {/* OCR Analysis Section */}
                            {plaque.ocr_analysis && (
                                <>
                                    <hr className="my-3" />
                                    <strong>AI Consensus OCR Analysis:</strong>
                                    
                                    {/* Consensus Summary */}
                                    <Row className="mt-2 mb-3">
                                        <Col>
                                            <div className="p-3 bg-light rounded">
                                                <Row>
                                                    <Col md={6}>
                                                        <div className="mb-2">
                                                            <strong>Method:</strong>
                                                            <span className="ms-2 badge badge-brand-secondary">
                                                                {plaque.ocr_analysis.method?.toUpperCase() || 'UNKNOWN'}
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <strong>Services Used:</strong>
                                                            <div className="mt-1">
                                                                {plaque.ocr_analysis.services_used?.map(service => (
                                                                    <span key={service} className={`badge me-1 ${
                                                                        service === 'tesseract' ? 'badge-brand-secondary' :
                                                                        service === 'openai' ? 'badge-brand-green' :
                                                                        service === 'claude' ? 'badge-brand-purple' :
                                                                        service === 'google_vision' ? 'badge-purple' : 'badge-brand-secondary'
                                                                    }`}>
                                                                        {service}
                                                                    </span>
                                                                )) || <span className="text-muted">No services data</span>}
                                                            </div>
                                                        </div>
                                                    </Col>
                                                    <Col md={6}>
                                                        <div className="mb-2">
                                                            <strong>Consensus Score:</strong>
                                                            <span className="ms-2 badge badge-green">
                                                                {plaque.ocr_analysis.consensus_score?.toFixed(1) || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <strong>Processing Time:</strong>
                                                            <span className="ms-2 badge badge-brand-secondary">
                                                                {plaque.ocr_analysis.processing_time?.toFixed(2) || 'N/A'}s
                                                            </span>
                                                        </div>
                                                        {plaque.ocr_analysis.timestamp && (
                                                            <div className="mb-2">
                                                                <strong>Processed:</strong>
                                                                <div className="small text-muted">
                                                                    {new Date(plaque.ocr_analysis.timestamp).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    {/* Individual Service Results */}
                                    {plaque.individual_extractions && (
                                        <Row className="mt-2 extractor-results">
                                            {['tesseract', 'openai', 'claude', 'google_vision'].map(service => {
                                                const extraction = plaque.individual_extractions[service];
                                                // Check if extraction exists and has any data
                                                if (!extraction || (!extraction.text && extraction.confidence === undefined)) {
                                                    return (
                                                        <Col md={3} key={service} className="mb-3">
                                                            <Card className="h-100">
                                                                <Card.Header className={`text-center ${
                                                                    service === 'tesseract' ? 'bg-brand-secondary' :
                                                                    service === 'claude' ? 'bg-brand-purple' :
                                                                    service === 'openai' ? 'bg-brand-green' : 
                                                                    service === 'google_vision' ? 'bg-purple' : 'bg-brand-gray-medium'
                                                                } text-white`}>
                                                                    <strong>{service === 'google_vision' ? 'Google Vision' : service.charAt(0).toUpperCase() + service.slice(1)}</strong>
                                                                </Card.Header>
                                                                <Card.Body className="p-2 text-center text-muted">
                                                                    <small>No data available</small>
                                                                </Card.Body>
                                                            </Card>
                                                        </Col>
                                                    );
                                                }
                                                
                                                return (
                                                    <Col md={3} key={service} className="mb-3">
                                                        <Card className="h-100">
                                                            <Card.Header className={`text-center ${
                                                                service === 'tesseract' ? 'bg-brand-secondary' :
                                                                service === 'claude' ? 'bg-brand-purple' :
                                                                service === 'openai' ? 'bg-brand-green' : 
                                                                service === 'google_vision' ? 'bg-purple' : 'bg-brand-gray-medium'
                                                            } text-white`}>
                                                                <strong>{service === 'google_vision' ? 'Google Vision' : service.charAt(0).toUpperCase() + service.slice(1)}</strong>
                                                            </Card.Header>
                                                            <Card.Body className="p-2">
                                                                {extraction.text && (
                                                                    <>
                                                                        <Card.Text className="small mb-2">
                                                                            <strong>Text:</strong><br/>
                                                                            <span className="font-monospace" style={{fontSize: '0.8rem'}}>{extraction.text}</span>
                                                                        </Card.Text>
                                                                    </>
                                                                )}
                                                                {extraction.confidence !== null && extraction.confidence !== undefined && (
                                                                    <div className="mb-2">
                                                                        <strong className="small">Confidence:</strong>
                                                                        <div className="d-flex align-items-center">
                                                                            <ProgressBar 
                                                                                now={extraction.confidence} 
                                                                                label={`${extraction.confidence}%`}
                                                                                className={extraction.confidence > 80 ? "progress-bar-green" : "progress-bar-purple"}
                                                                                style={{ width: '100%', maxWidth: '100px' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                    
                                    {/* Agreement Matrix */}
                                    {plaque.ocr_analysis.agreement_matrix && (
                                        <Row className="mt-3">
                                            <Col>
                                                <details>
                                                    <summary className="small text-muted mb-2" style={{cursor: 'pointer'}}>
                                                        <strong>Service Agreement Matrix</strong>
                                                    </summary>
                                                    <div className="p-2 bg-light rounded">
                                                        <pre className="small mb-0" style={{fontSize: '0.7rem', maxHeight: '200px', overflow: 'auto'}}>
                                                            {JSON.stringify(plaque.ocr_analysis.agreement_matrix, null, 2)}
                                                        </pre>
                                                    </div>
                                                </details>
                                            </Col>
                                        </Row>
                                    )}
                                </>
                            )}
                            
                            {/* YOLO Detection Analysis */}
                            {plaque.yolo_detection && (
                                <>
                                    <hr className="my-3" />
                                    <strong>Object Detection Analysis:</strong>
                                    <Row className="mt-2">
                                        <Col>
                                            <div className="p-2 bg-light rounded">
                                                <Row>
                                                    <Col md={6}>
                                                        {plaque.yolo_detection.bbox && (
                                                            <div className="mb-2">
                                                                <strong>Bounding Box:</strong>
                                                                <div className="small">
                                                                    <span className="badge badge-brand-secondary me-1">
                                                                        x1: {Math.round(plaque.yolo_detection.bbox.x1)}
                                                                    </span>
                                                                    <span className="badge badge-brand-secondary me-1">
                                                                        y1: {Math.round(plaque.yolo_detection.bbox.y1)}
                                                                    </span>
                                                                    <span className="badge badge-brand-secondary me-1">
                                                                        x2: {Math.round(plaque.yolo_detection.bbox.x2)}
                                                                    </span>
                                                                    <span className="badge badge-brand-secondary">
                                                                        y2: {Math.round(plaque.yolo_detection.bbox.y2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {plaque.yolo_detection.confidence && (
                                                            <div className="mb-2">
                                                                <strong>Detection Confidence:</strong>
                                                                <div className="d-flex align-items-center mt-1">
                                                                    <ProgressBar 
                                                                        now={plaque.yolo_detection.confidence * 100} 
                                                                        label={`${(plaque.yolo_detection.confidence * 100).toFixed(1)}%`}
                                                                        className="progress-bar-green"
                                                                        style={{ width: '100%', maxWidth: '150px' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Col>
                                                    <Col md={6}>
                                                        {plaque.yolo_detection.dimensions && (
                                                            <div className="mb-2">
                                                                <strong>Plaque Dimensions:</strong>
                                                                <div className="small">
                                                                    <span className="badge badge-purple me-1">
                                                                        {plaque.yolo_detection.dimensions.width} × {plaque.yolo_detection.dimensions.height} px
                                                                    </span>
                                                                    <span className="badge badge-purple">
                                                                        {plaque.yolo_detection.dimensions.aspect_ratio?.toFixed(2)} ratio
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Col>
                                                </Row>
                                            </div>
                                        </Col>
                                    </Row>
                                </>
                            )}
                            
                            {/* Legacy Individual Extractor Results (fallback) */}
                            {plaque.individual_extractions && !plaque.ocr_analysis && (
                                <>
                                    <hr className="my-3" />
                                    <strong>Legacy Extractor Results:</strong>
                                    
                                    {/* Individual Service Results */}
                                    <Row className="mt-2 extractor-results">
                                        {['claude', 'openai', 'gemini'].map(service => {
                                            const extraction = plaque.individual_extractions[service];
                                            if (!extraction || (!extraction.text && !extraction.confidence && !extraction.raw_result)) {
                                                return null;
                                            }
                                            
                                            return (
                                                <Col md={4} key={service} className="mb-3">
                                                    <Card className="h-100">
                                                        <Card.Header className={`text-center ${
                                                            service === 'claude' ? 'bg-brand-purple' :
                                                            service === 'openai' ? 'bg-brand-green' : 'bg-brand-gray-medium'
                                                        } text-white`}>
                                                            <strong>{service.charAt(0).toUpperCase() + service.slice(1)}</strong>
                                                        </Card.Header>
                                                        <Card.Body className="p-2">
                                                            {extraction.text && (
                                                                <Card.Text className="small mb-2">
                                                                    <strong>Text:</strong><br/>
                                                                    <span className="font-monospace">{extraction.text}</span>
                                                                </Card.Text>
                                                            )}
                                                            {extraction.confidence !== null && extraction.confidence !== undefined && (
                                                                <div className="mb-2">
                                                                    <strong className="small">Confidence:</strong>
                                                                    <div className="d-flex align-items-center">
                                                                        <ProgressBar 
                                                                            now={extraction.confidence} 
                                                                            label={`${extraction.confidence}%`}
                                                                            className={extraction.confidence > 80 ? "progress-bar-green" : "progress-bar-purple"}
                                                                            style={{ width: '100%', maxWidth: '120px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </>
                            )}
                            
                            {/* Single Extractor Type Display */}
                            {plaque.extractor_type && plaque.extractor_type !== 'consensus' && (
                                <>
                                    <hr className="my-3" />
                                    <Row>
                                        <Col>
                                            <strong>Extraction Method:</strong>
                                            <span className="ms-2 badge badge-brand-secondary">
                                                {plaque.extractor_type.toUpperCase()}
                                            </span>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </Card.Text>
                    </Card.Body>
                </Card>
            )}
        </>
    );
}

PlaqueCard.propTypes = {
    plaque: PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string,
        plaque_text: PropTypes.string, // Add support for the alternate field name
        confidence: PropTypes.number,
        location: PropTypes.shape({
            latitude: PropTypes.number,
            longitude: PropTypes.number,
            confidence: PropTypes.number
        }),
        photo: PropTypes.shape({
            id: PropTypes.string,
            url: PropTypes.string,
            camera_position: PropTypes.shape({
                latitude: PropTypes.number,
                longitude: PropTypes.number,
                bearing: PropTypes.number
            })
        }),
        position_in_image: PropTypes.shape({
            x: PropTypes.number,
            y: PropTypes.number
        }),
        estimated_distance: PropTypes.number,
        offset_direction: PropTypes.string,
        cropped_image_url: PropTypes.string,
        cropping_coordinates: PropTypes.shape({
            x: PropTypes.number,
            y: PropTypes.number,
            width: PropTypes.number,
            height: PropTypes.number
        }),
        related_plaques: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.string,
                text: PropTypes.string,
                plaque_text: PropTypes.string, // Add support for the alternate field name
                preview: PropTypes.bool
            })
        ),
        individual_extractions: PropTypes.object,
        extractor_type: PropTypes.string,
        confidence_level: PropTypes.string,
        agreement_count: PropTypes.number,
        total_services: PropTypes.number,
        services_agreed: PropTypes.array
    }).isRequired,
};

export default PlaqueCard;
