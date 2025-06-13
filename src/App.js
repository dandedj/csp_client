
import React, { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Common/Header';
import Footer from './components/Common/Footer';
import { LoadingProvider } from './components/Common/LoadingProvider';
import ListPlaques from './components/Plaques/ListPlaques';
import LeafletMapPlaques from './components/Plaques/LeafletMapPlaques';
import PlaqueDetail from './components/Plaques/PlaqueDetail';
import { SearchProvider } from './components/Plaques/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "csp-plaques.firebaseapp.com",
  projectId: "csp-plaques",
  storageBucket: "csp-plaques.appspot.com",
  messagingSenderId: "316954750234",
  appId: "1:316954750234:web:a0bfb2e600f597a6bc90a3",
  measurementId: "G-NZY0R89RSS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function PageViewLogger() {
  initializeApp(firebaseConfig);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    logEvent(analytics, 'page_view', {
      page_path: location.pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [navigate, location]);

  return null;
}

function App() {

  return (
    <Router>
      <PageViewLogger />
      <LoadingProvider>
        <SearchProvider>
          <div>
            <Header />
            <Routes>
              <Route path="/" element={<LeafletMapPlaques />} />
              <Route path="/list" element={<ListPlaques />} />
              <Route path="/map" element={<LeafletMapPlaques />} />
              <Route path="/detail/:id" element={<PlaqueDetail />} />
            </Routes>
            <Footer />
          </div>
        </SearchProvider>
      </LoadingProvider>
    </Router>
  );
}

export default App;
