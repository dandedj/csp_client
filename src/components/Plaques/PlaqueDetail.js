import React, { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { PlaquesService } from "../../services/PlaquesService";
import PlaqueCard from "./PlaqueCard";

const PlaqueDetail = () => {
    const [plaque, setPlaque] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { id } = useParams();

    useEffect(() => {
        setLoading(true);
        const plaquesService = new PlaquesService();

        plaquesService
            .getPlaqueById(id)
            .then((res) => {
                setPlaque(res[0]);
                console.log("Plaque: ", JSON.stringify(res));
                setLoading(false);
            })
            .catch((error) => {
                console.error(
                    "There has been a problem with your fetch operation:",
                    error
                );
                setError("There has been a problem with your fetch operation");
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
            <PlaqueCard plaque={plaque} />
        </div>
    );
};

export default PlaqueDetail;
