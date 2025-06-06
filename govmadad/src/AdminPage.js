import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { format, isValid, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Switch } from "./components/ui/switch";
import jsPDF from "jspdf";
import { Bar, Pie, Line } from "react-chartjs-2";
import { Chart, registerables } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faChartBar, faTimes, faFilePdf, faComment, faRobot } from '@fortawesome/free-solid-svg-icons';

// Register Chart.js components
Chart.register(...registerables);

const DEPARTMENT_KEYWORDS = ['Healthcare', 'Police', 'PublicWorks', 'FoodQuality', 'Cleaning', 'Traffic'];

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
  // Add these to your existing state declarations
const [showChatAssistant, setShowChatAssistant] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [currentMessage, setCurrentMessage] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [selectedChatDepartment, setSelectedChatDepartment] = useState("Healthcare");

const matchDepartment = (text) => {
  if (!text) return "Unknown Department";
  
  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Find the first keyword that appears in the text
  const matchedKeyword = DEPARTMENT_KEYWORDS.find(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  return matchedKeyword || "Unknown Department";
};

const calculateRemainingDays = (complaintDate, predictedTime) => {
  if (!complaintDate || !isValid(complaintDate)) return "N/A";
  
  // Parse predicted time (handles both "33 days" and raw numbers)
  const parseDays = (timeString) => {
    if (!timeString) return null;
    if (typeof timeString === 'number') return timeString;
    const daysMatch = String(timeString).match(/\d+/);
    return daysMatch ? parseInt(daysMatch[0], 10) : null;
  };

  const predictedDays = parseDays(predictedTime);
  if (!predictedDays) return "N/A";

  const today = new Date();
  const daysPassed = Math.floor((today - complaintDate) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(predictedDays - daysPassed, 0);

  return remainingDays;
};

// Update the useEffect where you fetch complaints
useEffect(() => {
  const fetchComplaints = () => {
    const q = query(collection(db, "complaints"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const complaintsData = await Promise.all(snapshot.docs.map(async (doc) => {
        const comp = doc.data();
        const complaintDate = comp.ComplaintDate?.toDate();
        
        // Calculate remaining days with both date and predicted time
        const remainingDays = calculateRemainingDays(complaintDate, comp.PredictedTime);
        
        // Update Firestore if the value has changed
        if (comp.RemainingDays !== remainingDays) {
          try {
            await updateDoc(doc.ref, { RemainingDays: remainingDays });
          } catch (error) {
            console.error("Error updating remaining days:", error);
          }
        }

        return {
          id: doc.id,
          ...comp,
          remainingDays,
          complaintDate // Store the date object for sorting
        };
      }));

      setComplaints(complaintsData);
      setFilteredComplaints(complaintsData);
      setNotifications(complaintsData.slice(-5));
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

    const generateDepartmentReportPDF = async () => {
      // First, prompt the admin to select a department
      const selectedDept = prompt("Please select a department for the report:\n\n" +
        "1. Healthcare Ministry\n" +
        "2. Police Department\n" +
        "3. Public Works Department (PWD)\n" +
        "4. Food Quality Ministry\n" +
        "5. Cleaning and Welfare Ministry\n" +
        "6. Traffic Department");
    
      if (!selectedDept) return; // User cancelled
    
      // Map the input to department keywords
      let department;
      switch (selectedDept.trim()) {
        case "1": department = "Healthcare"; break;
        case "2": department = "Police"; break;
        case "3": department = "PublicWorks"; break;
        case "4": department = "FoodQuality"; break;
        case "5": department = "Cleaning"; break;
        case "6": department = "Traffic"; break;
        default:
          alert("Invalid selection. Please enter a number between 1-6.");
          return;
      }
    
      // Filter complaints for the selected department
      const deptComplaints = complaints.filter(c => 
        c.Department.toLowerCase().includes(department.toLowerCase())
      );
    
      if (deptComplaints.length === 0) {
        alert(`No complaints found for ${getFullDepartmentName(department)}`);
        return;
      }
    
      // Create PDF
      const doc = new jsPDF();
      
      // Add logo and header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${getFullDepartmentName(department)} Complaints Report`, 105, 15, null, null, 'center');
      
      // Report metadata - more compact layout
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${format(new Date(), "PPp")}`, 14, 25);
      doc.text(`Total: ${deptComplaints.length} complaints`, 105, 25, null, null, 'center');
      doc.text(`Page 1 of ${Math.ceil(deptComplaints.length / 2) + 1}`, 190, 25, null, null, 'right');
      
      // Summary statistics - more compact layout
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, 40);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Pending: ${deptComplaints.filter(c => c.Status === "Pending").length}`, 14, 47);
      doc.text(`Resolved: ${deptComplaints.filter(c => c.Status === "Resolved").length}`, 14, 54);
      doc.text(`Urgent: ${deptComplaints.filter(c => c.Urgency === "YES").length}`, 14, 61);
      
      // Status distribution chart placeholder - smaller
      doc.addPage();
      doc.setFontSize(8);
      doc.text("[Status Distribution Chart]", 100, 45, { maxWidth: 80 });
      
      // Complaints details section - 2 per page
      let currentPage = 1;
      let complaintsOnPage = 0;
      
      for (let i = 0; i < deptComplaints.length; i++) {
        const complaint = deptComplaints[i];
        
        // Add new page if needed (start new page after every 2 complaints)
        if (complaintsOnPage >= 2) {
          doc.addPage();
          currentPage++;
          complaintsOnPage = 0;
          doc.setFontSize(10);
          doc.text(`Page ${currentPage} of ${Math.ceil(deptComplaints.length / 2) + 1}`, 190, 15, null, null, 'right');
        }
        
        // Position calculation (start at 30 for first complaint, 120 for second)
        const yStart = 30 + (complaintsOnPage * 90);
        
        // Complaint header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Complaint #${i + 1}`, 14, yStart);
        
        // Complaint details - more compact layout
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Description (smaller font, tighter spacing)
        const descLines = doc.splitTextToSize(`Description: ${complaint.Complaint}`, 180);
        doc.text(descLines, 20, yStart + 7);
        
        // Metadata in two columns
        doc.text(`Status: ${complaint.Status}`, 20, yStart + 7 + (descLines.length * 4));
        doc.text(`Urgent: ${complaint.Urgency}`, 100, yStart + 7 + (descLines.length * 4));
        
        doc.text(`Filed by: ${complaint.FiledBy}`, 20, yStart + 14 + (descLines.length * 4));
        doc.text(`Contact: ${complaint.Phone}`, 100, yStart + 14 + (descLines.length * 4));
        
        doc.text(`Location: ${complaint.Area}, ${complaint.Pincode}`, 20, yStart + 21 + (descLines.length * 4));
        
        const complaintDate = isValid(complaint.ComplaintDate?.toDate()) 
          ? format(complaint.ComplaintDate.toDate(), "PP") 
          : "Invalid Date";
        doc.text(`Filed: ${complaintDate}`, 20, yStart + 28 + (descLines.length * 4));
        doc.text(`Days left: ${complaint.remainingDays}`, 100, yStart + 28 + (descLines.length * 4));
        
        // Response section - tighter layout
        doc.setFont("helvetica", "bold");
        doc.text("Response:", 20, yStart + 35 + (descLines.length * 4));
        
        doc.setFont("helvetica", "normal");
        const responseText = complaint.Response || "No response yet";
        const responseLines = doc.splitTextToSize(responseText, 180);
        doc.text(responseLines, 20, yStart + 42 + (descLines.length * 4));
        
        // Add separator line only between complaints (not after last one)
        if (complaintsOnPage < 1 && i < deptComplaints.length - 1) {
          doc.line(14, yStart + 52 + (descLines.length * 4) + (responseLines.length * 4), 200, yStart + 52 + (descLines.length * 4) + (responseLines.length * 4));
        }
        
        complaintsOnPage++;
      }
      
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text("Confidential - For official use only", 14, 285);
      }
      
      // Save the PDF
      doc.save(`${department}_Complaints_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };
    
    // Helper function to get full department name
    const getFullDepartmentName = (keyword) => {
      switch (keyword) {
        case 'Healthcare': return 'Healthcare Ministry';
        case 'Police': return 'Police Department';
        case 'PublicWorks': return 'Public Works Department (PWD)';
        case 'FoodQuality': return 'Food Quality Ministry';
        case 'Cleaning': return 'Cleaning and Welfare Ministry';
        case 'Traffic': return 'Traffic Department';
        default: return keyword;
      }
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

  function generateFollowUpQuestions(lastMessage) {
    const lowerMessage = lastMessage.toLowerCase();
    const questions = [];
    
    if (lowerMessage.includes("complaint") || lowerMessage.includes("issue")) {
      questions.push(
        "Where is this located?",
        "What actions should I take?",
        "Who is handling this?",
        "Show me similar complaints"
      );
    }
    
    if (lowerMessage.includes("task") || lowerMessage.includes("work")) {
      questions.push(
        "What's the deadline?",
        "Who else is working on this?",
        "Show me related documents",
        "What's the next step?"
      );
    }
    
    // Default suggestions
    if (questions.length === 0) {
      questions.push(
        "Tell me more",
        "Give me details",
        "What are the options?",
        "Show me another one"
      );
    }
    
    return questions.slice(0, 3); // Return max 3 follow-ups
  }

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

  // const downloadReportPDF = () => {
  //   if (!reportData) return;
  
  //   const doc = new jsPDF();
  //   doc.setFont("helvetica", "bold");
  //   doc.setFontSize(18);
  //   doc.text("Weekly Complaints Report", 20, 20);
    
  //   doc.setFontSize(12);
  //   doc.text(`Total Complaints: ${reportData.total}`, 20, 40);
  //   doc.text(`Weekly Complaints: ${reportData.weeklyTotal}`, 20, 50);
  //   doc.text(`Pending Complaints: ${reportData.pending}`, 20, 60);
  //   doc.text(`Solved Complaints: ${reportData.solved}`, 20, 70);
  //   doc.text(`Urgent Complaints: ${reportData.urgencyCount}`, 20, 80);
  
  //   // Add department distribution
  //   doc.setFontSize(14);
  //   doc.text("Department Distribution:", 20, 100);
  //   reportData.departmentDistribution.forEach((dept, index) => {
  //     doc.text(`${dept.name}: ${dept.count}`, 30, 110 + (index * 10));
  //   });
  
  //   doc.save("Weekly_Complaints_Report.pdf");
  // };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen p-6`}>
<header className="bg-blue-500 text-white p-4 shadow-lg flex justify-between items-center rounded-lg">
  <h1 className="text-xl font-bold tracking-wide">Complaint Management Dashboard</h1>
  <div className="flex items-center space-x-3">
    <button 
      onClick={() => setShowChatAssistant(!showChatAssistant)} 
      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md flex items-center"
    >
      <span className="mr-2">Ask Assistant</span>
      <FontAwesomeIcon icon={faComment} />
    </button>
    
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
    {/* <span className="text-sm">Dark Mode</span>
    <Switch checked={darkMode} onCheckedChange={() => setDarkMode(!darkMode)} /> */}
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
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg">
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
              onClick={generateDepartmentReportPDF}
              className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-2" />
              Generate Report
            </button>

            {/* {reportData && (
              <button
                onClick={downloadReportPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-700 flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                Download PDF
              </button>
            )} */}
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
  {DEPARTMENT_KEYWORDS.map(dept => (
    <option key={dept} value={dept}>
      {
  dept === 'Healthcare' ? 'Healthcare Ministry' :
  dept === 'Police' ? 'Police Department' :
  dept === 'PublicWorks' ? 'Public Works Department (PWD)' :
  dept === 'FoodQuality' ? 'Food Quality Ministry' :
  dept === 'Cleaning' ? 'Cleaning and Welfare Ministry' :
  dept === 'Traffic' ? 'Traffic Department' :
  dept
}
    </option>
  ))}
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

      {showChatAssistant && (
  <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 z-50 flex flex-col" style={{ height: '600px' }}>
    {/* Header */}
    <div className="flex justify-between items-center bg-blue-500 dark:bg-blue-800 text-white p-3 rounded-t-lg">
      <h3 className="font-semibold">Department Assistant</h3>
      <button 
        onClick={() => setShowChatAssistant(false)} 
        className="text-white hover:text-gray-200"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
    
    {/* Chat Area */}
    <div className="flex-1 p-4 overflow-y-auto">
      {chatMessages.length === 0 ? (
        // Welcome Screen
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="bg-blue-100 dark:bg-blue-500 p-4 rounded-full mb-4">
            <FontAwesomeIcon icon={faRobot} className="text-blue-600 dark:text-blue-300 text-4xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Welcome, Department Official!</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            I'm here to help you manage complaints and department operations. How can I assist you today?
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department:
            </label>
            <select
  value={selectedChatDepartment}
  onChange={(e) => setSelectedChatDepartment(e.target.value)}
  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white text-sm"
  disabled={chatMessages.length > 0}
>
  {DEPARTMENT_KEYWORDS.map(dept => (
    <option key={dept} value={dept}>
      {
  dept === 'Healthcare' ? 'Healthcare Ministry' :
  dept === 'Police' ? 'Police Department' :
  dept === 'PublicWorks' ? 'Public Works Department (PWD)' :
  dept === 'FoodQuality' ? 'Food Quality Ministry' :
  dept === 'Cleaning' ? 'Cleaning and Welfare Ministry' :
  dept === 'Traffic' ? 'Traffic Department' :
  dept
}
    </option>
  ))}
</select>
          </div>
          <div className="w-full space-y-2">
            <h4 className="font-medium text-gray-700 dark:text-gray-200">Quick Questions:</h4>
            <button
              onClick={() => {
                setCurrentMessage(`Being a ${selectedChatDepartment} official, What are the complaints registered in the last few hours?`);
                // setChatMessages([...chatMessages, 
                //   { sender: 'user', text: "What are the complaints registered in the last few hours?" }
                // ]);
              }}
              className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              What are the new complaints?
            </button>
            <button
              onClick={() => {
                setCurrentMessage(`Being a ${selectedChatDepartment} official, Which complaint should I prioritize first?`);
                // setChatMessages([...chatMessages, 
                //   { sender: 'user', text: "Which complaint should I prioritize first?" }
                // ]);
              }}
              className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              What should I prioritize?
            </button>
            <button
              onClick={() => {
                setCurrentMessage(`Being a ${selectedChatDepartment} official, What's on my task list for today?`);
                // setChatMessages([...chatMessages, 
                //   { sender: 'user', text: "What's on my task list for today?" }
                // ]);
              }}
              className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              My today's tasks
            </button>
          </div>
        </div>
      ) : (
        // Chat Conversation
        <div className="space-y-3">
          
          {chatMessages.map((msg, index) => (
            <div key={index}>
              <div 
                className={`p-3 rounded-lg ${msg.sender === 'user' 
                  ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-xs' 
                  : 'bg-gray-100 dark:bg-gray-700 mr-auto max-w-xs'}`}
              >
                {msg.text}
              </div>
              
              {/* Follow-up suggestions after assistant messages */}
              {msg.sender === 'assistant' && index === chatMessages.length - 1 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-2">
                  {generateFollowUpQuestions(msg.text).map((question, qIndex) => (
                    <button
                      key={qIndex}
                      onClick={() => {
                        setCurrentMessage(question);
                        // setChatMessages([...chatMessages, { sender: 'user', text: question }]);
                      }}
                      className="text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 px-2 py-1 rounded-md transition"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mr-auto max-w-xs">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    
    {/* Input Area */}
    <div className="p-3 border-t border-gray-300 dark:border-gray-600">
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;
        
        const userMessage = { sender: 'user', text: currentMessage };
        setChatMessages([...chatMessages, userMessage]);
        setCurrentMessage("");
        setIsLoading(true);
        
        try {
          const response = await fetch('http://localhost:5000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department: selectedChatDepartment, question: currentMessage }),
          });
          
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
          }
          
          const data = await response.json();
          setChatMessages(prev => [...prev, { sender: 'assistant', text: data.answer || data.error }]);
        } catch (error) {
          setChatMessages(prev => [...prev, { 
            sender: 'assistant', 
            text: `Error: ${error.message}`
          }]);
        } finally {
          setIsLoading(false);
        }
      }} className="flex">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type your question..."
          className="flex-grow p-2 border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50"
          disabled={isLoading || !currentMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  </div>
)}

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