import 'bootstrap-icons/font/bootstrap-icons.css';
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {

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
                            <Link className="nav-link active" to={`/list`}>List</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link active" to={`/map`}>Map</Link>
                        </li>
                    </ul>

                </div>
                
            </div>
        </nav>
    );
};

export default Header;