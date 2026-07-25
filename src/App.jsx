import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FormKuesioner from './pages/FormKuesioner';
import AdminDashboard from './pages/AdminDashboard';
import PublicDashboard from './pages/PublicDashboard'; // Import Dashboard Admin

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FormKuesioner />} />
        {/* Rute ke halaman admin */}
        <Route path="/admin" element={<AdminDashboard />} /> 
        {/* Rute ke halaman publik */}
        <Route path="/dashboard" element={<PublicDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;