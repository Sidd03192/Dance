from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os, uuid
from hello import preprocess_and_annotate_video  # Ensure hello.py exports this function

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_video():
    # Check if a video file was provided
    if 'video' not in request.files:
        return jsonify({"error": "No video uploaded"}), 400

    video_file = request.files['video']
    
    # Save the uploaded file (using a unique name)
    video_filename = f"{uuid.uuid4()}.webm"
    video_path = os.path.join(UPLOAD_FOLDER, video_filename)
    video_file.save(video_path)

    # Define output paths for the annotated (processed) video and landmark data.
    # For testing purposes you can use unique names, or a constant name if you prefer.
    annotated_video_filename = f"{uuid.uuid4()}.mp4"
    output_video_path = os.path.join(UPLOAD_FOLDER, annotated_video_filename)
    landmark_filename = f"{uuid.uuid4()}.pkl"
    landmark_path = os.path.join(UPLOAD_FOLDER, landmark_filename)

    try:
        preprocess_and_annotate_video(video_path, output_video_path, landmark_path)
    except Exception as e:
        return jsonify({"error": f"Preprocessing failed: {str(e)}"}), 500

    # Return publicly accessible URLs.
    # Adjust "localhost:5000" as needed if your server domain or port is different.
    response_data = {
        "message": "Video processed successfully",
        "video_url": f"http://localhost:5000/uploads/{annotated_video_filename}",
        "landmark_url": f"http://localhost:5000/uploads/{landmark_filename}"
    }
    return jsonify(response_data), 200

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)
