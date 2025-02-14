
import React, { useState } from "react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { collection, addDoc } from "firebase/firestore"
import { db } from "./firebase"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Textarea } from "./components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Label } from "./components/ui/label"
import { useNavigate } from "react-router-dom";

const categories = ["Corruption", "Crime", "Electricity Issue", "Public Transport", "Road Maintenance", "Water Supply"]
const subcategories = ["Bribery", "Theft", "Power Outage", "Fare Overcharging", "Potholes", "No Water Supply"]

export default function ComplaintPage() {
  const [complaint, setComplaint] = useState("")
  const [image, setImage] = useState(null)
  const [category, setCategory] = useState("")
  const [subcategory, setSubcategory] = useState("")
  const [pincode, setPincode] = useState("")
  const [area, setArea] = useState("")
  const [date, setDate] = useState("")
  const [uid, setUid] = useState("")
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [predictedTime, setPredictedTime] = useState(null)
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResponse(null)
    setPredictedTime(null)

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

      const predictRes = await axios.post("http://localhost:5000/predict", {
        category: String(category),
        subcategory: String(subcategory),
        pincode: String(pincode),
      });

      const responseData = {
        response: res.data.department,
        department,
        urgent: res.data.urgent,
        category: res.data.Category,
        subcategory: res.data.Subcategory,
        imageCaption,
        predictedTime: predictRes.data.predicted_resolution_time,
      };
      console.log(responseData);
      await addDoc(collection(db, "complaints"), {
        Complaint: complaint,
        Category: category,
        Subcategory: subcategory,
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
        PredictedTime: predictRes.data.predicted_resolution_time,
        RemainingDays: predictRes.data.predicted_resolution_time,
      });

      // Redirect to Response Page with Data
      navigate("/response", { state: responseData });
    } catch (error) {
      console.error("Error submitting complaint", error);
    } finally {
      setLoading(false);
    }
  }

return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-blue-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-lg shadow-gray-500 dark:shadow-gray-800">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">📝 Submit a Complaint</CardTitle>
            <CardDescription className="text-center">
              Please describe your issue, and we will direct it to the appropriate department.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" placeholder="Enter area" value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date of Incident</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaint">Complaint Description</Label>
                <Textarea
                  id="complaint"
                  placeholder="Describe your complaint in detail..."
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Attach Image (Optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </div>
<Button type="submit" className="w-full" disabled={loading}>
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
                    <strong>⚠️ Category:</strong> {response.Category}
                  </p>
                  <p>
                    <strong>⚠️ Subcategory:</strong> {response.Subcategory}
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
  )
}