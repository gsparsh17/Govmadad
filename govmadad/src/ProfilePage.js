import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { Loader2, Clock, AlertCircle, CheckCircle, Calendar } from "lucide-react";
import { format, differenceInHours, isValid } from "date-fns";

export default function ProfilePage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  useEffect(() => {
    const fetchAndUpdateComplaints = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "complaints"));
        const complaintList = [];

        for (const complaintDoc of querySnapshot.docs) {
          const comp = complaintDoc.data();
          const complaintDate = comp.ComplaintDate?.toDate();
          const isValidDate = isValid(complaintDate);
          const daysPassed = isValidDate ? Math.floor(differenceInHours(new Date(), complaintDate) / 24) : 0;
          const predictedTime = comp.PredictedTime ? parseInt(comp.PredictedTime, 10) : 0;
          const remainingDays = predictedTime && isValidDate ? Math.max(predictedTime - daysPassed, 0) : "N/A";

          const complaintRef = doc(db, "complaints", complaintDoc.id);
          await updateDoc(complaintRef, { RemainingDays: remainingDays });

          complaintList.push({ id: complaintDoc.id, ...comp, RemainingDays: remainingDays });
        }

        setComplaints(complaintList);
      } catch (error) {
        console.error("Error updating complaints:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndUpdateComplaints();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">📜 Your Complaints</h1>
      <div className="w-full max-w-3xl mt-6 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-blue-600 dark:text-white" size={32} />
          </div>
        ) : complaints.length === 0 ? (
          <p className="text-gray-600 text-center dark:text-gray-300">No complaints found.</p>
        ) : (
          <div className="space-y-4">
            {complaints.map((comp) => (
              <div
                key={comp.id}
                className="p-5 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                onClick={() => setSelectedComplaint(comp)}
              >
                <p className="text-lg font-medium text-gray-900 dark:text-white">{comp.Complaint}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {isValid(comp.ComplaintDate?.toDate()) ? format(comp.ComplaintDate.toDate(), "PPP") : "Invalid Date"}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-lg flex items-center ${comp.Status === "Pending" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}
                  >
                    {comp.Status === "Pending" ? <AlertCircle className="w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    {comp.Status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-2 flex items-center">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-1" />
                  Estimated resolution in: {comp.RemainingDays}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedComplaint && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg max-w-md w-full relative">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Complaint Status</h2>
            <p className="text-gray-700 dark:text-gray-300"><strong>Complaint:</strong> {selectedComplaint.Complaint}</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Status:</strong> {selectedComplaint.Status}</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Department:</strong> {selectedComplaint.Department}</p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Filed on:</strong> {isValid(selectedComplaint.ComplaintDate?.toDate()) ? format(selectedComplaint.ComplaintDate.toDate(), "PPP") : "Invalid Date"}
            </p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Remaining Days:</strong> {selectedComplaint.RemainingDays}</p>
            <button onClick={() => setSelectedComplaint(null)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
