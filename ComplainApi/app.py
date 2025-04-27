from flask import Flask, request, jsonify, send_file, render_template_string
from flask_cors import CORS
import os
import firebase_admin
from firebase_admin import credentials, firestore
from langchain.schema import Document
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA, LLMChain
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
from dotenv import load_dotenv
import torch
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb
import pandas as pd
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import nltk
import math
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

cred = credentials.Certificate("govmadad-firebase-adminsdk-fbsvc-8999227f8b.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
CSV_PATH = "complaints.csv"


# matplotlib.use('Agg')
df_ = pd.read_csv("synthetic_igrs_expanded_2014_2024_unique_desc.csv")

df = df_.drop_duplicates(subset=["description"]).copy()

# Function to drop random complaints from each district
def drop_random_complaints(group):
    if len(group) > 1:
        drop_percentage = np.random.uniform(0.05, 0.6)  
        drop_count = int(len(group) * drop_percentage)
        return group.sample(frac=1).iloc[drop_count:]  
    return group

df_filtered = df.groupby("district", group_keys=False).apply(drop_random_complaints)

hotspots = df_filtered["district"].value_counts().reset_index()
hotspots.columns = ["district", "complaint_count"]

model_path = "xgboost_model.pkl"  
with open(model_path, "rb") as f:
    model = pickle.load(f)

with open("category_encoder.pkl", "rb") as f:
    category_encoder = pickle.load(f)

with open("subcategory_encoder.pkl", "rb") as f:
    subcategory_encoder = pickle.load(f)



with open("pincode_encoder.pkl", "rb") as f:
    pincode_encoder = pickle.load(f)


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response
    
load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")
embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.1-8b-instant")

urgency_prompt = ChatPromptTemplate.from_template(
    """
    You are a complaint assistant. Your task is to analyze the complaint and determine whether it is an emergency
    or not. Always give answer in 'YES' and 'NO' only.
    Complaint: {input}
    """
)

query_prompt = ChatPromptTemplate.from_template(
    """
    You are a complaint assistant. Your task is to categorize user complaints into the following departments:
    Healthcare Ministry, Police, Public Works Department (PWD), Food Quality Ministry, Cleaning & Welfare Ministry, or Traffic Department.
    Also analyze the state of the complaint to declare it as an emergency and if it needs to be, tell the user it is an emergency complaint.
    Keep it short, about 50 words.
    Based on the user's complaint, tell them which department it has been assigned to and respond with:
    'Your complaint is registered with "Department name" and will be attended to shortly.'
    Complaint: {input}
    """
)

category_prompt = ChatPromptTemplate.from_template("""
    You are a complaint assistant. Your task is to categorize user complaints into the following categories:
    'Corruption', 'Crime', 'Electricity Issue', 'Public Transport', 'Road Maintenance', 'Water Supply'.
    Output should be any one of the above: "Category"
    Complaint: {input}
""")

subcategory_prompt = ChatPromptTemplate.from_template("""
    You are a complaint assistant. Your task is to categorize user complaints into the following sub categories:
    'Billing Issue', 'Blocked Drainage', 'Bribery', 'Chain Snatching', 'Contaminated Water', 'Cyber Crime', 'Fare Overcharging', 'Favoritism in Govt Services', 'Fraud in Public Distribution', 'Irregular Metro Services', 'Land Registration Scam', 'Low Pressure', 'Meter Fault', 'No Water Supply', 'Overcrowded Buses', 'Pipeline Leakage','Poor Bus Condition', 'Potholes', 'Power Outage', 'Road Safety Issues', 'Robbery', 'Theft', 'Unfinished Roadwork', 'Voltage Fluctuation'.
    Output should be any one of the above: "Sub Category"
    Complaint: {input}
""")

chat_bot_prompt = ChatPromptTemplate.from_template(
    '''
You are an internal assistant designed to support department officers in resolving complaints efficiently.
If officer does not mention anything then briefly summarize the complaint and provide a response.
Use the following information to answer all the queries of the officer :
- Department: {department}
- Related Complaint: {complaint}
- Officer query: {context}

Provide a clear, brief summary of the situation. Avoid unnecessary details.

Response:
'''
)



def process_complaint(complaint):
    main_query = query_prompt.invoke({'input': complaint})
    response = llm.invoke(main_query)
    department = response.content
    
    urgency_query = urgency_prompt.invoke({'input': complaint})
    urgent = llm.invoke(urgency_query)
    urgent_content = urgent.content
    
    category_query = category_prompt.invoke({'input': complaint})
    cat = llm.invoke(category_query)
    category = cat.content

    subcategory_query = subcategory_prompt.invoke({'input': complaint})
    subcat = llm.invoke(subcategory_query)
    subcategory = subcat.content
    
    return department, urgent_content, category, subcategory

# Load BLIP model
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")

def generate_caption(image_path):
    image = Image.open(image_path).convert("RGB")
    inputs = processor(image, return_tensors="pt")
    with torch.no_grad():
        out = blip_model.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)
    return caption


