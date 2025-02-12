import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function ProfilePage() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const fetchComplaints = async () => {
      const querySnapshot = await getDocs(collection(db, "complaints"));
      setComplaints(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchComplaints();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gradient-to-r from-blue-200 to-blue-100">
      <h1 className="text-3xl font-bold text-gray-800">📜 Your Complaints</h1>
      <div className="w-full max-w-2xl mt-6 bg-white p-6 rounded-lg shadow-md">
        {complaints.length === 0 ? (
          <p className="text-gray-600 text-center">No complaints found.</p>
        ) : (
          complaints.map((comp) => (
            <div key={comp.id} className="p-4 border-b">
              <p className="text-gray-800">{comp.Complaint}</p>
              <p className={`text-sm mt-1 ${comp.status === "Pending" ? "text-red-500" : "text-green-500"}`}>
                Status: {comp.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
