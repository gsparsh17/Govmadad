import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Label } from "./components/ui/label";
import { useNavigate } from "react-router-dom";

// Department keywords to match against
const DEPARTMENT_KEYWORDS = ['Healthcare', 'Police', 'PublicWorks', 'FoodQuality', 'Cleaning', 'Traffic'];

const categories = ["Corruption", "Crime", "Electricity Issue", "Public Transport", "Road Maintenance", "Water Supply"];

const subcategories = [
  "Billing Issue", "Blocked Drainage", "Bribery", "Chain Snatching",
  "Contaminated Water", "Cyber Crime", "Fare Overcharging",
  "Favoritism in Govt Services", "Fraud in Public Distribution",
  "Irregular Metro Services", "Land Registration Scam", "Low Pressure",
  "Meter Fault", "No Water Supply", "Overcrowded Buses", "Pipeline Leakage",
  "Poor Bus Condition", "Potholes", "Power Outage", "Road Safety Issues",
  "Robbery", "Theft", "Unfinished Roadwork", "Voltage Fluctuation"
];

export default function ComplaintPage() {
  const [complaint, setComplaint] = useState("");
  const [image, setImage] = useState(null);
  const [imageCaption, setImageCaption] = useState(""); // New state for image caption
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false); // Loading state for caption generation
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [uid, setUid] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictedTime, setPredictedTime] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Function to match department from API response
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

  const generateComplaintId = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString(); // Generates random 8-digit number
  };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResponse(null);
//     setPredictedTime(null);
//     setError("");

//     if (!image && !complaint.trim()) {
//       setError("Please provide either a description or upload an image");
//       setLoading(false);
//       return;
//     }

//     try {
//       let imageCaption = "";
//       if (image) {
//         const formData = new FormData();
//         formData.append("image", image);

//         const imageRes = await axios.post("http://localhost:5000/caption", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });

//         imageCaption = imageRes.data.caption;
//       }

//       let complaintText = '';

//         if (complaint.trim() && imageCaption) {
//           complaintText = `${complaint.trim()} ${imageCaption}`;
//         } else if (complaint.trim()) {
//           complaintText = complaint.trim();
//         } else if (imageCaption) {
//           complaintText = imageCaption;
//         }
//       const res = await axios.post("http://localhost:5000/complaint", { complaint: complaintText });

//       // Use the new matchDepartment function instead of regex
//       const department = matchDepartment(res.data.department);

//       const finalCategory = category === "" ? res.data.Category : category;
//       const finalSubCategory = subcategory === "" ? res.data.Subcategory : subcategory;

//       const extractSubcategory = (text) => {
//         const regex = new RegExp(subcategories.join("|"), "i");
//         const match = text.match(regex);
//         return match ? match[0] : "Unknown Subcategory";
//       };
      
//       const extractcategory = (text) => {
//         const regex = new RegExp(categories.join("|"), "i");
//         const match = text.match(regex);
//         return match ? match[0] : "Unknown Category";
//       };
      
//       const finalSubCategory1 = extractSubcategory(finalSubCategory);
//       const finalCategory1 = extractcategory(finalCategory);

//       const predictRes = await axios.post("http://localhost:5000/predict", {
//         category: String(finalCategory1),
//         subcategory: String(finalSubCategory1),
//         pincode: String(pincode),
//       });



//       const timeString = predictRes.data.predicted_resolution_time||7;
// const numericValue = parseInt(timeString); // Extracts 33 from "33 days"

// console.log("Parsed numeric value:", numericValue);

// let finalPredictedTime;
// if (isNaN(numericValue)) {
//   console.warn("Couldn't parse prediction time, using default value");
//   finalPredictedTime = 7; // Default fallback
// } else {
//   // Apply your business logic
//   finalPredictedTime = numericValue > 10 ? numericValue % 10 : numericValue;
// }

// // Set the state (if you need it for display)
// setPredictedTime(finalPredictedTime);

// const complaintId = generateComplaintId();

// const responseData = {
//   response: res.data.department,
//   complaintId,
//   complaint: complaintText,
//   pincode,
//   department,
//   urgent: res.data.urgent,
//   category: finalCategory1,
//   subcategory: finalSubCategory1,
//   imageCaption,
//   predictedTime: `${finalPredictedTime} days`, // Use the calculated value here
// };
  
//       console.log(responseData);
  
//       await addDoc(collection(db, "complaints"), {
//         ComplaintId: complaintId,
//         Complaint: complaintText,
//         Category: finalCategory1,
//         Subcategory: finalSubCategory1,
//         Pincode: pincode,
//         Area: area,
//         Date: date,
//         UID: uid,
//         Status: "Pending",
//         Response: res.data.department,
//         Department: department,
//         Urgency: res.data.urgent,
//         Phone: "Fetched From UID",
//         ImageCaption: imageCaption,
//         FiledBy: "Fetched From UID",
//         ComplaintDate: new Date(),
//         PredictedTime: `${finalPredictedTime} days`,
//         RemainingDays: finalPredictedTime,
//       });

//       navigate("/response", { state: responseData });
//     } catch (error) {
//       console.error("Error submitting complaint", error);
//       // setError("Failed to submit complaint. Please try again.");

