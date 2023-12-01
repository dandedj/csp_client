import React from "react";
import PropTypes from "prop-types";
import { Card, Row, Col } from "react-bootstrap";
import Plaque from "./Plaque";

function PlaqueCard({ plaque }) {
    return (
        <>
            {plaque && (
                <Card>
                    <Card.Body>
                        <Card.Title>Plaque Information</Card.Title>
                        <Card.Text>
                            <strong>Id: </strong>
                            <span className="badge bg-secondary">
                                {plaque.id}
                            </span>
                            <br />
                            <strong>Location: </strong>{" "}
                            <span className="badge bg-success">
                                {plaque.latitude}
                            </span>
                            ,{" "}
                            <span className="badge bg-success">
                                {plaque.longitude}
                            </span>{" "}
                            with bearing{" "}
                            <span className="badge bg-secondary">
                                {plaque.bearing}&deg;
                            </span>{" "}
                            <br />
                            <img
                                className="mb-3 rounder img-fluid"
                                src={plaque.image_url}
                                alt=""
                            />
                            <br />
                            <Row>
                                {plaque.text.map((text, index) => (
                                    <Col key={index}>
                                        <Plaque text={text} />
                                    </Col>
                                ))}
                            </Row>
                            <br />
                            <br />
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
        title: PropTypes.string.isRequired,
        // Add other plaque properties here
      }).isRequired,
};

export default PlaqueCard;
