import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import AdminPage from "./AdminPage";
import ComplaintPage from "./ComplaintPage";
import ProfilePage from "./ProfilePage";
import ResponsePage from "./ResponsePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/complaint" element={<ComplaintPage />} />
        <Route path="/response" element={<ResponsePage />} />
      </Routes>
    </Router>
  );
}

export default App;
