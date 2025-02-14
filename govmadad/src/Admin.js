import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";
import { Switch } from "./components/ui/switch"; // Import Switch for Dark Mode Toggle

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [hotspotImage, setHotspotImage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const fetchComplaints = () => {
      const q = query(collection(db, "complaints"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const complaintsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setComplaints(complaintsData);
        setFilteredComplaints(complaintsData);
      });

      return () => unsubscribe();
    };

    fetchComplaints();
  }, []);

  useEffect(() => {
    let filtered = complaints;

    if (selectedDepartment !== "All") {
      filtered = filtered.filter((c) =>
        c.Department.toLowerCase().includes(selectedDepartment.toLowerCase())
      );
    }

    if (selectedUrgency !== "All") {
      filtered = filtered.filter((c) =>
        c.Urgency.toLowerCase().includes(selectedUrgency.toLowerCase())
      );
    }

    setFilteredComplaints(filtered);
  }, [selectedDepartment, selectedUrgency, complaints]);

  useEffect(() => {
    const fetchHotspotImage = async () => {
      try {
        const response = await axios.get("http://localhost:5000/hotspots/plot");
        setHotspotImage(`data:image/png;base64,${response.data.image}`);
      } catch (error) {
        console.error("Error fetching hotspot image:", error);
      }
    };

    fetchHotspotImage();
  }, []);

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen p-6`}>
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg flex justify-between items-center rounded-lg">
        <h1 className="text-xl font-bold tracking-wide">Admin Dashboard</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm">🌙 Dark Mode</span>
          <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} />
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Complaint Hotspots */}
        <div className="glass-effect p-6 rounded-lg shadow-lg md:col-span-1">
          <h2 className="text-lg font-bold text-center">📊 Complaint Hotspots</h2>
          {hotspotImage ? (
            <img src={hotspotImage} alt="Hotspot Chart" className="rounded-lg shadow-md w-full mt-4" />
          ) : (
            <p className="text-gray-500 text-center mt-4">Loading hotspot data...</p>
          )}
        </div>

        {/* Complaints Table */}
        <div className="md:col-span-2">
          {/* Filters */}
          <div className="glass-effect p-4 rounded-lg shadow-lg flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-gray-700 dark:text-white font-semibold">🏢 Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="All">All</option>
                <option value="Healthcare Ministry">Healthcare Ministry</option>
                <option value="Police">Police</option>
                <option value="Public Works Department (PWD)">PWD</option>
                <option value="Food Quality Ministry">Food Quality Ministry</option>
                <option value="Cleaning and Welfare Ministry">Cleaning and Welfare</option>
                <option value="Traffic Department">Traffic Department</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-white font-semibold">⚠️ Urgency:</label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="All">All</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="overflow-x-auto glass-effect p-4 rounded-lg shadow-lg">
            <table className="min-w-full">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">📜 Complaint</th>
                  <th className="py-3 px-4 text-left">🏢 Department</th>
                  <th className="py-3 px-4 text-left">🔎 Response</th>
                  <th className="py-3 px-4 text-left">⚠️ Urgency</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint, index) => (
                    <tr key={complaint.id} className="border-t hover:bg-blue-100 dark:hover:bg-gray-700 transition hover:text-black duration-200">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{complaint.Complaint}</td>
                      <td className="py-3 px-4">{complaint.Department}</td>
                      <td className="py-3 px-4">{complaint.Response}</td>
                      <td className="py-3 px-4">
                        {complaint.Urgency === "YES" ? (
                          <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm shadow-md">Urgent</span>
                        ) : (
                          <span className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm shadow-md">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">No complaints found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
