import 'bootstrap-icons/font/bootstrap-icons.css';
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {

    return (
        <nav className="navbar navbar-expand-lg navbar-brand-purple mb-3">
            <div className='container-fluid'>
                <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
                    <img 
                        src="/cspa-logo-new.png" 
                        alt="Cancer Survivor Park Alliance Logo" 
                        height="40" 
                        className="me-2"
                    />
                    Cancer Survivor Park
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item">
                            <Link className="nav-link" to={`/list`}>LIST</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to={`/map`}>MAP</Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Header;