# Convert DataFrame to Markdown

# Load all data from Firebase and save as permanent CSV
def fetch_and_save_data():
    docs = db.collection(u"complaints").stream()
    rows = [doc.to_dict() for doc in docs]
    df = pd.DataFrame(rows)
    df.to_csv(CSV_PATH, index=False)
    return df

# Load the main CSV into memory (once)
if not os.path.exists(CSV_PATH):
    print("📥 Downloading data from Firebase...")
    df_main = fetch_and_save_data()
else:
    df_main = pd.read_csv(CSV_PATH)
    print("📂 Loaded local CSV.")

# Filter by department and create LangChain document



nltk.download('vader_lexicon')
sid = SentimentIntensityAnalyzer()

@app.route("/sentiment", methods=["GET", "POST"])
def sentimentRequest():
    output = {}

    # Handle JSON, form, and query parameter inputs
    if request.method == "POST":
        data = request.json or request.form
    else:
        data = request.args

    sentence = data.get("q")

    # Validate input
    if not sentence:
        return jsonify({"error": "No text provided"}), 400

    # Analyze sentiment
    score = sid.polarity_scores(sentence)['compound']
    sentiment = "Positive" if score > 0 else "Negative"
    
    output["sentiment"] = sentiment
    return jsonify(output)

@app.route('/',methods=['GET'])
def home():
    return "Welcome to complaint assistant"

@app.route('/complaint', methods=['POST'])
def handle_complaint():
    data = request.json
    complaint = data.get('complaint')
    
    if not complaint:
        return jsonify({"error": "Complaint text is required"}), 400
    
    department, urgent, category, subcategory = process_complaint(complaint)
    return jsonify({
        "department": department,
        "urgent": urgent,
        "Category": category,
        "Subcategory": subcategory
    })

@app.route('/caption', methods=['POST'])
def handle_image_caption():
    if 'image' not in request.files:
        return jsonify({"error": "Image file is required"}), 400
    
    image_file = request.files['image']
    
    # Ensure tmp directory exists
    tmp_dir = "./tmp"
    os.makedirs(tmp_dir, exist_ok=True)  # Creates the directory if it doesn't exist
    
    image_path = os.path.join(tmp_dir, image_file.filename)
    image_file.save(image_path)

    caption = generate_caption(image_path)
    
    os.remove(image_path)  # Clean up after processing

    response = jsonify({"caption": caption})
    response.headers.add("Access-Control-Allow-Origin", "*")  # Add CORS header here
    return response


