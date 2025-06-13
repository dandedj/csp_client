import React from "react";
import PropTypes from "prop-types";
import { Card, Badge } from "react-bootstrap";

function Plaque({ text, confidence }) {
    // Function to get badge class based on confidence
    const getConfidenceBadgeClass = (confidence) => {
        if (!confidence) return "badge-brand-secondary";
        if (confidence > 80) return "badge-green";
        if (confidence > 50) return "badge-purple";
        return "badge-brand-secondary";
    };

    return (
        <Card>
            <Card.Header className="bg-brand-purple text-white">
                Plaque Text
                {confidence && (
                    <span 
                        className={`badge ${getConfidenceBadgeClass(confidence)} ms-2`}
                    >
                        {confidence}% confidence
                    </span>
                )}
            </Card.Header>
            <Card.Body>
                <Card.Text className="plaque-text">{text}</Card.Text>
            </Card.Body>
        </Card>
    );
}

Plaque.propTypes = {
    text: PropTypes.string,
    confidence: PropTypes.number
};

Plaque.defaultProps = {
    text: "No text available"
};

export default Plaque;
