import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TestPage from './TestPage';
import PipelinePage from './pages/PipelinePage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
      </Routes>
    </BrowserRouter>
  );
}
