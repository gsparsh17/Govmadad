import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Loader2, Clock, AlertCircle, CheckCircle, Calendar, ChevronRight } from "lucide-react";
import { format, differenceInDays, isValid, parseISO } from "date-fns";

export default function ProfilePage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Function to parse "33 days" into number
  const parseDays = (timeString) => {
    if (!timeString) return null;
    const daysMatch = String(timeString).match(/\d+/);
    return daysMatch ? parseInt(daysMatch[0], 10) : null;
  };

  useEffect(() => {
    const fetchAndUpdateComplaints = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "complaints"));
        const complaintList = [];

        for (const complaintDoc of querySnapshot.docs) {
          const comp = complaintDoc.data();
          const complaintDate = comp.ComplaintDate?.toDate();
          const isValidDate = isValid(complaintDate);
          
          // Parse predicted time (handles both "33 days" and raw numbers)
          const predictedDays = parseDays(comp.PredictedTime);
          
          let remainingDays = "N/A";
          if (predictedDays && isValidDate) {
            const daysPassed = differenceInDays(new Date(), complaintDate);
            remainingDays = Math.max(predictedDays - daysPassed, 0);
            
            // Update in Firestore if needed
            if (comp.RemainingDays !== remainingDays) {
              setUpdating(true);
              const complaintRef = doc(db, "complaints", complaintDoc.id);
              await updateDoc(complaintRef, { 
                RemainingDays: remainingDays,
                PredictedDays: predictedDays // Store the parsed number for future use
              });
            }
          }

          complaintList.push({ 
            id: complaintDoc.id, 
            ...comp, 
            RemainingDays: remainingDays,
            PredictedDays: predictedDays
          });
        }

        setComplaints(complaintList.sort((a, b) => {
          // Sort by remaining days (urgent first)
          if (a.RemainingDays === "N/A") return 1;
          if (b.RemainingDays === "N/A") return -1;
          return a.RemainingDays - b.RemainingDays;
        }));
      } catch (error) {
        console.error("Error updating complaints:", error);
      } finally {
        setLoading(false);
        setUpdating(false);
      }
    };

    fetchAndUpdateComplaints();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-500";
      case "In Progress": return "bg-blue-500";
      case "Resolved": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getUrgencyColor = (days) => {
    if (days === "N/A") return "bg-gray-100 text-gray-800";
    if (days <= 2) return "bg-red-100 text-red-800";
    if (days <= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">📋</span>
            Your Complaint History
          </h1>
          {updating && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="animate-spin mr-2 w-4 h-4" />
              Updating status...
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              You haven't filed any complaints yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((comp) => (
              <div
                key={comp.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setSelectedComplaint(comp)}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        #{comp.ComplaintId}
                        </h4>
                        <p className="text-lg text-gray-600 dark:text-white truncate">
                        {comp.Complaint}
                      </p>
                      <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span>
                          {isValid(comp.ComplaintDate?.toDate()) 
                            ? format(comp.ComplaintDate.toDate(), "MMM dd, yyyy") 
                            : "Date not available"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400 ml-2 flex-shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center ${getStatusColor(comp.Status)} text-white`}>
                      {comp.Status}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center ${getUrgencyColor(comp.RemainingDays)}`}>
                      <Clock className="w-3 h-3 mr-1.5" />
                      {comp.RemainingDays === "N/A" ? "Time not estimated" : `${comp.RemainingDays} days remaining`}
                    </span>
                    {comp.Urgency === "YES" && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1.5" />
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complaint Details</h2>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">COMPLAINT</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Complaint}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">STATUS</h3>
                    <p className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedComplaint.Status)} text-white`}>
                      {selectedComplaint.Status}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">URGENCY</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {selectedComplaint.Urgency === "YES" ? "Urgent" : "Normal"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">DEPARTMENT</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Department}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CATEGORY</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">FILED ON</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {isValid(selectedComplaint.ComplaintDate?.toDate()) 
                        ? format(selectedComplaint.ComplaintDate.toDate(), "MMM dd, yyyy") 
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">LOCATION</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {selectedComplaint.Area}, {selectedComplaint.Pincode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ESTIMATED TIME</h3>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {selectedComplaint.PredictedDays ? `${selectedComplaint.PredictedDays} days` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">REMAINING TIME</h3>
                    <p className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(selectedComplaint.RemainingDays)}`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {selectedComplaint.RemainingDays === "N/A" 
                        ? "Not available" 
                        : `${selectedComplaint.RemainingDays} days`}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Response</h3>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Response}</p>
                </div>
                

                <div className="pt-4">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}