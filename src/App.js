
import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Header from './components/Common/Header';
import Footer from './components/Common/Footer'; 
import { LoadingProvider } from './components/Common/LoadingProvider';
import ListPlaques from './components/Plaques/ListPlaques';
import MapPlaques from './components/Plaques/MapPlaques';
import PlaqueDetail from './components/Plaques/PlaqueDetail';
import { SearchProvider } from './components/Plaques/SearchContext';

function App() {

  return (
    <Router>
      <LoadingProvider>
        <SearchProvider>
          <div>
            <Header />
            <Routes>
              <Route path="/" element={<MapPlaques />} />
              <Route path="/list" element={<ListPlaques />} />
              <Route path="/map" element={<MapPlaques />} />
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
