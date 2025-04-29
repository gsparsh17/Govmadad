import { Link } from "react-router-dom";
import { useState } from "react";
import { Switch } from "./components/ui/switch"; // Dark mode toggle

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-blue-50 text-gray-900"} min-h-screen flex flex-col`}>
      {/* Header */}
      <header className="bg-blue-500 text-white p-6 shadow-lg flex justify-between items-center rounded-b-xl">
        <h1 className="text-3xl font-bold tracking-wide">Jansunwai Samadhan</h1>
        <div className="flex items-center space-x-4">
          <Link to="/profile" className="bg-white text-blue-500 px-4 py-2 rounded-md hover:bg-gray-200 transition">
            Profile
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-sm">🌙 Dark Mode</span>
            <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-grow px-4">
        <div className="glass-effect p-10 rounded-lg shadow-xl max-w-2x text-center bg-white backdrop-blur-lg">
          <h2 className="text-3xl font-semibold">📢 Welcome to the Official Complaint Portal</h2>
          <p className="text-lg mt-2">Submit and track complaints with ease.</p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/complaint" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition duration-200 shadow-md">
              File a Complaint
            </Link>
            <Link to="/admin" className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition duration-200 shadow-md">
              Admin Panel
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-blue-500 text-white text-center p-4 rounded-t-xl">
        <p>&copy; 2025 Government Complaint Portal. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
