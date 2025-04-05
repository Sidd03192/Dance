import cv2
import mediapipe as mp
import pickle
import numpy as np
from mediapipe.framework.formats import landmark_pb2
import math

angleData = {}
LengthData = 0.0

def preprocess_video_landmarks(video_path, output_path):
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

    # Open video
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        print(f"Error: Could not open video file {video_path}")
        return
    
    # Prepare to store landmarks
    all_landmarks = []
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Process each frame
    for _ in range(frame_count):
        success, frame = video.read()
        if not success:
            break
        
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame
        results = pose.process(rgb_frame)
        
        # Store landmarks (or None if no detection)
        if results.pose_landmarks:
            landmark_data = [(lm.x, lm.y, lm.z, lm.visibility) for lm in results.pose_landmarks.landmark]
            all_landmarks.append(landmark_data)
        else:
            all_landmarks.append(None)
    
    # Save landmarks to file
    with open(output_path, 'wb') as f:
        pickle.dump(all_landmarks, f)
    
    print(f"Processed {len(all_landmarks)} frames. Landmarks saved to {output_path}")
    video.release()

def calculate_angle(a, b, c):
    # Calculate the angle at point b given points a, b, and c
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    
    # Calculate dot product
    dot_product = ba[0] * bc[0] + ba[1] * bc[1]
    
    # Calculate magnitudes
    magnitude_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    magnitude_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    
    # Avoid division by zero
    if magnitude_ba * magnitude_bc == 0:
        return 0
    
    # Calculate cosine of angle
    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    
    # Ensure the value is within valid range for arccos
    cosine_angle = max(-1, min(1, cosine_angle))
    
    # Convert to degrees
    angle = math.degrees(math.acos(cosine_angle))
    
    return angle

