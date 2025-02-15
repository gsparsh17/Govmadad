# Govmadad

Govmadad is a complaint management system that utilizes AI to classify complaints, determine urgency, and predict complaint hotspots. It is built using Flask and integrates models for text classification, sentiment analysis, and image captioning.

## Project Structure

```
Govmadad/
│-- complainApi/
│   │-- app.py  # Flask API handling complaints
│   │-- models/ # Model files for prediction
│   │-- templates/ # Optional: HTML templates (if needed in the future)
│-- frontend/  # React frontend directory
│   │-- src/
│   │-- public/
│   │-- package.json
│-- README.md   # Documentation
```

## Features

- **Text-Based Complaint Classification**
  - Classifies complaints into predefined departments
  - Determines urgency of complaints (emergency or not)
  - Assigns category and subcategory to complaints

- **Sentiment Analysis**
  - Analyzes sentiment of complaint text (Positive/Negative)

- **Image Captioning**
  - Extracts relevant captions from images using BLIP model

- **Complaint Prediction Model**
  - Uses trained XGBoost model to predict complaint hotspots based on categories and locations

## Technologies Used

- **Flask** (REST API framework)
- **LangChain** (LLM integration for text classification)
- **Hugging Face Transformers** (BLIP model for image captioning)
- **XGBoost** (Machine Learning model for complaint prediction)
- **NLTK** (Sentiment analysis using Vader)
- **FAISS** (Vector search for efficient retrieval)
- **Pandas & NumPy** (Data processing)
- **Matplotlib & Seaborn** (Data visualization)
- **React** (Frontend framework for UI)
- **Vite** (Faster React development environment)

## Installation & Setup

### Prerequisites

- Python 3.8+
- Pip (Package Manager)
- Node.js (for React frontend)
- npm or yarn (for package management)

### Steps to Set Up Backend (Flask API)

1. Clone the repository:
   ```bash
   git clone https://github.com/gsparsh17/govmadad.git
   cd complainApi
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   Create a `.env` file in the `complainApi` directory  and add:
   
   ### Steps to Generate Groq API Key

   - Go to Groq's API Dashboard.
   - Sign in or create an account.
   - Navigate to the API section.
   - Click on "Generate API Key."
   - Copy the generated API key and store it securely.

   ```env
   GROQ_API_KEY=your_api_key_here
   ```

5. Run the Flask API:
   ```bash
   python app.py
   ```

6. The server will start at `http://127.0.0.1:5000/`

### Steps to Set Up Frontend (React App)

1. Navigate to the root directory:
   ```bash
   cd govmadad
   ```

2. Create a new React project using Vite:
   ```bash
   npm create-react-app frontend --template react
   ```

3. Navigate into the frontend directory:
   ```bash
   cd frontend
   ```

4. Install dependencies:
   ```bash
   npm install
   ```
   or using yarn:
   ```bash
   yarn install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   or using yarn:
   ```bash
   yarn dev
   ```

6. The React frontend will be available at `http://localhost:5173/`.

### Directory Structure for Frontend

```
frontend/
│-- src/
│   │-- components/
│   │-- pages/
│   │   │-- ComplaintPage.jsx
│   │   │-- AdminDashboard.jsx
│   │   │-- ProfilePage.jsx
│   │-- App.jsx
│   │-- main.jsx
│-- public/
│-- package.json
```

## API Endpoints

### 1. Home Route

- **Endpoint:** `/`
- **Method:** `GET`
- **Description:** Displays a welcome message.

### 2. Complaint Classification

- **Endpoint:** `/complaint`
- **Method:** `POST`
- **Payload:**
  ```json
  {
    "complaint": "My street lights are not working."
  }
  ```
- **Response:**
  ```json
  {
    "department": "Public Works Department (PWD)",
    "urgent": "NO",
    "Category": "Electricity Issue",
    "Subcategory": "Power Outage"
  }
  ```

### 3. Sentiment Analysis

- **Endpoint:** `/sentiment`
- **Method:** `POST`
- **Payload:**
  ```json
  {
    "q": "I am very unhappy with the road conditions."
  }
  ```
- **Response:**
  ```json
  {
    "sentiment": "Negative"
  }
  ```

### 4. Image Captioning

- **Endpoint:** `/caption`
- **Method:** `POST`
- **Payload:** Image file (`multipart/form-data`)
- **Response:**
  ```json
  {
    "caption": "A broken road with potholes"
  }
  ```

### 5. Complaint Prediction

- **Endpoint:** `/predict`
- **Method:** `POST`
- **Payload:**
  ```json
  {
    "category": "Road Maintenance",
    "subcategory": "Potholes",
    "pincode": "110001"
  }
  ```
- **Response:**
  ```json
  {
    "predicted_complaint_count": 230
  }
  ```

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss changes.

## License

This project is licensed under the MIT License.

---

**Maintainer:** [Your Name](https://github.com/yourusername)

🚀 Happy Coding! 🚀

