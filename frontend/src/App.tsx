
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NodalDashboard from './pages/NodalDashboard';
import DistrictDashboard from './pages/DistrictDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/volunteer" element={<VolunteerDashboard />} />
        <Route path="/nodal" element={<NodalDashboard />} />
        <Route path="/district" element={<DistrictDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
