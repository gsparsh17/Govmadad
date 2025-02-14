import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";
import { format, isValid } from "date-fns";
import { isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Switch } from "./components/ui/switch"; // Import Switch for Dark Mode Toggle
import jsPDF from "jspdf";

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [hotspotImage, setHotspotImage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
const [sortByDate, setSortByDate] = useState("none");
const [sortByRemainingDays, setSortByRemainingDays] = useState("none");
const [reportData, setReportData] = useState(null);

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
        setNotifications(complaintsData.slice(-5));
      });

      return () => unsubscribe();
    };

    fetchComplaints();
  }, []);
  console.log(notifications)

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

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint);
    setAdminResponse(complaint.Response || "");
  };

  const handleResponseSubmit = async () => {
    if (selectedComplaint) {
      const complaintRef = doc(db, "complaints", selectedComplaint.id);
      await updateDoc(complaintRef, { Response: adminResponse });
      setSelectedComplaint(null);
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    if (selectedComplaint) {
      const complaintRef = doc(db, "complaints", complaintId);
      
      try {
        await updateDoc(complaintRef, { Status: newStatus });
        setSelectedComplaint((prev) => ({ ...prev, Status: newStatus })); // Update local state
        console.log(`Complaint ${complaintId} status updated to ${newStatus}`);
      } catch (error) {
        console.error("Error updating status:", error);
      }
    }
  };
  

  const sortedComplaints = complaints
  .filter((complaint) => 
    selectedDepartment === "All" || complaint.Department.toLowerCase().includes(selectedDepartment.toLowerCase())
  )
  .filter((complaint) => 
    selectedUrgency === "All" || complaint.Urgency.toLowerCase().includes(selectedUrgency.toLowerCase())
  )
  .sort((a, b) => {
    if (sortByDate !== "none") {
      return sortByDate === "asc"
        ? new Date(a.complaintDate) - new Date(b.complaintDate)
        : new Date(b.complaintDate) - new Date(a.complaintDate);
    }
    if (sortByRemainingDays !== "none") {
      return sortByRemainingDays === "asc"
        ? a.remainingDays - b.remainingDays
        : b.remainingDays - a.remainingDays;
    }
    return 0;
  });
  const generateReport = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });

    const weeklyComplaints = complaints.filter((c) =>
      isWithinInterval(new Date(c.complaintDate), { start, end })
    );

    const pending = complaints.filter((c) => c.Status === "Pending").length;
    const solved = complaints.filter((c) => c.Status === "Solved").length;

    setReportData({ pending, solved, total: complaints.length });
  };

  // Function to download report as PDF
  const downloadReportPDF = () => {
    if (!reportData) return;
  
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Weekly Complaints Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Complaints This Week: ${reportData.total}`, 20, 40);
    doc.text(`Pending Complaints: ${reportData.pending}`, 20, 50);
    doc.text(`Solved Complaints: ${reportData.solved}`, 20, 60);
  
    if (hotspotImage) {
      doc.addImage(hotspotImage, "PNG", 20, 80, 160, 90); // Adjust position & size
    }
  
    doc.save("Weekly_Complaints_Report.pdf");
  };
  

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen p-6`}>
      <header className="bg-blue-900 text-white p-4 shadow-lg flex justify-between items-center rounded-lg">
        <h1 className="text-xl font-bold tracking-wide">Admin Dashboard</h1>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative">
            🔔
            {notifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{notifications.length}</span>
            )}
          </button>
          <span className="text-sm">🌙 Dark Mode</span>
          <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} />
        </div>
      </header>

      {showNotifications && (
  <div className="absolute right-4 top-16 bg-white shadow-lg p-4 rounded-lg w-72 border border-gray-200">
    <div className="flex justify-between items-center border-b pb-2">
      <h2 className="font-bold text-gray-800">Latest Complaints</h2>
      <button 
        onClick={() => setShowNotifications(false)} 
        className="text-gray-500 hover:text-gray-700 transition"
      >
        ✖
      </button>
    </div>
    <div className="max-h-60 overflow-y-auto">
      {notifications.length > 0 ? (
        notifications.map((notif, index) => (
          <p key={index} className="border-b last:border-none py-2 text-sm text-gray-700">
            {notif.Complaint}
          </p>
        ))
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">No new complaints</p>
      )}
    </div>
  </div>
)}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="glass-effect p-6 rounded-lg shadow-lg md:col-span-1">
          <h2 className="text-lg font-bold text-center">📊 Complaint Hotspots</h2>

          {hotspotImage ? (
            <img src={hotspotImage} alt="Hotspot Chart" className="rounded-lg shadow-md w-full mt-4" />
          ) : (
            <p className="text-gray-500 text-center mt-4">Loading hotspot data...</p>
          )}
          <div className="mt-6 flex justify-between items-center">
        <button
          onClick={generateReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700"
        >
          📊 Show Report
        </button>

        {reportData && (
          <button
            onClick={downloadReportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-700"
          >
            📥 Download Report
          </button>
        )}
      </div>

      {reportData && (
        <div className="mt-6 p-4 bg-white shadow-md rounded-md border border-gray-200">
          <h2 className="text-lg font-semibold">Weekly Complaints Report</h2>
          <p className="mt-2">Total Complaints: {reportData.total}</p>
          <p>Pending Complaints: {reportData.pending}</p>
          <p>Solved Complaints: {reportData.solved}</p>
        </div>
      )}
        </div>
        
        <div className="md:col-span-2">
  <div className="glass-effect p-4 rounded-lg shadow-lg flex flex-wrap gap-8 mb-4">
    {/* Department Filter */}
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

    {/* Urgency Filter */}
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

    {/* Sorting by Complaint Date */}
    <div>
      <label className="block text-gray-700 dark:text-white font-semibold">📅 Sort by Date:</label>
      <select
        value={sortByDate}
        onChange={(e) => setSortByDate(e.target.value)}
        className="border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
      >
        <option value="none">None</option>
        <option value="asc">Oldest to Newest</option>
        <option value="desc">Newest to Oldest</option>
      </select>
    </div>

    {/* Sorting by Remaining Days */}
    <div>
      <label className="block text-gray-700 dark:text-white font-semibold">📆 Sort by Remaining Days:</label>
      <select
        value={sortByRemainingDays}
        onChange={(e) => setSortByRemainingDays(e.target.value)}
        className="border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
      >
        <option value="none">None</option>
        <option value="asc">Least to Most</option>
        <option value="desc">Most to Least</option>
      </select>
    </div>
  </div>

          <div className="overflow-x-auto glass-effect p-4 rounded-lg shadow-lg">
          <table className="min-w-full border border-gray-300 shadow-sm">
  <thead className="bg-blue-800 text-white">
    <tr>
      <th className="py-3 px-4 text-left">#</th>
      <th className="py-3 px-4 text-left">📜 Complaint</th>
      <th className="py-3 px-4 text-left">🏢 Department</th>
      <th className="py-3 px-4 text-left">⚠️ Urgency</th>
      <th className="py-3 px-4 text-left">📍 Pincode</th>
      <th className="py-3 px-4 text-left">🌍 Area</th>
      <th className="py-3 px-4 text-left">🗓️ Filed On</th>
      <th className="py-3 px-4 text-left">⏳ Remaining Days</th>
    </tr>
  </thead>
  <tbody>
    {sortedComplaints.map((complaint, index) => (
      <tr 
        key={complaint.id} 
        onClick={() => handleComplaintClick(complaint)} 
        className="cursor-pointer border-t hover:bg-blue-100 dark:hover:bg-gray-700"
      >
        <td className="py-3 px-4">{index + 1}</td>
        <td className="py-3 px-4">{complaint.Complaint}</td>
        <td className="py-3 px-4">{complaint.Department}</td>
        <td className="py-3 px-4">
          {complaint.Urgency === "YES" ? (
            <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm">Urgent</span>
          ) : (
            <span className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm">Normal</span>
          )}
        </td>
        <td className="py-3 px-4">{complaint.Pincode}</td>
        <td className="py-3 px-4">{complaint.Area}</td>
        <td className="py-3 px-4">
          {isValid(complaint.ComplaintDate?.toDate()) 
            ? format(complaint.ComplaintDate.toDate(), "PPP") 
            : "Invalid Date"}
        </td>
        <td className="py-3 px-4">{complaint.RemainingDays}</td>
      </tr>
    ))}
  </tbody>
</table>

          </div>
        </div>
      </div>

      {selectedComplaint && (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm p-4">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-lg transform transition-all scale-105">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Complaint Details</h2>
      <div className="space-y-2 text-gray-700 dark:text-gray-300">
        <p><strong>Complaint:</strong> {selectedComplaint.Complaint}</p>
        
        {/* Status Dropdown */}
        <div className="flex items-center space-x-2">
          <strong>Status:</strong> 
          <select 
            value={selectedComplaint.Status} 
            onChange={(e) => handleStatusChange(selectedComplaint.id, e.target.value)}
            className="border px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="Pending">Pending</option>
            <option value="Forwarded">Forwarded</option>
            <option value="Working">Working</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <p><strong>Department:</strong> {selectedComplaint.Department}</p>
        <p>
          <strong>Urgency:</strong> 
          {selectedComplaint.Urgency === "YES" ? (
            <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm">Urgent</span>
          ) : (
            <span className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm">Normal</span>
          )}
        </p>
        <p><strong>Response:</strong> {selectedComplaint.Response}</p>
        <p><strong>Filed by:</strong> {selectedComplaint.FiledBy}</p>
        <p><strong>Phone:</strong> {selectedComplaint.Phone}</p>
        <p><strong>Pincode:</strong> {selectedComplaint.Pincode}</p>
        <p><strong>Area:</strong> {selectedComplaint.Area}</p>
        <p><strong>Filed on:</strong> {isValid(selectedComplaint.ComplaintDate?.toDate()) ? format(selectedComplaint.ComplaintDate.toDate(), "PPP") : "Invalid Date"}</p>
        <p><strong>Remaining Days:</strong> {selectedComplaint.RemainingDays}</p>
      </div>

      {/* Admin Response Box */}
      <textarea 
        value={adminResponse} 
        onChange={(e) => setAdminResponse(e.target.value)} 
        className="w-full p-3 border rounded-lg mt-4 h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
        placeholder="Write your response..." 
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mt-4">
        <button onClick={() => setSelectedComplaint(null)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Close</button>
        <button onClick={handleResponseSubmit} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Send</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
