import cv2
import mediapipe as mp
import pickle
import numpy as np
from mediapipe.framework.formats import landmark_pb2

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
    """
    Calculate the angle between three points in 3D space.
    Points are landmark tuples (x, y, z, visibility).
    Returns angle in degrees.
    """
    # Extract coordinates
    a = np.array(a[:3])  # Just use x, y, z
    b = np.array(b[:3])
    c = np.array(c[:3])
    
    # Calculate vectors
    ba = a - b
    bc = c - b
    
    # Calculate dot product
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    # Handle numerical errors
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    # Calculate angle in degrees
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle

def get_key_angles(landmarks):
    """
    Calculate key angles from the pose landmarks
    Returns a dictionary of angle name to angle value
    """
    if landmarks is None:
        return None
    
    angles = {}
    
    # Define the joint triplets for important angles
    angle_definitions = {
        "right_elbow": (11, 13, 15),  # right shoulder, elbow, wrist
        "left_elbow": (12, 14, 16),   # left shoulder, elbow, wrist
        "right_shoulder": (13, 11, 23),  # right elbow, shoulder, hip
        "left_shoulder": (14, 12, 24),   # left elbow, shoulder, hip
        "right_hip": (11, 23, 25),       # right shoulder, hip, knee
        "left_hip": (12, 24, 26),        # left shoulder, hip, knee
        "right_knee": (23, 25, 27),      # right hip, knee, ankle
        "left_knee": (24, 26, 28),       # left hip, knee, ankle
        "neck": (11, 0, 12)              # right shoulder, nose, left shoulder
    }
    
    # Calculate angles
    for angle_name, (point_a, point_b, point_c) in angle_definitions.items():
        # Check if all points are within range and have good visibility
        if (all(idx < len(landmarks) for idx in [point_a, point_b, point_c]) and
            all(landmarks[idx][3] > 0.5 for idx in [point_a, point_b, point_c])):
            
            angle = calculate_angle(
                landmarks[point_a], 
                landmarks[point_b], 
                landmarks[point_c]
            )
            angles[angle_name] = angle
    
    return angles

def normalize_pose(landmarks):
    """
    Normalize pose landmarks to make them scale and position invariant
    by centering and scaling based on torso size
    """
    if landmarks is None:
        return None
    
    # Find hip midpoint (center of the body)
    left_hip = landmarks[23][:3]  # x, y, z without visibility
    right_hip = landmarks[24][:3]
    hip_center = [(left_hip[i] + right_hip[i]) / 2 for i in range(3)]
    
    # Find shoulder midpoint
    left_shoulder = landmarks[11][:3]
    right_shoulder = landmarks[12][:3]
    shoulder_center = [(left_shoulder[i] + right_shoulder[i]) / 2 for i in range(3)]
    
    # Calculate torso size (distance between hip center and shoulder center)
    torso_size = np.sqrt(sum((shoulder_center[i] - hip_center[i])**2 for i in range(3)))
    
    if torso_size < 0.01:  # Avoid division by zero
        return landmarks
    
    # Normalize landmarks
    normalized_landmarks = []
    for lm in landmarks:
        x, y, z, visibility = lm
        # Center around hip
        nx = (x - hip_center[0]) / torso_size
        ny = (y - hip_center[1]) / torso_size
        nz = (z - hip_center[2]) / torso_size
        normalized_landmarks.append((nx, ny, nz, visibility))
    
    return normalized_landmarks

