import 'bootstrap-icons/font/bootstrap-icons.css';
import React, { useContext } from 'react';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { SearchContext } from '../Plaques/SearchContext';
import { LoadingContext } from './LoadingProvider';

const Header = () => {
    const { loading, setLoading } = useContext(LoadingContext);
    const navigate = useNavigate();
    const { searchQuery, setSearchQuery } = useContext(SearchContext);


    const handleSearchSubmit = (event) => {
        const query = event.target.value;
        console.log(query);
        setSearchQuery(query);
        setLoading(true);
        navigate(`/map?query=${query}`);
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    }

    return (
        <nav data-bs-theme="dark" className="navbar navbar-expand-lg bg-body-tertiary">
            <div className='container-fluid'>
                <a className="navbar-brand" href="#">
                    CSP
                </a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <a className="nav-link active" aria-current="page" href="#">Home</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/list">List</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/map">Map</a>
                        </li>
                    </ul>

                </div>
                <form className="d-flex" role="search" onSubmit={handleSearchSubmit}>
                    <input
                        className="form-control me-2"
                        type="search"
                        placeholder="Search"
                        aria-label="Search"
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                </form>
            </div>
        </nav>
    );
};

export default Header;