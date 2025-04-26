from flask import Flask, request, jsonify, send_file
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import os
from langchain.schema import Document
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

# Load API keys
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

# Initialize LLM
llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.1-8b-instant")

# Initialize Firebase
cred = credentials.Certificate("govmadad-firebase-adminsdk-fbsvc-8999227f8b.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Flask App
app = Flask(__name__)

# Global CSV path
CSV_PATH = "complaints.csv"

# Convert DataFrame to Markdown
def df_to_markdown(df):
    return df.to_markdown(index=False)

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
def create_department_doc(df, department):
    if 'Department' not in df.columns:
        return None
    filtered_df = df[df['Department'] == department]
    if filtered_df.empty:
        return None
    return Document(page_content=df_to_markdown(filtered_df), metadata={"department": department})

# Create QA chain
def get_qa_chain(doc):
    vectorstore = FAISS.from_documents([doc], GoogleGenerativeAIEmbeddings(model="models/embedding-001"))
    retriever = vectorstore.as_retriever()
    return RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

@app.route('/', methods=['GET', 'POST'])
def home_page():
    return "Welcome to the Department FAQ API! Use the '/ask' endpoint to ask questions."

@app.route('/ask', methods=['POST'])
def ask():
    data = request.json
    department = data.get('department')
    question = data.get('question')

    if not department or not question:
        return jsonify({"error": "Provide both 'department' and 'question'"}), 400

    try:
        doc = create_department_doc(df_main, department)
        if not doc:
            return jsonify({"error": f"No data found for department '{department}'"}), 404

        qa = get_qa_chain(doc)
        answer = qa.run(question)

        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/download_csv', methods=['GET'])
def download_csv():
    if not os.path.exists(CSV_PATH):
        return jsonify({"error": "CSV not available"}), 404
    return send_file(CSV_PATH, mimetype='text/csv', as_attachment=True, download_name='complaints.csv')

if __name__ == '__main__':
    app.run(debug=True)
