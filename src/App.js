import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import AdminPage from "./AdminPage";
import ComplaintPage from "./ComplaintPage";
import ProfilePage from "./ProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/complaint" element={<ComplaintPage />} />
      </Routes>
    </Router>
  );
}

export default App;
