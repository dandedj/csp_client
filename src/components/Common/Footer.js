import React from 'react';
import packageJson from '../../../package.json';


const Footer = () => {
    return (
        <footer className="footer mt-auto py-3 footer-brand">
            <div className="container d-flex justify-content-between align-items-center">
                <span className="small">Version: {packageJson.version}</span>
                <span className="small">Created by: <a href="#" className="fw-medium">David Dandeneau</a></span>
            </div>
        </footer>
    );
};

export default Footer;

