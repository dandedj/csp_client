import React from "react";
import PropTypes from "prop-types";
import { Card, Row, Col, Badge, ProgressBar } from "react-bootstrap";
import Plaque from "./Plaque";
import CroppedImage from "../Common/CroppedImage";
import { getCardImageUrl, getImageAltText, getImageSrcSet, getImageSizes, getImageUrl, hasCroppingCoordinates } from "../../utils/imageUtils";

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
    const imageUrl = getImageUrl(plaque, 'medium');

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
                            {hasCropping ? (
                                <Row>
                                    <Col md={6}>
                                        <h6 className="text-muted mb-2">Cropped Image</h6>
                                        <CroppedImage
                                            plaque={plaque}
                                            size="medium"
                                            width="100%"
                                            height={250}
                                            className="rounded"
                                            context="card"
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="text-muted mb-2">Full Image</h6>
                                        <img
                                            src={imageUrl}
                                            alt={getImageAltText(plaque, 'card')}
                                            className="img-fluid rounded"
                                            style={{ width: '100%', height: 250, objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    </Col>
                                </Row>
                            ) : (
                                <div>
                                    <h6 className="text-muted mb-2">Full Image</h6>
                                    <CroppedImage
                                        plaque={plaque}
                                        size="medium"
                                        width="100%"
                                        height={300}
                                        className="rounded"
                                        context="card"
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
        )
    }).isRequired,
};

export default PlaqueCard;