def calculate_position_similarity(landmarks1, landmarks2):
    """
    Calculate similarity between two sets of pose landmarks
    using weighted Euclidean distance and considering landmark visibility.
    """
    if landmarks1 is None or landmarks2 is None:
        return 0.0
    
    if len(landmarks1) != len(landmarks2):
        print(f"Warning: Landmark lists have different lengths: {len(landmarks1)} vs {len(landmarks2)}")
        return 0.0

    # Key pose landmarks (indices in MediaPipe Pose)
    # Focus on important joints for movement comparison
    key_points = [
        11, 12,  # shoulders
        13, 14,  # elbows
        15, 16,  # wrists
        23, 24,  # hips
        25, 26,  # knees
        27, 28   # ankles
    ]
    
    # Weights for different body parts (giving more importance to limbs)
    weights = {
        11: 1.0, 12: 1.0,  # shoulders
        13: 1.2, 14: 1.2,  # elbows
        15: 1.5, 16: 1.5,  # wrists
        23: 1.0, 24: 1.0,  # hips
        25: 1.2, 26: 1.2,  # knees
        27: 1.5, 28: 1.5   # ankles
    }
    
    total_weighted_distance = 0
    valid_points = 0
    
    for idx in key_points:
        if idx >= len(landmarks1) or idx >= len(landmarks2):
            continue
            
        lm1 = landmarks1[idx]
        lm2 = landmarks2[idx]
        
        # Only compare points with good visibility
        vis1 = lm1[3]
        vis2 = lm2[3]
        
        if vis1 > 0.7 and vis2 > 0.7:  # Both points must be clearly visible
            x1, y1, z1, _ = lm1
            x2, y2, z2, _ = lm2
            
            # Calculate 3D distance
            distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)
            
            # Apply weight
            weight = weights.get(idx, 1.0)
            total_weighted_distance += distance * weight
            valid_points += 1
    
    if valid_points == 0:
        return 0.0  # No valid comparison points
    
    average_distance = total_weighted_distance / valid_points
    
    # Convert distance to similarity score
    # Using an exponential function for better differentiation
    similarity_score = np.exp(-5 * average_distance)
    
    # Ensure score is between 0 and 1
    similarity_score = max(0, min(1, similarity_score))
    
    return similarity_score

def calculate_angle_similarity(angles1, angles2):
    """
    Calculate similarity between two sets of angles
    """
    if angles1 is None or angles2 is None or len(angles1) == 0 or len(angles2) == 0:
        return 0.0
    
    # Find common angles
    common_angles = set(angles1.keys()).intersection(set(angles2.keys()))
    
    if len(common_angles) == 0:
        return 0.0
    
    # Weights for different angles
    angle_weights = {
        "right_elbow": 1.5,
        "left_elbow": 1.5,
        "right_shoulder": 1.8,
        "left_shoulder": 1.8,
        "right_hip": 1.2,
        "left_hip": 1.2,
        "right_knee": 1.4,
        "left_knee": 1.4,
        "neck": 1.0
    }
    
    total_difference = 0
    total_weight = 0
    
    for angle_name in common_angles:
        angle1 = angles1[angle_name]
        angle2 = angles2[angle_name]
        
        # Calculate angular difference (considering that angles can wrap around)
        difference = min(abs(angle1 - angle2), 360 - abs(angle1 - angle2))
        
        # Apply weight
        weight = angle_weights.get(angle_name, 1.0)
        total_difference += difference * weight
        total_weight += weight
    
    if total_weight == 0:
        return 0.0
    
    average_difference = total_difference / total_weight
    
    # Convert difference to similarity score
    # Max difference of 180 degrees means complete mismatch
    # Using exponential to emphasize small differences
    similarity_score = np.exp(-0.03 * average_difference)
    
    return similarity_score

