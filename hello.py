import cv2
import mediapipe as mp
import pickle
from mediapipe.framework.formats import landmark_pb2  # Import required for LandmarkList

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

def display_preprocessed_landmarks_and_webcam(video_path, landmarks_path):
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
    
    while True:
        # Read frames from video and webcam
        success_video, frame_video = video.read()
        success_webcam, frame_webcam = webcam.read()
        if not success_video or not success_webcam:
            break
        
        # Get corresponding landmarks for video
        frame_landmarks = all_landmarks[current_frame]
        
        # If landmarks exist, draw them on the video frame
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
        
        # Draw landmarks on the webcam frame if detected
        if results_webcam.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame_webcam,
                results_webcam.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        
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

# Step 2: Display preprocessed landmarks with webcam feed
display_preprocessed_landmarks_and_webcam(video_path, landmarks_path)
