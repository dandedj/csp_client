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
                        
                        <Card.Text>
                            <strong>Id: </strong>
                            <span className="badge bg-secondary">
                                {plaque.id}
                            </span>
                            <br />
                            <strong>Location: </strong>
                            <span className="badge bg-success">
                                {Math.round(plaque.latitude*100000)/100000}
                            </span>{" "}
                            ,
                            <span className="badge bg-success">
                                {Math.round(plaque.longitude*100000)/100000}
                            </span>{" "}
                            with bearing{" "}
                            <span className="badge bg-secondary">
                                {plaque.bearing}&deg;
                            </span>
                            <br />
                            <strong>Donated by: </strong>
                            <span className="">
                                { plaque.donated_by ? plaque.donated_by : "Anonymous" }
                            </span>
                            <br />
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
