import cv2
import mediapipe as mp
import numpy as np
import pickle

def preprocess_video_landmarks(video_path, output_path):
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

    # Open video
    video = cv2.VideoCapture(video_path)
    
    # Check if video opened successfully
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
            # Convert landmarks to list of (x, y, z, visibility)
            landmark_data = [(lm.x, lm.y, lm.z, lm.visibility) for lm in results.pose_landmarks.landmark]
            all_landmarks.append(landmark_data)
        else:
            all_landmarks.append(None)
    
    # Save landmarks to file
    with open(output_path, 'wb') as f:
        pickle.dump(all_landmarks, f)
    
    print(f"Processed {len(all_landmarks)} frames. Landmarks saved to {output_path}")
    video.release()

def display_preprocessed_landmarks(video_path, landmarks_path):
    # Load preprocessed landmarks
    with open(landmarks_path, 'rb') as f:
        all_landmarks = pickle.load(f)
    
    # Initialize video capture
    video = cv2.VideoCapture(video_path)
    
    # Initialize MediaPipe drawing utilities
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    
    # Prepare frame counter
    current_frame = 0
    
    while True:
        # Read frame
        success, frame = video.read()
        if not success:
            break
        
        # Get corresponding landmarks
        frame_landmarks = all_landmarks[current_frame]
        
        # If landmarks exist, draw them
        if frame_landmarks is not None:
            # Create a landmarks object
            landmarks = mp_pose.Landmark()
            landmarks.landmark = []
            
            for x, y, z, visibility in frame_landmarks:
                landmark = mp_pose.Landmark()
                landmark.x = x
                landmark.y = y
                landmark.z = z
                landmark.visibility = visibility
                landmarks.landmark.append(landmark)
            
            # Draw landmarks
            mp_drawing.draw_landmarks(
                frame, 
                landmarks, 
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        
        # Display frame
        cv2.imshow('Preprocessed Pose', frame)
        
        # Break on 'q' key
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break
        
        current_frame += 1
        if current_frame >= len(all_landmarks):
            current_frame = 0
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    # Clean up
    video.release()
    cv2.destroyAllWindows()

# Example usage
video_path = "./example.mp4"
landmarks_path = "./preprocessed_landmarks.pkl"

# Step 1: Preprocess landmarks (run once)
preprocess_video_landmarks(video_path, landmarks_path)

# Step 2: Display preprocessed landmarks
display_preprocessed_landmarks(video_path, landmarks_path)