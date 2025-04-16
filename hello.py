import cv2
import mediapipe as mp
import pickle
import numpy as np
from mediapipe.framework.formats import landmark_pb2
import math

angleData = {}
LengthData = 0.0

import cv2
import mediapipe as mp
import pickle
import numpy as np
import math
from mediapipe.framework.formats import landmark_pb2

def compute_body_scale(landmarks):
    # Compute a normalization factor using the distance between shoulders (landmarks 11 and 12)
    if landmarks is None or len(landmarks) <= 12:
        return 1.0
    if landmarks[11][3] > 0.5 and landmarks[12][3] > 0.5:
        dx = landmarks[11][0] - landmarks[12][0]
        dy = landmarks[11][1] - landmarks[12][1]
        scale = math.sqrt(dx**2 + dy**2)
        if scale == 0:
            return 1.0
        return scale
    return 1.0

def preprocess_and_annotate_video(video_path, output_video_path, landmark_output_path):
    mp_pose = mp.solutions.pose
    # Use full complexity for offline processing (adjust if needed)
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles

    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        raise ValueError(f"Could not open video file {video_path}")

    # Get video properties
    width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = video.get(cv2.CAP_PROP_FPS)
    
    # Set up VideoWriter for output annotated video (.mp4)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_video = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
    
    all_landmarks = []

    while True:
        ret, frame = video.read()
        if not ret:
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)
        
        if results.pose_landmarks:
            landmark_data = [(lm.x, lm.y, lm.z, lm.visibility) for lm in results.pose_landmarks.landmark]
            all_landmarks.append(landmark_data)
            # Draw landmarks on the frame
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        else:
            all_landmarks.append(None)
        
        out_video.write(frame)

    video.release()
    out_video.release()

    with open(landmark_output_path, 'wb') as f:
        pickle.dump(all_landmarks, f)

    print(f"Processed video and saved annotated output to {output_video_path}")
    print(f"Landmarks saved to {landmark_output_path}")

def calculate_angle(a, b, c):
    # Calculate the angle at point b given points a, b, and c
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot_product = ba[0] * bc[0] + ba[1] * bc[1]
    magnitude_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    magnitude_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if magnitude_ba * magnitude_bc == 0:
        return 0
    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    cosine_angle = max(-1, min(1, cosine_angle))
    angle = math.degrees(math.acos(cosine_angle))
    return angle