@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()

    if data is None:
        return jsonify({"error": "Invalid JSON received"}), 400

    department = data.get('department')
    question = data.get('question')

    if not department or not question:
        return jsonify({"error": "Provide both 'department' and 'question'"}), 400

    try:
        department_df = df_main[df_main['Department'].str.lower() == department.lower()]
        
        if department_df.empty:
            return jsonify({"error": f"No complaints found for department '{department}'"}), 404

        docs = [Document(page_content=row['Complaint']) for idx, row in department_df.iterrows()]

        vectorstore = FAISS.from_documents(
            docs,
            GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        )
        retriever = vectorstore.as_retriever()

        # Manually retrieve relevant documents
        retrieved_docs = retriever.get_relevant_documents(question)
        context = "\n".join([doc.page_content for doc in retrieved_docs]) if retrieved_docs else "No relevant complaints found."

        # You can pick top complaint for "complaint" variable
        top_complaint = retrieved_docs[0].page_content if retrieved_docs else "No matching complaint found."

        # Now manually create a LLMChain with your custom prompt
        chain = LLMChain(
            llm=llm,
            prompt=chat_bot_prompt
        )

        # Run the chain with all needed inputs
        answer = chain.invoke({
            "department": department,
            "complaint": top_complaint,
            "context": context
        })

        return jsonify({"answer": answer["text"]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500






@app.route('/download_csv', methods=['GET'])
def download_csv():
    if not os.path.exists(CSV_PATH):
        return jsonify({"error": "CSV not available"}), 404
    return send_file(CSV_PATH, mimetype='text/csv', as_attachment=True, download_name='complaints.csv')


@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON input
        data = request.get_json()
        
        # Log input data for debugging
        print(f"Received data: {data}")

        # Convert input to DataFrame
        input_data = pd.DataFrame([data])
        
        print(f"Processed input data: {input_data}")
        
        # Ensure required fields exist
        required_features = ["category", "subcategory", "pincode"]
        for feature in required_features:
            if feature not in data:
                return jsonify({"error": f"Missing feature: {feature}"}), 400
            
        # Check available categories and subcategories from encoders
        print(f"Available categories in encoder: {category_encoder.classes_}")
        print(f"Available subcategories in encoder: {subcategory_encoder.classes_}")

        # Convert categorical data to numeric if necessary
        try:
            # Check and print if the category and subcategory exist in the encoder's classes
            if data["category"] not in category_encoder.classes_:
                raise ValueError(f"Category '{data['category']}' not found in encoder classes")
            if data["subcategory"] not in subcategory_encoder.classes_:
                raise ValueError(f"Subcategory '{data['subcategory']}' not found in encoder classes")

            category_num = category_encoder.transform([data["category"]])[0]
            subcategory_num = subcategory_encoder.transform([data["subcategory"]])[0]
        
            pincode_num = pincode_encoder.transform([data["pincode"]])[0]
            

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        
        # Replace original values with encoded ones
        input_data["category"] = category_num
        input_data["subcategory"] = subcategory_num
     
        input_data["pincode"] = pincode_num
        
        # Print the encoded values
        print(f"Category encoded: {category_num}, Subcategory encoded: {subcategory_num}")
        
        # Check if encoding has failed and return an error if so
        if category_num is None or subcategory_num is None  or pincode_num is None:
            return jsonify({"error": "Invalid category, subcategory or pincode"}), 400

        # Prepare the model input
        model_input = [[category_num, subcategory_num, int(data["pincode"])]]

        # Print the model input data for debugging
        print(f"Model input data: {model_input}")

        # Predict resolution time
        prediction = model.predict(np.array(input_data))[0]  
        
        predicted_days = math.ceil(prediction)  # Always rounds up
        print(f"Predicted resolution time: {predicted_days} days")

        return jsonify({"predicted_resolution_time": f"{predicted_days} days"})


    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/hotspots', methods=['GET'])
def get_hotspots():
    return jsonify(hotspots.to_dict(orient="records"))

@app.route('/hotspots/plot', methods=['GET'])
def plot_hotspots():
    try:
        # Check if the dataset is empty
        if hotspots.empty:
            return jsonify({"error": "No data available for hotspots"}), 400

        # Select top 10 complaint districts
        top_10 = hotspots.head(10)

        # Check if we have valid data
        if top_10.empty:
            return jsonify({"error": "Not enough data for plotting"}), 400

        # Create a bar plot for top 10 complaint districts
        plt.figure(figsize=(10, 5))
        sns.barplot(x=top_10["district"], y=top_10["complaint_count"], palette="coolwarm")
        plt.xticks(rotation=45)
        plt.xlabel("District")
        plt.ylabel("Complaint Count")
        plt.title("Top 10 Complaint Hotspots by District")

        # Save plot to a buffer
        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        plt.close()
        img.seek(0)

        # Convert to base64
        img_base64 = base64.b64encode(img.read()).decode()

        return jsonify({"image": img_base64})

    except Exception as e:
        print(f"Error in plot_hotspots: {str(e)}")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

    # Convert to base64
    # img_base64 = base64.b64encode(img.read()).decode()

    # # Render image directly in HTML
    # return render_template_string(
    #     '<html><body><h1>Top 10 Hotspot Plot</h1><img src="data:image/png;base64,{{img_base64}}"></body></html>',
    #     img_base64=img_base64
    # )

    #  Convert to base64
    # img_base64 = base64.b64encode(img.read()).decode()

    # return jsonify({"image": img_base64})

if __name__ == '__main__':
    app.run(debug=True)
