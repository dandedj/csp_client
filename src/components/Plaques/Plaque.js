import React from "react";
import PropTypes from "prop-types";
import { Card } from "react-bootstrap";

function Plaque({ text }) {
    return (
        <Card>
            <Card.Header>Plaque</Card.Header>
            <Card.Body>
                <Card.Text>{text}</Card.Text>
            </Card.Body>
        </Card>
    );
}

Plaque.propTypes = {
    text: PropTypes.string.isRequired,
};

export default Plaque;
