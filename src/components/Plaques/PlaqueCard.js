import React, { useState } from "react";
import PropTypes from "prop-types";
import { Card, Row, Col, Badge, ProgressBar, Button } from "react-bootstrap";
import Plaque from "./Plaque";
import CroppedImage from "../Common/CroppedImage";
import PlaqueImageComparison from "../Common/PlaqueImageComparison";
import { getCardImageUrl, getImageAltText, getImageSrcSet, getImageSizes, getImageUrl, hasCroppingCoordinates, hasCroppedImageUrl } from "../../utils/imageUtils";
import { calculateAIConsensusScore, getConsensusLabel } from "../../utils/textSimilarity";

function PlaqueCard({ plaque }) {
    const [showOriginal, setShowOriginal] = useState(false);
    
    // Helper to get the plaque text, supporting both field naming conventions
    const getPlaqueText = () => {
        if (!plaque) return "No text available";
        // Check both possible field names
        return plaque.text || plaque.plaque_text || "No text available";
    };
    
    // Log the plaque data for debugging
    console.log("PlaqueCard received:", plaque);

    // Always show comparison button since we always have cropped images
    const shouldShowComparison = true;

    return (
        <>
            {plaque && (
                <Card>
                    <Card.Body>
                        {/* Plaque Text at the top */}
                        <Row className="mb-3">
                            <Col>
                                {plaque.text ? (
                                    <Plaque text={plaque.text} />
                                ) : plaque.plaque_text ? (
                                    <Plaque text={plaque.plaque_text} />
                                ) : (
                                    <Plaque text="No text available" />
                                )}
                            </Col>
                        </Row>
                        
                        {/* Images Section */}
                        <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="text-muted mb-0">
                                    {showOriginal ? 'Original Photo' : 'Plaque Image'}
                                </h6>
                                {shouldShowComparison && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm"
                                        onClick={() => setShowOriginal(!showOriginal)}
                                    >
                                        {showOriginal ? 'View Plaque' : 'View Original Photo'}
                                    </Button>
                                )}
                            </div>
                            
                            {showOriginal && shouldShowComparison ? (
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
                            ) : (
                                <CroppedImage
                                    plaque={plaque}
                                    size="large"
                                    width="100%"
                                    height="auto"
                                    className="rounded"
                                    context="detail"
                                    imageType="cropped"
                                    style={{maxHeight: '500px', objectFit: 'contain'}}
                                />
                            )}
                        </div>
                        
                        {/* Simplified data section - removed all technical details */}
                        <Card.Text className="small">
                            
                            {/* OCR Analysis Section - show if we have service_results or individual_extractions */}
                            {(plaque.service_results || (plaque.ocr_analysis && plaque.individual_extractions && 
                             (plaque.individual_extractions.openai?.text || 
                              plaque.individual_extractions.claude?.text || 
                              plaque.individual_extractions.google_vision?.text))) && (
                                <>
                                    <hr className="my-3" />
                                    <strong>AI Text Extraction Analysis:</strong>
                                    
                                    {/* Simplified Consensus Summary */}
                                    <Row className="mt-2 mb-3">
                                        <Col>
                                            <div className="p-3 bg-light rounded text-center">
                                                {(() => {
                                                    // Calculate nuanced consensus score based on text similarity
                                                    let consensusScore = 0;
                                                    
                                                    // First try to calculate from service_results (new format)
                                                    if (plaque.service_results) {
                                                        // Convert service_results to format expected by calculateAIConsensusScore
                                                        const convertedExtractions = {};
                                                        for (const [service, result] of Object.entries(plaque.service_results)) {
                                                            // Include all services, even those with null results
                                                            const serviceName = service === 'gemini' ? 'google_vision' : service;
                                                            if (result === null || result === undefined) {
                                                                convertedExtractions[serviceName] = null;
                                                            } else if (typeof result === 'string') {
                                                                convertedExtractions[serviceName] = { text: result };
                                                            }
                                                        }
                                                        // Always calculate consensus if we have service results
                                                        if (Object.keys(convertedExtractions).length > 0) {
                                                            consensusScore = calculateAIConsensusScore(convertedExtractions);
                                                        }
                                                    }
                                                    // Fall back to individual_extractions (old format)
                                                    else if (plaque.individual_extractions) {
                                                        consensusScore = calculateAIConsensusScore(plaque.individual_extractions);
                                                    }
                                                    // Last resort: use pre-calculated values
                                                    else if (plaque.ocr_analysis) {
                                                        consensusScore = plaque.ocr_analysis.consensus_score?.toFixed(0) || plaque.ocr_analysis.agreement_count || 0;
                                                    }
                                                    const consensusLabel = getConsensusLabel(consensusScore);
                                                    
                                                    return (
                                                        <>
                                                            <h5 className="mb-0">
                                                                <strong>AI Consensus:</strong>
                                                                <span 
                                                                    className="ms-2 badge"
                                                                    style={{
                                                                        fontSize: '1.1em',
                                                                        backgroundColor: consensusScore >= 75 ? '#198754' : 
                                                                                       consensusScore >= 50 ? '#fd7e14' : 
                                                                                       '#dc3545',
                                                                        color: 'white',
                                                                        fontWeight: 'bold'
                                                                    }}
                                                                >
                                                                    {consensusScore}%
                                                                </span>
                                                            </h5>
                                                            <small className="text-muted">{consensusLabel} - AI services agree on {consensusScore}% of the text</small>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    {/* Individual Service Results */}
                                    {(plaque.service_results || plaque.individual_extractions) && (
                                        <Row className="mt-2 extractor-results">
                                            {['openai', 'claude', 'gemini'].map(service => {
                                                // First check service_results (new format)
                                                let extractionText = null;
                                                if (plaque.service_results && service in plaque.service_results) {
                                                    const result = plaque.service_results[service];
                                                    if (typeof result === 'string') {
                                                        extractionText = result;
                                                    } else if (result === null) {
                                                        extractionText = '';  // No text found
                                                    }
                                                }
                                                // Fall back to individual_extractions (old format)
                                                else if (plaque.individual_extractions) {
                                                    const serviceName = service === 'gemini' ? 'google_vision' : service;
                                                    const extraction = plaque.individual_extractions[serviceName];
                                                    if (extraction && extraction.text) {
                                                        extractionText = extraction.text;
                                                    }
                                                }
                                                
                                                // Check if we have any data for this service
                                                if (extractionText === null) {
                                                    return (
                                                        <Col md={3} key={service} className="mb-3">
                                                            <Card className="h-100">
                                                                <Card.Header className={`text-center ${
                                                                    service === 'claude' ? 'bg-brand-purple' :
                                                                    service === 'openai' ? 'bg-brand-green' : 
                                                                    service === 'gemini' ? 'bg-purple' : 'bg-brand-gray-medium'
                                                                } text-white`}>
                                                                    <strong>{service.charAt(0).toUpperCase() + service.slice(1)}</strong>
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
                                                                service === 'claude' ? 'bg-brand-purple' :
                                                                service === 'openai' ? 'bg-brand-green' : 
                                                                service === 'gemini' ? 'bg-purple' : 'bg-brand-gray-medium'
                                                            } text-white`}>
                                                                <strong>{service.charAt(0).toUpperCase() + service.slice(1)}</strong>
                                                            </Card.Header>
                                                            <Card.Body className="p-2">
                                                                <Card.Text className="small mb-2">
                                                                    <span className="font-monospace" style={{fontSize: '0.8rem'}}>
                                                                        {extractionText || <em className="text-muted">No text found</em>}
                                                                    </span>
                                                                </Card.Text>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}
                                    
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
