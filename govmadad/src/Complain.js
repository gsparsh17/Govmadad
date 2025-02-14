import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

const categories = ["Corruption", "Crime", "Electricity Issue", "Public Transport", "Road Maintenance", "Water Supply"];
const subcategories = ["Bribery", "Theft", "Power Outage", "Fare Overcharging", "Potholes", "No Water Supply"];

export default function ComplaintPage() {
  const [complaint, setComplaint] = useState("");
  const [image, setImage] = useState(null);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictedTime, setPredictedTime] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setPredictedTime(null);

    try {
        let imageCaption = "";
        if (image) {
            const formData = new FormData();
            formData.append("image", image);

            const imageRes = await axios.post("http://localhost:5000/caption", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            imageCaption = imageRes.data.caption;
        }

        // Send complaint data
        const res = await axios.post("http://localhost:5000/complaint", { complaint });

        const departmentMatch = res.data.department.match(/registered with (.*?) and/i);
        const department = departmentMatch ? departmentMatch[1] : "Unknown Department";

        // Save complaint to Firebase
        await addDoc(collection(db, "complaints"), {
            Complaint: complaint,
            Category: category,
            Subcategory: subcategory,
            Pincode: pincode,
            Area: area,
            Date: date,
            Status: "Pending",
            Response: res.data.department,
            Department: department,
            Urgency: res.data.urgent,
            timestamp: new Date(),
        });

        // Store response data in state
        setResponse({ 
            response: res.data.department, 
            department, 
            urgent: res.data.urgent, 
            Category: res.data.Category, 
            Subcategory: res.data.Subcategory, 
            imageCaption 
        });

        console.log("Predicting resolution time...");
        
        const predictRes = await axios.post("http://localhost:5000/predict", { 
            category: String(category), 
            subcategory: String(subcategory), 
            pincode: String(pincode)
        });

        console.log("Prediction Response:", predictRes.data);
        setPredictedTime(predictRes.data.predicted_resolution_time);

    } catch (error) {
        console.error("Error submitting complaint", error);
    } finally {
        setLoading(false);
    }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-400 to-blue-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white bg-opacity-90 backdrop-blur-lg shadow-lg p-8 rounded-lg w-full max-w-lg"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">📝 Submit a Complaint</h1>
        <p className="text-gray-600 text-center mb-6">
          Please describe your issue, and we will direct it to the appropriate department.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
        <select className="w-full p-3 border rounded-md" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select className="w-full p-3 border rounded-md" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
            <option value="">Select Subcategory</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <input type="text" placeholder="Pincode (Optional)" className="w-full p-3 border rounded-md" value={pincode} onChange={(e) => setPincode(e.target.value)} />

          <input type="text" placeholder="Area (Optional)" className="w-full p-3 border rounded-md" value={area} onChange={(e) => setArea(e.target.value)} />

          <input type="date" className="w-full p-3 border rounded-md" value={date} onChange={(e) => setDate(e.target.value)} />

          <textarea className="w-full p-3 border rounded-md" rows="4" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Describe your complaint..." required />

          <input type="file" accept="image/*" className="w-full p-2 border rounded-md" onChange={(e) => setImage(e.target.files[0])} />

          <button type="submit" className={`w-full py-3 rounded-md text-white font-semibold transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`} disabled={loading}>
            {loading ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-4 flex justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}

        {response && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-md"
          ><p className="text-gray-700"> {response.response}</p>
            <p className="text-gray-700"><strong>📌 Department:</strong> {response.department}</p>
            <p className="text-gray-700"><strong>⚠️ Category:</strong> {response.Category}</p>
            <p className="text-gray-700"><strong>⚠️ Subcategory:</strong> {response.Subcategory}</p>
            <p className="text-gray-700"><strong>🕒 Predicted Resolution Time:</strong> {predictedTime}</p>
            <p className="text-gray-700"><strong>⚠️ Urgency:</strong> {response.urgent}</p>
            {response.imageCaption && (
              <p className="text-gray-700"><strong>🖼️ Image Caption:</strong> {response.imageCaption}</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
