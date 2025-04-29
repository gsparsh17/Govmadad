import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { AlertCircle, CheckCircle, Clock, Image, Tag, Bookmark, Target } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";

export default function ResponsePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const response = location.state;

  if (!response) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No response data available.</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-600 to-green-400 p-6">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">📜 Complaint Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Complaint ID */}
  <p className="flex items-center justify-center">
    <strong className="mr-2 text-center">Complaint ID:</strong> {response.complaintId}
  </p>
  <p className="text-gray-700 dark:text-gray-300 font-semibold">{response.response}</p>
    
  {response.complaint && (
    <p className="flex items-center">
      <Target className="w-6 h-6 text-red-600 dark:text-red-400 mr-2"/>
      <strong className="mr-2">Complaint:</strong> {response.complaint}
    </p>
  )}

  {/* Department */}
  <p className="flex items-center">
    <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
    <strong className="mr-2">Department: </strong> {response.department}
  </p>

  {/* Category */}
  <p className="flex items-center">
    <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
    <strong className="mr-2">Category: </strong> {response.category}
  </p>

  {/* Subcategory */}
  <p className="flex items-center">
    <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2" />
    <strong className="mr-2">Subcategory: </strong> {response.subcategory}
  </p>

  {/* Predicted Resolution Time (if available) */}
  {response.predictedTime && (
    <p className="flex items-center">
      <Clock className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
      <strong className="mr-2">Predicted Resolution Time: </strong> {response.predictedTime}
    </p>
  )}

  {/* Urgency Level */}
  <p className="flex items-center">
    <strong className="mr-2">⚠️ Urgency:</strong>
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
        response.urgent === "Yes" ? "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
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

  {/* Image Caption (if available) */}
  {response.imageCaption && (
    <p className="flex items-center">
      <Image className="w-4 h-4 text-orange-600 dark:text-gray-300 mr-2" />
      <strong>Image Caption:</strong> {response.imageCaption}
    </p>
  )}
  <Button className="w-full" onClick={() => navigate("/profile")}>Track Live Status</Button>
  <Button className="w-full" onClick={() => navigate("/complaint")}>Submit Another Complaint</Button>
          </CardContent>
            
        </Card>
      </motion.div>
    </div>
  );
}
