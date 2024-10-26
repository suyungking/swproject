import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import MainPage from './components/MainPage';
import TimeTableGenerator from './components/TimeTableGenerator';
import InfoInputPage from './components/InfoInputPage';
import InteractiveTimeTable from './components/InteractiveTimeTable';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/timetable-generator" element={<TimeTableGenerator />} />
        <Route path="/info-input" element={<InfoInputPage />} />
        <Route path="/interactive-timetable" element={<InteractiveTimeTable />} />
      </Routes>
    </Router>
  );
}

export default App;