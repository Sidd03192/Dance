import os
import uuid
import pickle
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.framework.formats import landmark_pb2
from flask import (
    Flask, request, jsonify, url_for,
    send_file, abort, Response
)
from flask_cors import CORS

from hello import (
    preprocess_and_annotate_video,
    calculate_similarity,
    calculate_angle,
    generate_feedback,
    draw_colored_skeleton,
    resize_to_height,
    angleData,
    LengthData,
    draw_lines
)

app = Flask(__name__)
CORS(app)

# Directories for uploads and processed videos
UPLOAD_FOLDER    = os.path.join(app.root_path, "uploads")
PROCESSED_FOLDER = os.path.join(app.root_path, "static", "processed")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# --- Upload endpoint ---
@app.route("/upload", methods=["POST"])
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "No video provided"}), 400
    f = request.files["video"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400

    # Generate unique filenames
    ext      = os.path.splitext(f.filename)[1]
    uid      = uuid.uuid4().hex
    in_name  = f"{uid}{ext}"
    out_name = f"{uid}_annotated{ext}"
    lm_name  = f"{uid}.pkl"

    in_path  = os.path.join(UPLOAD_FOLDER,    in_name)
    out_path = os.path.join(PROCESSED_FOLDER, out_name)
    lm_path  = os.path.join(UPLOAD_FOLDER,    lm_name)

    # Save uploaded file
    f.save(in_path)

    # Process and annotate
    webm_path = preprocess_and_annotate_video(in_path, out_path, lm_path)
    webm_name = os.path.basename(webm_path)

    # Return processed URL and raw/landmark filenames
    return jsonify({
        "video_url":           url_for("processed_video", filename=webm_name, _external=True),
        "raw_filename":        in_name,
        "landmarks_filename":  lm_name
    })

# --- Serve processed video ---
@app.route("/processed/<path:filename>")
def processed_video(filename):
    full = os.path.join(PROCESSED_FOLDER, filename)
    if not os.path.isfile(full):
        abort(404)
    mimetype = "video/webm" if filename.lower().endswith(".webm") else "video/mp4"
    return send_file(full, mimetype=mimetype, conditional=True)

# --- Simple live webcam stream with draw_lines ---
mp_pose    = mp.solutions.pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils

def generate_frames():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not start camera.")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = mp_pose.process(rgb)

        if results.pose_landmarks:
            draw_lines(frame, results.pose_landmarks)
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp.solutions.pose.POSE_CONNECTIONS
            )

        success, buf = cv2.imencode('.jpg', frame)
        if not success:
            continue
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n'
        )

@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

# --- Full comparison stream combining reference + live ---
def generate_comparison_frames(video_path, landmarks_path):
    with open(landmarks_path, 'rb') as f:
        all_lm = pickle.load(f)

    vid = cv2.VideoCapture(video_path)
    cam = cv2.VideoCapture(0)
    pose = mp.solutions.pose.Pose(
        model_complexity=0,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    mp_drawing = mp.solutions.drawing_utils

    history = []
    idx     = 0

    while True:
        ok1, fv = vid.read()
        ok2, fc = cam.read()
        if not ok1 or not ok2:
            break

        # Reference side
        fv = cv2.flip(fv, 1)
        fv = resize_to_height(fv, 480)
        raw = all_lm[idx]
        ref_list = None
        if raw:
            mirrored = [(1-x,y,z,v) for x,y,z,v in raw]
            ref_list = landmark_pb2.NormalizedLandmarkList(
                landmark=[
                    landmark_pb2.NormalizedLandmark(x=x, y=y, z=z, visibility=v)
                    for x,y,z,v in mirrored
                ]
            )

        # Live webcam side
        fc   = cv2.flip(fc, 1)
        res2 = pose.process(cv2.cvtColor(fc, cv2.COLOR_BGR2RGB))

        # Similarity calculation
        if res2.pose_landmarks and ref_list:
            cam_raw = [(p.x,p.y,p.z,p.visibility) for p in res2.pose_landmarks.landmark]
            ref_raw = [(p.x,p.y,p.z,p.visibility) for p in ref_list.landmark]
            s = calculate_similarity(ref_raw, cam_raw)
            history.append(s)
            if len(history) > 3: history.pop(0)
            avg = sum(history) / len(history)
        else:
            avg = 0.0

        # Draw skeletons on both
        if ref_list:
            draw_colored_skeleton(fv, ref_list, avg)
        if res2.pose_landmarks:
            draw_colored_skeleton(fc, res2.pose_landmarks, avg)

        # Overlay angles on reference side
        if ref_list:
            y_off = 30
            for a,b,c,name in [
                (11,13,15,"Left Elbow"),
                (12,14,16,"Right Elbow"),
                (13,11,23,"Left Shoulder"),
                (14,12,24,"Right Shoulder")
            ]:
                lm = ref_list.landmark
                if lm[a].visibility>0.5 and lm[b].visibility>0.5 and lm[c].visibility>0.5:
                    ang = calculate_angle(
                        (lm[a].x, lm[a].y),
                        (lm[b].x, lm[b].y),
                        (lm[c].x, lm[c].y)
                    )
                    cv2.putText(
                        fv,
                        f"{name}: {ang:.1f}°",
                        (10, y_off),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (255,0,0),
                        1
                    )
                    y_off += 25

        # Live stats on webcam side
        if res2.pose_landmarks and ref_list:
            cv2.putText(
                fc, f"Sim: {avg:.2f}", (10,30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2
            )
            cv2.putText(
                fc, f"Pos: {LengthData:.2f}", (10,60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2
            )
            mp_drawing.draw_landmarks(
                fc,
                res2.pose_landmarks,
                mp.solutions.pose.POSE_CONNECTIONS
            )

        # Combine both frames side-by-side
        combined = np.hstack((fv, fc))
        fb = "Great" if avg >= 0.8 else ("Acceptable" if avg >= 0.5 else "Wrong")
        ts, _ = cv2.getTextSize(fb, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
        x = (combined.shape[1] - ts[0]) // 2
        cv2.putText(
            combined,
            fb,
            (x, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (0,0,255),
            2
        )

        # Textual feedback below
        for i, msg in enumerate(generate_feedback(angleData, LengthData)):
            cv2.putText(
                combined,
                msg,
                (10, combined.shape[0] - 100 + 30*i),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255,255,0),
                2
            )

        # Encode as JPEG for MJPEG
        ret, buf = cv2.imencode('.jpg', combined)
        if not ret:
            continue
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n'
        )

        idx = (idx + 1) % len(all_lm)

@app.route("/compare_feed")
def compare_feed():
    video     = request.args.get("video")
    landmarks = request.args.get("landmarks")
    if not video or not landmarks:
        abort(400, "Provide ?video=... & landmarks=...")
    vp = os.path.join(UPLOAD_FOLDER,    video)
    lp = os.path.join(UPLOAD_FOLDER,    landmarks)
    if not os.path.isfile(vp) or not os.path.isfile(lp):
        abort(404)
    return Response(
        generate_comparison_frames(vp, lp),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