def calculate_similarity(landmarks1, landmarks2):
    if landmarks1 is None or landmarks2 is None:
        return 0.0
        
    global angleData, LengthData
    
    if len(landmarks1) != len(landmarks2):
        raise ValueError("Landmark lists must have the same length")
    
    # IMPORTANT ANGLES:
    # Compute elbow angles and shoulder angles (angle between arm and torso)
    # For elbows: (11, 13, 15) for left (with vertex at 13) and (12, 14, 16) for right (vertex 14)
    # For shoulders: (13, 11, 23) for left shoulder (vertex at 11) and (14, 12, 24) for right shoulder (vertex at 12)
    important_angles = [
        (11, 13, 15, "Left Elbow"),
        (12, 14, 16, "Right Elbow"),
        (13, 11, 23, "Left Shoulder"),
        (14, 12, 24, "Right Shoulder")
    ]
    
    # Compute body scales for normalization
    scale1 = compute_body_scale(landmarks1)
    scale2 = compute_body_scale(landmarks2)
    avg_scale = (scale1 + scale2) / 2.0
    
    # Calculate normalized position difference
    position_diffs = []
    for i in range(len(landmarks1)):
        if landmarks1[i][3] > 0.5 and landmarks2[i][3] > 0.5:
            x1, y1, z1, _ = landmarks1[i]
            x2, y2, z2, _ = landmarks2[i]
            distance = math.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)
            normalized_distance = distance / avg_scale
            position_diffs.append(normalized_distance)
    
    angleData = {}
    angle_diffs = []
    for a_idx, b_idx, c_idx, angle_name in important_angles:
        if (landmarks1[a_idx][3] > 0.5 and landmarks1[b_idx][3] > 0.5 and landmarks1[c_idx][3] > 0.5 and
            landmarks2[a_idx][3] > 0.5 and landmarks2[b_idx][3] > 0.5 and landmarks2[c_idx][3] > 0.5):
            
            a1 = (landmarks1[a_idx][0], landmarks1[a_idx][1])
            b1 = (landmarks1[b_idx][0], landmarks1[b_idx][1])
            c1 = (landmarks1[c_idx][0], landmarks1[c_idx][1])
            
            a2 = (landmarks2[a_idx][0], landmarks2[a_idx][1])
            b2 = (landmarks2[b_idx][0], landmarks2[b_idx][1])
            c2 = (landmarks2[c_idx][0], landmarks2[c_idx][1])
            
            angle1 = calculate_angle(a1, b1, c1)
            angle2 = calculate_angle(a2, b2, c2)
            
            angleData[angle_name] = {
                "video": angle1,
                "webcam": angle2,
                "diff": abs(angle1 - angle2)
            }
            angle_diff = abs(angle1 - angle2)
            angle_similarity = 1.0 - (angle_diff / 180.0)
            angle_diffs.append(angle_similarity)
    
    if position_diffs and angle_diffs:
        avg_position_diff = sum(position_diffs) / len(position_diffs)
        avg_angle_similarity = sum(angle_diffs) / len(angle_diffs)
        
        position_similarity = np.exp(-5 * avg_position_diff**2)
        LengthData = position_similarity
        
        # Give more weight to angles now: 20% position, 80% angle
        final_similarity = 0.2 * position_similarity + 0.8 * avg_angle_similarity
        
        print(f"Normalized avg position diff: {avg_position_diff:.4f}")
        print(f"Position similarity: {position_similarity:.4f}")
        print(f"Angle similarity: {avg_angle_similarity:.4f}")
        print(f"Final similarity score: {final_similarity:.4f}")
        
        return final_similarity
    return 0.0

# Helper function to resize frame to a fixed height while preserving aspect ratio
def resize_to_height(frame, desired_height):
    h, w = frame.shape[:2]
    scale = desired_height / h
    new_w = int(w * scale)
    return cv2.resize(frame, (new_w, desired_height))

