import React, { useEffect, useState } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useParams } from "react-router-dom";
import { PlaquesService } from '../../services/PlaquesService';

const PlaqueDetail = () => {
    const [plaque, setPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { id } = useParams();
    const plaquesService = new PlaquesService();

    useEffect(() => {
        setLoading(true);

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
    if (plaque != null) {
        var keys = Object.getOwnPropertyDescriptors(plaque);
        console.log(keys);

    }

    return (
        <div className="container">
            <h1>Plaque Detail</h1>
            {plaque && (
                <Card>
                    <Card.Body>
                        <Card.Title>Plaque Information</Card.Title>
                        <Card.Text>
                            <strong>Id:</strong> {plaque.id}<br />
                            <strong>Location:</strong> {plaque.latitude}, {plaque.longitude} with bearing {plaque.bearing} &deg;<br />
                            <strong>Photo:</strong> <img width="100%" src={plaque.image_path} alt="" /><br />
                            <strong>Text:</strong> <div className='Plaque-Text' style={{ maxWidth: "100%" }}>{plaque.text}</div>
                        </Card.Text>
                    </Card.Body>
                </Card>
            )}
        </div>

    )
}

export default PlaqueDetail;