def calculate_similarity(landmarks1, landmarks2):
    if landmarks1 is None or landmarks2 is None:
        return 0.0
        
    global angleData, LengthData
    
    if len(landmarks1) != len(landmarks2):
        raise ValueError("Landmark lists must have the same length")

    # Define important joint angles to compare
    # Each tuple contains three landmark indices (a, b, c) where b is the vertex
    important_angles = [
        # Right arm angle (shoulder, elbow, wrist)
        (11, 13, 15, "Right Arm"),
        # Left arm angle (shoulder, elbow, wrist)
        (12, 14, 16, "Left Arm"),
        # # Right leg angle (hip, knee, ankle)
        # (23, 25, 27, "Right Leg"),
        # # Left leg angle (hip, knee, ankle)
        # (24, 26, 28, "Left Leg"),
        # # Torso right side (shoulder, hip, knee)
        # (11, 23, 25, "Right Torso"),
        # # Torso left side (shoulder, hip, knee)
        # (12, 24, 26, "Left Torso")
    ]
    
    # Calculate position difference
    position_diffs = []
    for i in range(len(landmarks1)):
        # Only consider landmarks we can see
        if landmarks1[i][3] > 0.5 and landmarks2[i][3] > 0.5:
            x1, y1, z1, _ = landmarks1[i]
            x2, y2, z2, _ = landmarks2[i]
            distance = ((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)**0.5
            position_diffs.append(distance)
    
    # Reset angle data dictionary
    angleData = {}
    
    # Calculate angle differences
    angle_diffs = []
    for a_idx, b_idx, c_idx, angle_name in important_angles:
        # Check if landmarks are available and visible
        if (landmarks1[a_idx][3] > 0.5 and landmarks1[b_idx][3] > 0.5 and landmarks1[c_idx][3] > 0.5 and
            landmarks2[a_idx][3] > 0.5 and landmarks2[b_idx][3] > 0.5 and landmarks2[c_idx][3] > 0.5):
            
            # Get coordinates for first set
            a1 = (landmarks1[a_idx][0], landmarks1[a_idx][1])
            b1 = (landmarks1[b_idx][0], landmarks1[b_idx][1])
            c1 = (landmarks1[c_idx][0], landmarks1[c_idx][1])
            
            # Get coordinates for second set
            a2 = (landmarks2[a_idx][0], landmarks2[a_idx][1])
            b2 = (landmarks2[b_idx][0], landmarks2[b_idx][1])
            c2 = (landmarks2[c_idx][0], landmarks2[c_idx][1])
            
            # Calculate angles
            angle1 = calculate_angle(a1, b1, c1)
            angle2 = calculate_angle(a2, b2, c2)
            
            # Store angle data for debugging
            angleData[angle_name] = {
                "video": angle1,
                "webcam": angle2,
                "diff": abs(angle1 - angle2)
            }
            
            # Calculate angle difference directly (absolute difference)
            angle_diff = abs(angle1 - angle2)
            
            # Convert to similarity score (180° difference = 0% similar, 0° difference = 100% similar)
            angle_similarity = 1.0 - (angle_diff / 180.0)
            angle_diffs.append(angle_similarity)
    
    # Combine position and angle metrics
    if position_diffs and angle_diffs:
        avg_position_diff = sum(position_diffs) / len(position_diffs)
        avg_angle_similarity = sum(angle_diffs) / len(angle_diffs)
        
        # Position similarity - exponential decay based on difference
        position_similarity = np.exp(-5 * avg_position_diff**2)
        LengthData = position_similarity
        
        # Weight the two scores (angle is more important for motion comparison)
        final_similarity = 0.3 * position_similarity + 0.7 * avg_angle_similarity
        
        # Debug prints
        print(f"Position similarity: {position_similarity:.4f}")
        print(f"Angle similarity: {avg_angle_similarity:.4f}")
        print(f"Final similarity score: {final_similarity:.4f}")
        
        return final_similarity
    return 0.0  # Return zero if no valid measurements


def display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path):
    # Load preprocessed landmarks
    with open(landmarks_path, 'rb') as f:
        all_landmarks = pickle.load(f)
    
    # Initialize video and webcam capture
    video = cv2.VideoCapture(video_path)
    webcam = cv2.VideoCapture(0)  # Open the webcam
    
    # Initialize MediaPipe Pose and drawing utilities
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    
    # Prepare frame counter
    current_frame = 0
    
    # Important angles to monitor
    important_angles = [
        (11, 13, 15, "Right Arm"),
        (12, 14, 16, "Left Arm"),
        (23, 25, 27, "Right Leg"),
        (24, 26, 28, "Left Leg"),
        (11, 23, 25, "Right Torso"),
        (12, 24, 26, "Left Torso")
    ]
    
    # For similarity smoothing
    similarity_history = []
    max_history = 3  # Number of frames to average
    
    while True:
        # Read frames from video and webcam
        success_video, frame_video = video.read()
        success_webcam, frame_webcam = webcam.read()
        frame_webcam = cv2.flip(frame_webcam, 1)  # Mirror for more intuitive experience

        if not success_video or not success_webcam:
            break
        
        # Get corresponding landmarks for video
        frame_landmarks = all_landmarks[current_frame] 
        
        # Draw preprocessed landmarks on video frame
        if frame_landmarks is not None:
            landmark_list = landmark_pb2.NormalizedLandmarkList(
                landmark=[
                    landmark_pb2.NormalizedLandmark(
                        x=x, y=y, z=z, visibility=visibility
                    )
                    for x, y, z, visibility in frame_landmarks
                ]
            )
            mp_drawing.draw_landmarks(
                frame_video, 
                landmark_list, 
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
            # Display angles on video frame
            y_offset = 30
            for a_idx, b_idx, c_idx, angle_name in important_angles:
                if (frame_landmarks[a_idx][3] > 0.5 and 
                    frame_landmarks[b_idx][3] > 0.5 and 
                    frame_landmarks[c_idx][3] > 0.5):
                    
                    # Get coordinates from video landmarks
                    a = (frame_landmarks[a_idx][0], frame_landmarks[a_idx][1])
                    b = (frame_landmarks[b_idx][0], frame_landmarks[b_idx][1])
                    c = (frame_landmarks[c_idx][0], frame_landmarks[c_idx][1])
                    
                    # Calculate angle
                    angle = calculate_angle(a, b, c)
                    
                    # Display angle on video frame
                    cv2.putText(frame_video, f"{angle_name}: {angle:.1f}°", 
                                (10, y_offset),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 1, cv2.LINE_AA)
                    y_offset += 25
        
        # Process webcam frame for landmarks
        rgb_frame_webcam = cv2.cvtColor(frame_webcam, cv2.COLOR_BGR2RGB)
        results_webcam = pose.process(rgb_frame_webcam)
        
        # Extract webcam landmarks for comparison
        if results_webcam.pose_landmarks and frame_landmarks is not None:
            webcam_landmarks = [
                (lm.x, lm.y, lm.z, lm.visibility)
                for lm in results_webcam.pose_landmarks.landmark
            ]
            
            # Compute similarity
            similarity = calculate_similarity(frame_landmarks, webcam_landmarks)
            
            # Add to history and compute average
            similarity_history.append(similarity)
            if len(similarity_history) > max_history:
                similarity_history.pop(0)
                
            avg_similarity = sum(similarity_history) / len(similarity_history)
            
            # Display similarity score on both feeds
            cv2.putText(frame_webcam, f"Similarity: {avg_similarity:.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(frame_video, f"Similarity: {avg_similarity:.2f}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            
            cv2.putText(frame_webcam, f"Position: {LengthData:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(frame_video, f"Position: {LengthData:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            
            # Display individual angle comparisons on both feeds
            y_offset = 90
            for angle_name, data in angleData.items():
                text = f"{angle_name}: V:{data['video']:.1f}° W:{data['webcam']:.1f}° D:{data['diff']:.1f}°"
                # Color code based on similarity (green for similar, red for different)
                color = (0, 255, 0) if data['diff'] < 20 else (0, 165, 255) if data['diff'] < 45 else (0, 0, 255)
                
                # Add to webcam feed
                cv2.putText(frame_webcam, text, (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)
                # Add to video feed
                cv2.putText(frame_video, text, (10, y_offset),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 1, cv2.LINE_AA)
                            
                y_offset += 25
            
            # Draw landmarks on webcam frame
            mp_drawing.draw_landmarks(
                frame_webcam,
                results_webcam.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        else:
            cv2.putText(frame_webcam, "No pose detected", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
        
        # Display both frames
        cv2.imshow('Preprocessed Pose (Video)', frame_video)
        cv2.imshow('Live Webcam Pose', frame_webcam)
        
        # Break on 'q' key
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break
        
        # Increment frame counter
        current_frame += 1
        if current_frame >= len(all_landmarks):
            current_frame = 0
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)

# Example usage
video_path = "./sid.mp4"
landmarks_path = "./ok.pkl"

# Step 1: Preprocess landmarks (run once)
preprocess_video_landmarks(video_path, landmarks_path)

# Step 2: Compare live feed with recorded video
display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path)