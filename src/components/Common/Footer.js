import React from 'react';
import packageJson from '../../../package.json';


const Footer = () => {
    return (
        <footer className="footer mt-auto py-1 footer-brand fixed-bottom">
            <div className="container d-flex justify-content-between align-items-center">
                <span className="small">Version: {packageJson.version}</span>
                <span className="small">Created by: <a href="#" className="fw-medium">David Dandeneau</a></span>
            </div>
        </footer>
    );
};

export default Footer;

