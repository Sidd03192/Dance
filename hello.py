import cv2
import mediapipe as mp
import pickle
import numpy as np
from mediapipe.framework.formats import landmark_pb2  # Import required for LandmarkList
import math
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
    Calculate the angle between three points
    Parameters:
    a, b, c - tuples/lists with coordinates (x, y)
    where b is the center point (vertex)
    """
    a = np.array([a[0], a[1]])
    b = np.array([b[0], b[1]])
    c = np.array([c[0], c[1]])
    
    # Create vectors
    ba = a - b
    bc = c - b
    
    # Calculate dot product
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)  # Ensure value is within valid range
    
    # Calculate angle in degrees
    angle = np.degrees(np.arccos(cosine_angle))
    
    return angle

def calculate_similarity(landmarks1, landmarks2):
    if landmarks1 is None or landmarks2 is None:
        return 0.0
        
    if len(landmarks1) != len(landmarks2):
        raise ValueError("Landmark lists must have the same length")

    # Define important joint angles to compare
    # Each tuple contains three landmark indices (a, b, c) where b is the vertex
    important_angles = [
        # Right arm angle (shoulder, elbow, wrist)
        (11, 13, 15),
        # Left arm angle (shoulder, elbow, wrist)
        (12, 14, 16),
        # Right leg angle (hip, knee, ankle)
        (23, 25, 27),
        # Left leg angle (hip, knee, ankle)
        (24, 26, 28),
        # Torso right side (shoulder, hip, knee)
        (11, 23, 25),
        # Torso left side (shoulder, hip, knee)
        (12, 24, 26)
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
    
    # Calculate angle differences
    angle_diffs = []
    for a_idx, b_idx, c_idx in important_angles:
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
            
            # Calculate updated --> using cos
            angle_diff = math.cos(angle1 - angle2)
            # if that doent work try this angle_diff = min(abs(angle1 - angle2), 360 - abs(angle1 - angle2))

            angle_diffs.append(angle_diff)
    
    # Combine position and angle metrics
    if position_diffs and angle_diffs:
        avg_position_diff = sum(position_diffs) / len(position_diffs)
        avg_angle_diff = sum(angle_diffs) / len(angle_diffs)
        
        # Non-linear transformation for position similarity
        # Gaussian function to create a bell curve effect
        position_similarity = np.exp(-5 * avg_position_diff**2)
        
        # Non-linear transformation for angle similarity
        # Sigmoid-like behavior here too. 
        normalized_angle_diff = avg_angle_diff / 180.0
        angle_similarity = 1 / (1 + np.exp(10 * (normalized_angle_diff - 0.3)))
        
        # Weight the two scores (angle is more important for motion comparison)
        final_similarity = 0.4 * position_similarity + 0.6 * angle_similarity
        
        # Debugzzz
        print(f"Position similarity: {position_similarity:.4f}")
        print(f"Angle similarity: {angle_similarity:.4f}")
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
            
            # Display similarity score on webcam feed
            cv2.putText(frame_webcam, f"Similarity: {avg_similarity:.2f}", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
            
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
    
    # Clean up
    video.release()
    webcam.release()
    cv2.destroyAllWindows()

# Example usage
video_path = "./example.mp4"
landmarks_path = "./preprocessed_landmarks.pkl"

# Step 1: Preprocess landmarks (run once)
preprocess_video_landmarks(video_path, landmarks_path)

# Step 2: Compare live feed with recorded video
display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path)