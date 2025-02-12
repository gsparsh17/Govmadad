import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [hotspotImage, setHotspotImage] = useState(null);

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
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Hotspot Chart */}
        <div className="bg-white p-4 rounded-md shadow-md md:col-span-1">
          <h2 className="text-lg font-bold text-gray-700 mb-3 text-center">Complaint Hotspots</h2>
          {hotspotImage ? (
            <img src={hotspotImage} alt="Hotspot Chart" className="rounded-md shadow-lg w-full" />
          ) : (
            <p className="text-gray-500 text-center">Loading hotspot data...</p>
          )}
        </div>

        {/* Complaints Table */}
        <div className="md:col-span-2">
          {/* Filters */}
          <div className="bg-white p-4 rounded-md shadow-md flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-gray-700 font-semibold">Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border p-2 rounded-md"
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
              <label className="block text-gray-700 font-semibold">Urgency:</label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="border p-2 rounded-md"
              >
                <option value="All">All</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white p-4 rounded-md shadow-md">
            <table className="min-w-full">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">#</th>
                  <th className="py-3 px-4 text-left">Complaint</th>
                  <th className="py-3 px-4 text-left">Department</th>
                  <th className="py-3 px-4 text-left">Response</th>
                  <th className="py-3 px-4 text-left">Urgent</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint, index) => (
                    <tr key={complaint.id} className="border-t">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{complaint.Complaint}</td>
                      <td className="py-3 px-4">{complaint.Department}</td>
                      <td className="py-3 px-4">{complaint.Response}</td>
                      <td className="py-3 px-4">
                        {complaint.Urgency === "YES" ? (
                          <span className="bg-red-500 text-white px-2 py-1 rounded-md text-sm">Urgent</span>
                        ) : (
                          <span className="bg-green-500 text-white px-2 py-1 rounded-md text-sm">Normal</span>
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