def calculate_combined_similarity(landmarks1, landmarks2):
    """
    Calculate combined similarity using both position and angle metrics
    """
    # Get normalized landmarks
    norm_landmarks1 = normalize_pose(landmarks1)
    norm_landmarks2 = normalize_pose(landmarks2)
    
    if norm_landmarks1 is None or norm_landmarks2 is None:
        return 0.0
    
    # Calculate position-based similarity
    position_similarity = calculate_position_similarity(norm_landmarks1, norm_landmarks2)
    
    # Calculate angles
    angles1 = get_key_angles(norm_landmarks1)
    angles2 = get_key_angles(norm_landmarks2)
    
    # Calculate angle-based similarity
    angle_similarity = calculate_angle_similarity(angles1, angles2)
    
    # Combine the two metrics
    # Give more weight to angles since they're more important for pose matching
    combined_similarity = 0.4 * position_similarity + 0.6 * angle_similarity
    
    return combined_similarity

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
    
    # For smoothing the similarity score
    similarity_history = []
    
    # For tracking angle display
    show_angles = False
    
    while True:
        # Read frames from video and webcam
        success_video, frame_video = video.read()
        success_webcam, frame_webcam = webcam.read()
        
        if not success_video or not success_webcam:
            break
        
        # Flip webcam horizontally for mirror effect
        frame_webcam = cv2.flip(frame_webcam, 1)
        
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
            
            # Calculate angles for reference pose
            reference_angles = get_key_angles(frame_landmarks)
            
            # Display angles on video frame if enabled
            if show_angles and reference_angles:
                y_pos = 30
                for angle_name, angle_value in reference_angles.items():
                    cv2.putText(frame_video, f"{angle_name}: {angle_value:.1f}°", (10, y_pos),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
                    y_pos += 20
        
        # Process webcam frame for landmarks
        rgb_frame_webcam = cv2.cvtColor(frame_webcam, cv2.COLOR_BGR2RGB)
        results_webcam = pose.process(rgb_frame_webcam)
        
        # Extract webcam landmarks for comparison
        if results_webcam.pose_landmarks and frame_landmarks is not None:
            webcam_landmarks = [
                (lm.x, lm.y, lm.z, lm.visibility)
                for lm in results_webcam.pose_landmarks.landmark
            ]
            
            # Calculate angles for webcam pose
            webcam_angles = get_key_angles(webcam_landmarks)
            
            # Display angles on webcam frame if enabled
            if show_angles and webcam_angles:
                y_pos = 30
                for angle_name, angle_value in webcam_angles.items():
                    cv2.putText(frame_webcam, f"{angle_name}: {angle_value:.1f}°", (10, y_pos),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
                    y_pos += 20
            
            # Compute similarity
            similarity = calculate_combined_similarity(frame_landmarks, webcam_landmarks)
            
            # Add to history for smoothing
            similarity_history.append(similarity)
            if len(similarity_history) > 5:  # Keep a window of 5 frames
                similarity_history.pop(0)
            
            # Calculate smoothed similarity
            smoothed_similarity = sum(similarity_history) / len(similarity_history)
            
            # Display similarity score on webcam feed
            cv2.putText(frame_webcam, f"Similarity: {smoothed_similarity:.2f}", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
            
            # Display feedback 
            if smoothed_similarity > 0.85:
                feedback = "Perfect match!"
                color = (0, 255, 0)  # Green
            elif smoothed_similarity > 0.7:
                feedback = "Very good match"
                color = (0, 255, 0)  # Green
            elif smoothed_similarity > 0.5:
                feedback = "Good effort"
                color = (0, 255, 255)  # Yellow
            elif smoothed_similarity > 0.3:
                feedback = "Try to match the pose"
                color = (0, 165, 255)  # Orange
            else:
                feedback = "Significant difference"
                color = (0, 0, 255)  # Red
            
            cv2.putText(frame_webcam, feedback, (10, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
            
            # Draw landmarks on webcam frame
            mp_drawing.draw_landmarks(
                frame_webcam,
                results_webcam.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        else:
            # Clear similarity history if no pose is detected
            similarity_history = []
            cv2.putText(frame_webcam, "No pose detected", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2, cv2.LINE_AA)
        
        # Display both frames
        cv2.imshow('Reference Pose (Video)', frame_video)
        cv2.imshow('Your Pose (Webcam)', frame_webcam)
        
        # Handle key presses
        key = cv2.waitKey(30) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('a'):  # Toggle angle display
            show_angles = not show_angles
        
        # Increment frame counter
        current_frame += 1
        if current_frame >= len(all_landmarks):
            current_frame = 0
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    # Clean up
    video.release()
    webcam.release()
    cv2.destroyAllWindows()

# Example usage
video_path = "./example.mp4"
landmarks_path = "./preprocessed_landmarks.pkl"

# Step 1: Preprocess landmarks (run once)
# Uncomment if you need to regenerate the landmarks
# preprocess_video_landmarks(video_path, landmarks_path)

# Step 2: Compare live feed with recorded video
display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path)