import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Loader2, Clock, AlertCircle, CheckCircle, Calendar, ChevronRight } from "lucide-react";
import { format, differenceInDays, isValid, parseISO } from "date-fns";

// ... (keep the rest of your component code above useEffect the same)

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
          // Ensure ComplaintDate exists and is a Firestore Timestamp before calling toDate()
          const complaintDate = comp.ComplaintDate && typeof comp.ComplaintDate.toDate === 'function' 
                                ? comp.ComplaintDate.toDate() 
                                : null; 
          const isValidDate = isValid(complaintDate);
          
          // Parse predicted time (handles both "33 days" and raw numbers)
          const predictedDays = parseDays(comp.PredictedTime);
          
          let remainingDays = "N/A";
          let requiresUpdate = false; // Flag to check if Firestore update is needed

          if (predictedDays !== null && isValidDate) {
            const daysPassed = differenceInDays(new Date(), complaintDate);
            const calculatedRemainingDays = Math.max(predictedDays - daysPassed, 0);
            remainingDays = calculatedRemainingDays;
            
            // Check if Firestore update is needed for RemainingDays or PredictedDays
            if (comp.RemainingDays !== remainingDays || comp.PredictedDays !== predictedDays) {
               requiresUpdate = true;
            }
          } else {
            // If prediction or date is invalid, ensure RemainingDays is N/A in Firestore too
            if (comp.RemainingDays !== "N/A") {
                remainingDays = "N/A";
                requiresUpdate = true;
            }
             if (comp.PredictedDays !== predictedDays) { // Handle case where PredictedTime string was invalid
                requiresUpdate = true;
            }
          }

          // Update in Firestore if needed
          if (requiresUpdate) {
             setUpdating(true); // Show updating indicator
             const complaintRef = doc(db, "complaints", complaintDoc.id);
             try {
                 await updateDoc(complaintRef, { 
                     RemainingDays: remainingDays,
                     PredictedDays: predictedDays // Store the parsed number or null
                 });
             } catch (updateError) {
                 console.error(`Error updating complaint ${complaintDoc.id}:`, updateError);
                 // Decide how to handle failed updates - maybe log or notify user
             }
          }

          complaintList.push({ 
            id: complaintDoc.id, 
            ...comp, 
            // Ensure the JS object has the most up-to-date values
            ComplaintDate: comp.ComplaintDate, // Keep the original Firestore Timestamp here for sorting
            RemainingDays: remainingDays,
            PredictedDays: predictedDays 
          });
        }

        // --- SORTING LOGIC ---
        // Sort by ComplaintDate (most recent first)
        // Handle cases where ComplaintDate might be missing or invalid
        complaintList.sort((a, b) => {
            const dateA = a.ComplaintDate && typeof a.ComplaintDate.toDate === 'function' ? a.ComplaintDate.toDate() : null;
            const dateB = b.ComplaintDate && typeof b.ComplaintDate.toDate === 'function' ? b.ComplaintDate.toDate() : null;

            const isValidA = isValid(dateA);
            const isValidB = isValid(dateB);

            if (isValidA && isValidB) {
                // Both dates are valid, sort descending (newest first)
                return dateB.getTime() - dateA.getTime();
            } else if (isValidB) {
                // Only B is valid, B comes first (treat invalid dates as older)
                return 1; 
            } else if (isValidA) {
                // Only A is valid, A comes first
                return -1;
            } else {
                // Neither is valid, keep original order relative to each other
                return 0;
            }
        });
        // --- END SORTING LOGIC ---

        setComplaints(complaintList); // Set the sorted list to state

      } catch (error) {
        console.error("Error fetching or updating complaints:", error);
        // Optionally set an error state here to display to the user
      } finally {
        setLoading(false);
        setUpdating(false); // Ensure updating indicator is turned off
      }
    };

    fetchAndUpdateComplaints();
    // Dependency array is empty, so this runs once on mount.
    // If you needed this to re-run based on some external factor, add it here.
  }, []); 

  // ... (keep getStatusColor, getUrgencyColor, and the return/JSX part the same)

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-500";
      case "In Progress": return "bg-blue-500";
      case "Resolved": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getUrgencyColor = (days) => {
    if (days === "N/A" || typeof days !== 'number') return "bg-gray-100 text-gray-800";
    if (days <= 2) return "bg-red-100 text-red-800";
    if (days <= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    // ... (Your existing JSX structure remains the same)
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
            {complaints.map((comp) => {
              // Get the JS Date object for formatting, handling potential null/invalid
               const complaintDateForDisplay = comp.ComplaintDate && typeof comp.ComplaintDate.toDate === 'function' 
                                            ? comp.ComplaintDate.toDate() 
                                            : null;
               const isValidDateForDisplay = isValid(complaintDateForDisplay);

              return (
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
                             {/* Use the derived date for display */}
                            {isValidDateForDisplay
                              ? format(complaintDateForDisplay, "MMM dd, yyyy") 
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
                         {/* Display logic for remaining days */}
                        {comp.RemainingDays === "N/A" || typeof comp.RemainingDays !== 'number' 
                           ? "Time not estimated" 
                           : `${comp.RemainingDays} day${comp.RemainingDays !== 1 ? 's' : ''} remaining`}
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
              ) // end return map item
            })} {/* end map */}
          </div> // end space-y-4
        )} {/* end loading/empty check */}
      </div> {/* end max-w-4xl */}

      {/* Complaint Detail Modal (ensure date formatting here is also robust) */}
      {selectedComplaint && (
         (() => {
            // Pre-calculate date for modal display, handling invalid/missing
            const modalComplaintDate = selectedComplaint.ComplaintDate && typeof selectedComplaint.ComplaintDate.toDate === 'function'
                                        ? selectedComplaint.ComplaintDate.toDate()
                                        : null;
            const isModalDateValid = isValid(modalComplaintDate);

           return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  {/* ... (rest of modal header) ... */}
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
                    {/* ... (other details like Complaint, Status, Urgency, Department, Category) ... */}
                     <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">COMPLAINT</h3>
                      <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Complaint}</p>
                     </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Status */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">STATUS</h3>
                        <p className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedComplaint.Status)} text-white`}>
                          {selectedComplaint.Status}
                        </p>
                      </div>
                       {/* Urgency */}
                       <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">URGENCY</h3>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {selectedComplaint.Urgency === "YES" ? "Urgent" : "Normal"}
                        </p>
                       </div>
                    </div>
                    
                    {/* Department & Category */}
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
                       {/* Filed On */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">FILED ON</h3>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {/* Use the pre-calculated modal date */}
                           {isModalDateValid
                              ? format(modalComplaintDate, "MMM dd, yyyy") 
                              : "N/A"}
                        </p>
                      </div>
                       {/* Location */}
                       <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">LOCATION</h3>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {selectedComplaint.Area}, {selectedComplaint.Pincode}
                        </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       {/* Estimated Time */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">ESTIMATED TIME</h3>
                        <p className="mt-1 text-gray-900 dark:text-white">
                          {selectedComplaint.PredictedDays !== null && typeof selectedComplaint.PredictedDays === 'number'
                             ? `${selectedComplaint.PredictedDays} day${selectedComplaint.PredictedDays !== 1 ? 's' : ''}` 
                             : "N/A"}
                        </p>
                      </div>
                       {/* Remaining Time */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">REMAINING TIME</h3>
                        <p className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(selectedComplaint.RemainingDays)}`}>
                          <Clock className="w-3 h-3 mr-1" />
                           {selectedComplaint.RemainingDays === "N/A" || typeof selectedComplaint.RemainingDays !== 'number'
                            ? "Not available" 
                            : `${selectedComplaint.RemainingDays} day${selectedComplaint.RemainingDays !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                     {/* Current Response */}
                     <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Response</h3>
                      <p className="mt-1 text-gray-900 dark:text-white">{selectedComplaint.Response || "No response yet."}</p>
                     </div>

                    {/* ... (Close button) ... */}
                     <div className="pt-4">
                      <button
                        onClick={() => setSelectedComplaint(null)}
                        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
                     </div>
                  </div> {/* end space-y-4 */}
                </div> {/* end p-6 */}
              </div> {/* end bg-white */}
            </div> /* end fixed inset */
           ); // end return IIFE
         })() // end IIFE for modal calculation
      )} {/* end selectedComplaint check */}
    </div> // end main div
  ); // end return component
} // end ProfilePage component