def display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path):
    with open(landmarks_path, 'rb') as f:
        all_landmarks = pickle.load(f)
    
    video = cv2.VideoCapture(video_path)
    webcam = cv2.VideoCapture(0)
    webcam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    webcam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(model_complexity=0, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    
    current_frame = 0
    similarity_history = []
    max_history = 3
    comparison_data = []
    
    desired_height = 720
    
    while True:
        success_video, frame_video = video.read()
        success_webcam, frame_webcam = webcam.read()
        if not success_video or not success_webcam:
            break
        
        frame_video = resize_to_height(frame_video, desired_height)
        frame_webcam = resize_to_height(frame_webcam, desired_height)
        
        # Mirror the preprocessed video frame
        frame_video = cv2.flip(frame_video, 1)
        # Mirror webcam frame as well
        frame_webcam = cv2.flip(frame_webcam, 1)
        
        frame_landmarks = all_landmarks[current_frame]
        mirrored_landmarks = None
        if frame_landmarks is not None:
            mirrored_landmarks = [(1.0 - x, y, z, visibility) for (x, y, z, visibility) in frame_landmarks]
        
        if mirrored_landmarks is not None:
            landmark_list = landmark_pb2.NormalizedLandmarkList(
                landmark=[
                    landmark_pb2.NormalizedLandmark(
                        x=x, y=y, z=z, visibility=visibility
                    )
                    for x, y, z, visibility in mirrored_landmarks
                ]
            )
            mp_drawing.draw_landmarks(
                frame_video, 
                landmark_list, 
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
            y_offset = 30
            for a_idx, b_idx, c_idx, angle_name in [
                (11, 13, 15, "Left Elbow"),
                (12, 14, 16, "Right Elbow"),
                (13, 11, 23, "Left Shoulder"),
                (14, 12, 24, "Right Shoulder")
            ]:
                if (mirrored_landmarks[a_idx][3] > 0.5 and
                    mirrored_landmarks[b_idx][3] > 0.5 and
                    mirrored_landmarks[c_idx][3] > 0.5):
                    
                    a = (mirrored_landmarks[a_idx][0], mirrored_landmarks[a_idx][1])
                    b = (mirrored_landmarks[b_idx][0], mirrored_landmarks[b_idx][1])
                    c = (mirrored_landmarks[c_idx][0], mirrored_landmarks[c_idx][1])
                    
                    angle = calculate_angle(a, b, c)
                    
                    cv2.putText(frame_video, f"{angle_name}: {angle:.1f}°", 
                                (10, y_offset),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 1, cv2.LINE_AA)
                    y_offset += 25
        
        rgb_frame_webcam = cv2.cvtColor(frame_webcam, cv2.COLOR_BGR2RGB)
        results_webcam = pose.process(rgb_frame_webcam)
        
        if results_webcam.pose_landmarks and frame_landmarks is not None:
            webcam_landmarks = [
                (lm.x, lm.y, lm.z, lm.visibility)
                for lm in results_webcam.pose_landmarks.landmark
            ]
            
            similarity = calculate_similarity(mirrored_landmarks, webcam_landmarks)
            similarity_history.append(similarity)
            if len(similarity_history) > max_history:
                similarity_history.pop(0)
                
            avg_similarity = sum(similarity_history) / len(similarity_history)
            
            frame_comparison = {
                "frame_index": current_frame,
                "raw_similarity": similarity,
                "avg_similarity": avg_similarity,
                "similarity_history": similarity_history.copy(),
                "LengthData": LengthData,
                "angleData": angleData.copy()
            }
            comparison_data.append(frame_comparison)
            
            cv2.putText(frame_webcam, f"Similarity: {avg_similarity:.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(frame_video, f"Similarity: {avg_similarity:.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            
            cv2.putText(frame_webcam, f"Position: {LengthData:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(frame_video, f"Position: {LengthData:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            
            y_offset = 90
            for angle_name, data in angleData.items():
                text = f"{angle_name}: V:{data['video']:.1f}° W:{data['webcam']:.1f}° D:{data['diff']:.1f}°"
                color = (0, 255, 0) if data['diff'] < 20 else (0, 165, 255) if data['diff'] < 45 else (0, 0, 255)
                cv2.putText(frame_webcam, text, (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)
                cv2.putText(frame_video, text, (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)
                y_offset += 25
            
            mp_drawing.draw_landmarks(
                frame_webcam,
                results_webcam.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        else:
            cv2.putText(frame_webcam, "No pose detected", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
        
        # Combine the two frames side-by-side
        combined_frame = np.hstack((frame_video, frame_webcam))
        
        # Determine feedback based on avg_similarity:
        # If avg_similarity >= 0.8, "Great"; if >=0.5, "Acceptable"; else, "Wrong"
        if avg_similarity >= 0.8:
            feedback = "Great"
        elif avg_similarity >= 0.5:
            feedback = "Acceptable"
        else:
            feedback = "Wrong"
        
        # Put feedback text at the top center of the combined frame
        text_size, _ = cv2.getTextSize(feedback, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
        text_x = (combined_frame.shape[1] - text_size[0]) // 2
        cv2.putText(combined_frame, feedback, (text_x, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2, cv2.LINE_AA)
        
        cv2.imshow('Comparison', combined_frame)
        
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break
        
        current_frame += 1
        if current_frame >= len(all_landmarks):
            current_frame = 0
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    with open("comparison_data.pkl", "wb") as f:
        pickle.dump(comparison_data, f)
    print("Saved comparison data to 'comparison_data.pkl'")

if __name__ == "__main__":
    video_path = "./sid.mp4"
    landmarks_path = "./ok.pkl"
    preprocess_and_annotate_video(video_path, "annotated_video.mp4", landmarks_path)
    display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path)
