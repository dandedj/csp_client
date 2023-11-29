import React, { useEffect, useState } from 'react';
import { Card, Row, Col, CardHeader, Spinner } from 'react-bootstrap';
import { useParams } from "react-router-dom";
import { PlaquesService } from '../../services/PlaquesService';

const PlaqueDetail = () => {
    const [plaque, setPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { id } = useParams();

    useEffect(() => {
        setLoading(true);
        const plaquesService = new PlaquesService();

        plaquesService.getPlaqueById(id)
            .then((res) => {
                setPlaque(res[0]);
                console.log("Plaque: ", JSON.stringify(res));
                setLoading(false);
            })
            .catch((error) => {
                console.error('There has been a problem with your fetch operation:', error);
                setError('There has been a problem with your fetch operation');
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                <strong>Error!</strong> {error}
            </div>
        );
    }

    return (
        <div className="container">
            <h1>Plaque Detail</h1>
            {plaque && (
                <Card>
                    <Card.Body>
                        <Card.Title>Plaque Information</Card.Title>
                        <Card.Text>
                            <strong>Id: </strong><span className="badge bg-secondary">{plaque.id}</span><br />
                            <strong>Location: </strong> <span className="badge bg-success">{plaque.latitude}</span>, <span className="badge bg-success">{plaque.longitude}</span> with bearing <span className="badge bg-secondary">{plaque.bearing}&deg;</span> <br />
                            <img className="mb-3 rounder img-fluid" src={plaque.image_url} alt="" /><br />
                            <Row>
                            {plaque.text.map((text, index) => (
                                <Col key={index}>
                                    <Card>
                                        <CardHeader>Plaque</CardHeader>
                                        <Card.Body>
                                            <Card.Text>
                                                {text}
                                            </Card.Text>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                        <br /><br />
                        </Card.Text>
                    </Card.Body>
                </Card>
            )}
        </div>

    )
}

export default PlaqueDetail;