//     } finally {
//       setLoading(false);
//     }
//   };
const handleImageUpload = async (file) => {
  if (!file) return;
  
  setImage(file);
  setIsGeneratingCaption(true);
  setImageCaption(""); // Clear previous caption
  
  try {
    const formData = new FormData();
    formData.append("image", file);

    const imageRes = await axios.post("http://localhost:5000/caption", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setImageCaption(imageRes.data.caption || "");
  } catch (error) {
    console.error("Error generating caption:", error);
    setError("Failed to generate image caption. You can still submit with just text.");
  } finally {
    setIsGeneratingCaption(false);
  }
};

// Modified handleSubmit to use the existing imageCaption state
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setResponse(null);
  setPredictedTime(null);
  setError("");

  if (!image && !complaint.trim()) {
    setError("Please provide either a description or upload an image");
    setLoading(false);
    return;
  }

  try {
    let complaintText = '';
    
    if (complaint.trim() && imageCaption) {
      complaintText = `${complaint.trim()} ${imageCaption}`;
    } else if (complaint.trim()) {
      complaintText = complaint.trim();
    } else if (imageCaption) {
      complaintText = imageCaption;
    }

    // Rest of your existing submission logic...
    const res = await axios.post("http://localhost:5000/complaint", { complaint: complaintText });

    const department = matchDepartment(res.data.department);
    const finalCategory = category === "" ? res.data.Category : category;
    const finalSubCategory = subcategory === "" ? res.data.Subcategory : subcategory;

    const extractSubcategory = (text) => {
      const regex = new RegExp(subcategories.join("|"), "i");
      const match = text.match(regex);
      return match ? match[0] : "Unknown Subcategory";
    };
    
    const extractcategory = (text) => {
      const regex = new RegExp(categories.join("|"), "i");
      const match = text.match(regex);
      return match ? match[0] : "Unknown Category";
    };
    
    const finalSubCategory1 = extractSubcategory(finalSubCategory);
    const finalCategory1 = extractcategory(finalCategory);

    const predictRes = await axios.post("http://localhost:5000/predict", {
      category: String(finalCategory1),
      subcategory: String(finalSubCategory1),
      pincode: String(pincode),
    });

    const timeString = predictRes.data.predicted_resolution_time||7;
    const numericValue = parseInt(timeString);
    let finalPredictedTime;
    if (isNaN(numericValue)) {
      finalPredictedTime = 7;
    } else {
      finalPredictedTime = numericValue > 10 ? numericValue % 10 : numericValue;
    }

    setPredictedTime(finalPredictedTime);
    const complaintId = generateComplaintId();

    const responseData = {
      response: res.data.department,
      complaintId,
      complaint: complaintText,
      pincode,
      department,
      urgent: res.data.urgent,
      category: finalCategory1,
      subcategory: finalSubCategory1,
      imageCaption,
      predictedTime: `${finalPredictedTime} days`,
    };

    await addDoc(collection(db, "complaints"), {
      ComplaintId: complaintId,
      Complaint: complaintText,
      Category: finalCategory1,
      Subcategory: finalSubCategory1,
      Pincode: pincode,
      Area: area,
      Date: date,
      UID: uid,
      Status: "Pending",
      Response: res.data.department,
      Department: department,
      Urgency: res.data.urgent,
      Phone: "Fetched From UID",
      ImageCaption: imageCaption,
      FiledBy: "Fetched From UID",
      ComplaintDate: new Date(),
      PredictedTime: `${finalPredictedTime} days`,
      RemainingDays: finalPredictedTime,
    });

    navigate("/response", { state: responseData });
  } catch (error) {
    console.error("Error submitting complaint", error);
    setError("Failed to submit complaint. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-400 to-blue-400 p-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-lg shadow-gray-500 dark:shadow-gray-800">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-blue-500">📝 Submit a Complaint</CardTitle>
            <CardDescription className="text-center">
              Please describe your issue or upload an image, and we will direct it to the appropriate department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="uid">Aadhaar Number / UID</Label>
                <Input
                  id="uid"
                  placeholder="Enter your Aadhaar or UID"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    placeholder="Enter pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input 
                    id="area" 
                    placeholder="Enter area" 
                    value={area} 
                    onChange={(e) => setArea(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date of Incident</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint">
                  Complaint Description {!image && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="complaint"
                  placeholder={"Describe your complaint in detail..."}
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={4}
                  required={!image}
                />
                {image && (
                  <p className="text-sm text-gray-500">
                    Description is optional since you've uploaded an image
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Attach Image (Optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0])}
                />
                {image && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">
                      Image selected: {image.name}
                    </p>
                    {isGeneratingCaption ? (
                      <div className="flex items-center text-sm text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating caption...
                      </div>
                    ) : (
                      imageCaption && (
                        <div className="mt-2 space-y-1">
                          <Label htmlFor="image-caption">Generated Image Caption</Label>
                          <Textarea
                            id="image-caption"
                            value={imageCaption}
                            onChange={(e) => setImageCaption(e.target.value)}
                            rows={2}
                            placeholder="Edit the generated caption if needed"
                          />
                          <p className="text-xs text-gray-500">
                            This caption will be combined with your complaint description
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || isGeneratingCaption}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Complaint"
                )}
              </Button>
            </form>

            <AnimatePresence>
              {response && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-md space-y-2"
                >
                  <p className="text-blue-800 font-semibold">{response.response}</p>
                  <p>
                    <strong>📌 Department:</strong> {response.department}
                  </p>
                  <p>
                    <strong>⚠️ Category:</strong> {response.category}
                  </p>
                  <p>
                    <strong>⚠️ Subcategory:</strong> {response.subcategory}
                  </p>
                  {predictedTime && (
                    <p>
                      <strong>🕒 Predicted Resolution Time:</strong> {predictedTime}
                    </p>
                  )}
                  <p>
                    <strong>⚠️ Urgency:</strong>{" "}
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        response.urgent === "Yes" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {response.urgent === "Yes" ? (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      )}
                      {response.urgent}
                    </span>
                  </p>
                  {response.imageCaption && (
                    <p>
                      <strong>🖼 Image Caption:</strong> {response.imageCaption}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}