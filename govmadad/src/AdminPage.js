import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { format, isValid, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Switch } from "./components/ui/switch";
import jsPDF from "jspdf";
import { Bar, Pie, Line } from "react-chartjs-2";
import { Chart, registerables } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faDownload, faChartBar, faTimes, faFilePdf } from '@fortawesome/free-solid-svg-icons';

// Register Chart.js components
Chart.register(...registerables);

export default function AdminPage() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUrgency, setSelectedUrgency] = useState("All");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [sortByDate, setSortByDate] = useState("none");
  const [sortByRemainingDays, setSortByRemainingDays] = useState("none");
  const [reportData, setReportData] = useState(null);
  const [activeChart, setActiveChart] = useState("department");

  useEffect(() => {
    const fetchComplaints = () => {
      const q = query(collection(db, "complaints"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const complaintsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          remainingDays: calculateRemainingDays(doc.data().ComplaintDate?.toDate())
        }));
        setComplaints(complaintsData);
        setFilteredComplaints(complaintsData);
        setNotifications(complaintsData.slice(-5));
      });

      return () => unsubscribe();
    };

    fetchComplaints();
  }, []);

  const calculateRemainingDays = (date) => {
    if (!date || !isValid(date)) return 0;
    const today = new Date();
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 7); // Assuming 7 days SLA
    return Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));
  };

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
        setSelectedComplaint((prev) => ({ ...prev, Status: newStatus }));
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

    setReportData({ 
      pending, 
      solved, 
      total: complaints.length,
      weeklyTotal: weeklyComplaints.length,
      departmentDistribution: getDepartmentDistribution(),
      statusDistribution: getStatusDistribution(),
      urgencyCount: complaints.filter(c => c.Urgency === "YES").length
    });
  };

  const getDepartmentDistribution = () => {
    const departments = [...new Set(complaints.map(c => c.Department))];
    return departments.map(dept => ({
      name: dept,
      count: complaints.filter(c => c.Department === dept).length
    }));
  };

  const getStatusDistribution = () => {
    const statuses = [...new Set(complaints.map(c => c.Status))];
    return statuses.map(status => ({
      name: status,
      count: complaints.filter(c => c.Status === status).length
    }));
  };

  const getHotspotData = () => {
    const areas = [...new Set(complaints.map(c => c.Area))];
    return {
      labels: areas,
      datasets: [{
        label: 'Complaints by Area',
        data: areas.map(area => complaints.filter(c => c.Area === area).length),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    };
  };

  const getDepartmentChartData = () => {
    const distribution = getDepartmentDistribution();
    return {
      labels: distribution.map(item => item.name),
      datasets: [{
        label: 'Complaints by Department',
        data: distribution.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getStatusChartData = () => {
    const distribution = getStatusDistribution();
    return {
      labels: distribution.map(item => item.name),
      datasets: [{
        label: 'Complaints by Status',
        data: distribution.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getTrendData = () => {
    // Group complaints by week with proper date validation
    const weeklyData = {};
    
    complaints.forEach(c => {
      // Safely get the date (handle both Firestore Timestamp and JS Date)
      const complaintDate = c.ComplaintDate?.toDate 
        ? c.ComplaintDate.toDate() 
        : new Date(c.ComplaintDate);
      
      // Only proceed if we have a valid date
      if (isValid(complaintDate)) {
        const week = format(complaintDate, 'yyyy-ww');
        weeklyData[week] = (weeklyData[week] || 0) + 1;
      }
    });
    
    return {
      labels: Object.keys(weeklyData),
      datasets: [{
        label: 'Weekly Complaints Trend',
        data: Object.values(weeklyData),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1
      }]
    };
  };

  const downloadReportPDF = () => {
    if (!reportData) return;
  
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Weekly Complaints Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Total Complaints: ${reportData.total}`, 20, 40);
    doc.text(`Weekly Complaints: ${reportData.weeklyTotal}`, 20, 50);
    doc.text(`Pending Complaints: ${reportData.pending}`, 20, 60);
    doc.text(`Solved Complaints: ${reportData.solved}`, 20, 70);
    doc.text(`Urgent Complaints: ${reportData.urgencyCount}`, 20, 80);
  
    // Add department distribution
    doc.setFontSize(14);
    doc.text("Department Distribution:", 20, 100);
    reportData.departmentDistribution.forEach((dept, index) => {
      doc.text(`${dept.name}: ${dept.count}`, 30, 110 + (index * 10));
    });
  
    doc.save("Weekly_Complaints_Report.pdf");
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen p-6`}>
      <header className="bg-blue-900 text-white p-4 shadow-lg flex justify-between items-center rounded-lg">
        <h1 className="text-xl font-bold tracking-wide">Complaint Management Dashboard</h1>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className="relative p-2 rounded-full hover:bg-blue-800 transition"
          >
            <FontAwesomeIcon icon={faBell} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
          <span className="text-sm">Dark Mode</span>
          <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} />
        </div>
      </header>

      {showNotifications && (
        <div className="absolute right-4 top-16 bg-white shadow-lg p-4 rounded-lg w-72 border border-gray-200 z-50">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-bold text-gray-800">Latest Complaints</h2>
            <button 
              onClick={() => setShowNotifications(false)} 
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif, index) => (
                <div 
                  key={index} 
                  className="border-b last:border-none py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleComplaintClick(notif)}
                >
                  <p className="font-medium">{notif.Department}</p>
                  <p className="truncate">{notif.Complaint}</p>
                  <p className="text-xs text-gray-500">
                    {isValid(notif.ComplaintDate?.toDate()) 
                      ? format(notif.ComplaintDate.toDate(), "PP") 
                      : "Invalid Date"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No new complaints</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Summary Cards */}
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg">
          <h3 className="font-medium">Total Complaints</h3>
          <p className="text-3xl font-bold">{complaints.length}</p>
        </div>
        <div className="bg-yellow-600 text-white p-4 rounded-lg shadow-lg">
          <h3 className="font-medium">Pending</h3>
          <p className="text-3xl font-bold">{complaints.filter(c => c.Status === "Pending").length}</p>
        </div>
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg">
          <h3 className="font-medium">Resolved</h3>
          <p className="text-3xl font-bold">{complaints.filter(c => c.Status === "Resolved").length}</p>
        </div>
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <h3 className="font-medium">Urgent</h3>
          <p className="text-3xl font-bold">{complaints.filter(c => c.Urgency === "YES").length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Data Visualization</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setActiveChart("department")} 
                className={`px-3 py-1 rounded-md ${activeChart === "department" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                Departments
              </button>
              <button 
                onClick={() => setActiveChart("status")} 
                className={`px-3 py-1 rounded-md ${activeChart === "status" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                Status
              </button>
              <button 
                onClick={() => setActiveChart("trend")} 
                className={`px-3 py-1 rounded-md ${activeChart === "trend" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                Trends
              </button>
              <button 
                onClick={() => setActiveChart("hotspot")} 
                className={`px-3 py-1 rounded-md ${activeChart === "hotspot" ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              >
                Hotspots
              </button>
            </div>
          </div>

          <div className="h-80">
            {activeChart === "department" && (
              <Bar 
                data={getDepartmentChartData()} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Complaints by Department'
                    }
                  }
                }} 
              />
            )}
            {activeChart === "status" && (
              <Pie 
                data={getStatusChartData()} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                    title: {
                      display: true,
                      text: 'Complaints by Status'
                    }
                  }
                }} 
              />
            )}
            {activeChart === "trend" && (
              <Line 
                data={getTrendData()} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Weekly Complaints Trend'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            )}
            {activeChart === "hotspot" && (
              <Bar 
                data={getHotspotData()} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: true,
                      text: 'Complaints Hotspots by Area'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} 
              />
            )}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={generateReport}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-2" />
              Generate Report
            </button>

            {reportData && (
              <button
                onClick={downloadReportPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-700 flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-bold mb-4">Filters & Actions</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-white font-semibold mb-1">Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="All">All Departments</option>
                <option value="Healthcare Ministry">Healthcare Ministry</option>
                <option value="Police">Police</option>
                <option value="Public Works Department (PWD)">PWD</option>
                <option value="Food Quality Ministry">Food Quality Ministry</option>
                <option value="Cleaning and Welfare Ministry">Cleaning and Welfare</option>
                <option value="Traffic Department">Traffic Department</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-white font-semibold mb-1">Urgency:</label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="All">All</option>
                <option value="YES">Urgent</option>
                <option value="NO">Normal</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-white font-semibold mb-1">Sort by Date:</label>
              <select
                value={sortByDate}
                onChange={(e) => setSortByDate(e.target.value)}
                className="w-full border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="none">None</option>
                <option value="asc">Oldest to Newest</option>
                <option value="desc">Newest to Oldest</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-white font-semibold mb-1">Sort by Remaining Days:</label>
              <select
                value={sortByRemainingDays}
                onChange={(e) => setSortByRemainingDays(e.target.value)}
                className="w-full border p-2 rounded-md bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="none">None</option>
                <option value="asc">Least to Most</option>
                <option value="desc">Most to Least</option>
              </select>
            </div>

            {reportData && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <h3 className="font-semibold mb-2">Quick Stats</h3>
                <p>Total: {reportData.total}</p>
                <p>Pending: {reportData.pending}</p>
                <p>Resolved: {reportData.solved}</p>
                <p>Urgent: {reportData.urgencyCount}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg overflow-x-auto">
        <h2 className="text-lg font-bold mb-4">Complaints List</h2>
        <table className="min-w-full border border-gray-300 shadow-sm">
          <thead className="bg-blue-800 text-white">
            <tr>
              <th className="py-3 px-4 text-left">#</th>
              <th className="py-3 px-4 text-left">Complaint</th>
              <th className="py-3 px-4 text-left">Department</th>
              <th className="py-3 px-4 text-left">Urgency</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Area</th>
              <th className="py-3 px-4 text-left">Filed On</th>
              <th className="py-3 px-4 text-left">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {sortedComplaints.map((complaint, index) => (
              <tr 
                key={complaint.id} 
                onClick={() => handleComplaintClick(complaint)} 
                className={`border-t ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-blue-100 dark:hover:bg-gray-600 cursor-pointer`}
              >
                <td className="py-3 px-4">{index + 1}</td>
                <td className="py-3 px-4 max-w-xs truncate">{complaint.Complaint}</td>
                <td className="py-3 px-4">{complaint.Department}</td>
                <td className="py-3 px-4">
                  {complaint.Urgency === "YES" ? (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs">Urgent</span>
                  ) : (
                    <span className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs">Normal</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-lg text-xs ${
                    complaint.Status === "Pending" ? "bg-yellow-500" :
                    complaint.Status === "Resolved" ? "bg-green-500" :
                    complaint.Status === "Forwarded" ? "bg-blue-500" :
                    "bg-purple-500"
                  } text-white`}>
                    {complaint.Status}
                  </span>
                </td>
                <td className="py-3 px-4">{complaint.Area}</td>
                <td className="py-3 px-4">
                  {isValid(complaint.ComplaintDate?.toDate()) 
                    ? format(complaint.ComplaintDate.toDate(), "PP") 
                    : "Invalid Date"}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-lg text-xs ${
                    complaint.remainingDays <= 2 ? "bg-red-500" :
                    complaint.remainingDays <= 4 ? "bg-yellow-500" :
                    "bg-green-500"
                  } text-white`}>
                    {complaint.remainingDays}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold">Complaint Details</h2>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <FontAwesomeIcon icon={faTimes} size="lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Complaint</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">{selectedComplaint.Complaint}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Department</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">{selectedComplaint.Department}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Status</h3>
                <select 
                  value={selectedComplaint.Status} 
                  onChange={(e) => handleStatusChange(selectedComplaint.id, e.target.value)}
                  className="mt-1 w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="Pending">Pending</option>
                  <option value="Forwarded">Forwarded</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Urgency</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {selectedComplaint.Urgency === "YES" ? (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-lg">Urgent</span>
                  ) : (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-lg">Normal</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Filed By</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">{selectedComplaint.FiledBy}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Contact</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">{selectedComplaint.Phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Location</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {selectedComplaint.Area}, {selectedComplaint.Pincode}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Date Filed</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  {isValid(selectedComplaint.ComplaintDate?.toDate()) 
                    ? format(selectedComplaint.ComplaintDate.toDate(), "PPPp") 
                    : "Invalid Date"}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Days Remaining</h3>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <span className={`px-3 py-1 rounded-lg ${
                    selectedComplaint.remainingDays <= 2 ? "bg-red-500" :
                    selectedComplaint.remainingDays <= 4 ? "bg-yellow-500" :
                    "bg-green-500"
                  } text-white`}>
                    {selectedComplaint.remainingDays} days
                  </span>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Response</h3>
              <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded min-h-20">
                {selectedComplaint.Response || "No response yet"}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Response</h3>
              <textarea 
                value={adminResponse} 
                onChange={(e) => setAdminResponse(e.target.value)} 
                className="w-full p-3 border rounded-lg h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
                placeholder="Write your response..." 
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
              <button 
                onClick={handleResponseSubmit} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}