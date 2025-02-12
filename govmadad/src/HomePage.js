import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="h-screen bg-gradient-to-r from-blue-200 to-blue-100">
      <header className="bg-blue-900 text-white p-6 shadow-lg flex justify-between">
        <h1 className="text-3xl font-bold">Government Complaint Portal</h1>
        <Link to="/profile" className="bg-white text-blue-900 px-4 py-2 rounded-md hover:bg-gray-200">
          Profile
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center mt-10">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-gray-800">Welcome to the Official Complaint Portal</h2>
          <p className="text-gray-600 mt-2">
            Submit your complaints and track their progress efficiently.
          </p>

          <div className="mt-6 flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/complaint" className="bg-blue-700 text-white px-6 py-3 rounded-md hover:bg-blue-800 transition">
              File a Complaint
            </Link>
            <Link to="/admin" className="bg-gray-700 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition">
              Admin Panel
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-blue-900 text-white text-center p-4 mt-10 absolute bottom-0 w-full">
        <p>&copy; 2025 Government Complaint Portal. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
