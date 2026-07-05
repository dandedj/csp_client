import React from 'react';
import ReactDOM from 'react-dom/client';

// Bootstrap first, then fonts, then brand overrides layered on top.
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource/josefin-sans/600.css';
import '@fontsource/josefin-sans/700.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './brand.css';

import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// No-op in development; log to the debug channel in production until real
// analytics wiring lands.
reportWebVitals(
  import.meta.env.PROD ? (metric) => console.debug('[web-vital]', metric) : undefined
);
