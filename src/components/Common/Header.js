import 'bootstrap-icons/font/bootstrap-icons.css';
import React, { useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SearchContext } from '../Plaques/SearchContext';
import { LoadingContext } from './LoadingProvider';

const Header = () => {
    const { setLoading } = useContext(LoadingContext);
    const navigate = useNavigate();
    const { searchQuery, setSearchQuery } = useContext(SearchContext);
    const { rawSlug } = useParams();
    const slug = rawSlug || '';

    const handleSearchSubmit = (event) => {
        const query = event.target.value;
        console.log(query);
        setSearchQuery(query);
        setLoading(true);
        navigate(`${slug}/map?query=${query}`);
    };

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    }

    return (
        <nav data-bs-theme="dark" className="navbar navbar-expand-lg bg-body-tertiary">
            <div className='container-fluid'>
                <a className="navbar-brand" href="/">
                    CSP
                </a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <Link className="nav-link active" to={`${slug}/list`}>List</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" to={`${slug}/map`}>Map</Link>
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