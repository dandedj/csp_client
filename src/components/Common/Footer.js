import React from 'react';
import packageJson from '../../../package.json';


const Footer = () => {
    return (
        <footer className="footer mt-auto py-3 bg-light fixed-bottom">
            <div className="container d-flex justify-content-between">
                <span className="text-muted small">Version: {packageJson.version}</span>
                <span className="text-muted small">Created by: David Dandeneau</span>
            </div>
        </footer>
    );
};

export default Footer;

