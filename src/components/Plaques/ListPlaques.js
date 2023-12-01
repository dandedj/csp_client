import React, { useContext, useEffect, useState } from "react";
import { ProgressBar, Toast } from "react-bootstrap";
import { Link } from "react-router-dom";
import { PlaquesService } from "../../services/PlaquesService";
import { SearchContext } from "./SearchContext";

export default function ListPlaques() {
    const [plaques, setPlaques] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { searchQuery, setSearchQuery } = useContext(SearchContext);

    useEffect(() => {
        setLoading(true);

        const query = searchQuery;

        const plaquesService = new PlaquesService();

        const plaquesPromise =
            query == null || query.trim() === ""
                ? plaquesService.getAllPlaques()
                : plaquesService.getPlaques(query);

        plaquesPromise
            .then((res) => {
                setPlaques(res);
                setLoading(false);
                console.log("Plaques: ", res.length); // Fix: Use 'res.length' instead of 'plaques.length'
            })
            .catch((error) => {
                console.error(
                    "There has been a problem with your fetch operation:",
                    error
                );
                setError("There has been a problem with your fetch operation");
                setLoading(false);
            });
    }, [searchQuery]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    return (
        <div className="container">
            {error && (
                <Toast>
                    <Toast.Header>
                        <strong className="me-auto">Error</strong>
                    </Toast.Header>
                    <Toast.Body>{error}</Toast.Body>
                </Toast>
            )}
            <div className="row align-items-center">
                <div className="col">
                    <h1 className="d-inline-block">Plaques</h1>
                </div>
                <div className="col">
                    <form className="d-flex justify-content-end">
                        <input
                            className="form-control me-2"
                            type="search"
                            placeholder="Search"
                            aria-label="Search"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            style={{ width: "200px" }}
                        />
                    </form>
                </div>
            </div>
            <table className="table span12">
                <thead className="table-dark">
                    <tr>
                        <th></th>
                        <th>Id</th>
                        <th>Donated by</th>
                        <th>Location</th>
                        <th>Photo</th>
                    </tr>
                </thead>
                <tbody className="table-light">
                    {plaques.map((plaque, index) => (
                        <tr key={index}>
                            <td>
                                <Link
                                    to={`/detail/${plaque.id}`}
                                    className="btn btn-dark"
                                >
                                    View
                                </Link>
                            </td>
                            <td className="Plaque-Id">{plaque.id}</td>
                            <td className="Plaque-Id">
                                {plaque.donated_by
                                    ? plaque.donated_by
                                    : "Anonymous"}
                            </td>
                            <td className="Plaque-Location">
                                <span className="badge bg-success">
                                    {Math.round(plaque.latitude * 100000) /
                                        100000}
                                </span>{" , "}
                                <span className="badge bg-success">
                                    {Math.round(plaque.longitude * 100000) /
                                        100000}
                                </span>
                            </td>
                            <td>
                                <div className="img-thumbnail">
                                    <img
                                        width="80"
                                        src={plaque.image_url}
                                        alt=""
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {loading && <ProgressBar animated now={100} />}
        </div>
    );
}
