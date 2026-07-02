import React from "react";
import PropTypes from "prop-types";
import { Card, Badge } from "react-bootstrap";

function Plaque({ text }) {
    return (
        <Card>
            <Card.Header className="bg-brand-purple text-white">
                Plaque Text
            </Card.Header>
            <Card.Body>
                <Card.Text className="plaque-text">{text}</Card.Text>
            </Card.Body>
        </Card>
    );
}

Plaque.propTypes = {
    text: PropTypes.string
};

Plaque.defaultProps = {
    text: "No text available"
};

export default Plaque;
