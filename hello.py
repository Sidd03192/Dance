import cv2
import mediapipe as mp
import pickle
import numpy as np
from mediapipe.framework.formats import landmark_pb2  # Import required for LandmarkList
# import pytorch

import math

limbs = [[11, 13, 21, 15, 17, 19], [12, 14, 22, 16, 18, 20], [24, 26, 28, 32, 30], [23, 25, 27, 29, 31]]

def collect_bearings(landmark_data):
    limb_bearings = []
    for limb_i, limb in enumerate(limbs):
        limb_bearings.append([])
        for i in range(len(limb)):
            for j in range(i+1, len(limb)):
                node1 = limb[i]
                node2 = limb[j]
                limb_bearings[limb_i].append(get_bearing(landmark_data[node1], landmark_data[node2]))   
    return limb_bearings

def get_bearing(l1, l2):
    x1, y1 = l1[0], l1[1]  # Extract x, y from tuple
    x2, y2 = l2[0], l2[1]  # Extract x, y from tuple
    return calculate_bearing(x1, y1, x2, y2)

def calculate_bearing(x1, y1, x2, y2):
    delta_x = x2 - x1
    delta_y = y2 - y1
    
    # Calculate angle in degrees
    theta = math.degrees(math.atan2(delta_x, delta_y))
    
    # Convert to compass bearing
    bearing = (90 - theta) % 360
    
    return bearing

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
    bearings = []
    frame_count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Process each frame
    for _ in range(frame_count):
        success, frame = video.read()
        if not success:
            break
        
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame
        results = pose.process(rgb_frame) # get the pose data
        
        # Store landmarks (or None if no detection)
        if results.pose_landmarks:
            landmark_data = [(lm.x, lm.y, lm.z, lm.visibility) for lm in results.pose_landmarks.landmark]
            
            # delete 0 through 10 landmarks since they are related to face
            # alter_landmark_data = landmark_data[11:]
            
            # limb_bearings = collect_bearings(landmark_data)
            
            # bearings.append(limb_bearings)
            
            all_landmarks.append(landmark_data)
        else:
            all_landmarks.append(None)
    
    # Save landmarks to file
    with open(output_path, 'wb') as f:
        pickle.dump(all_landmarks, f)
    
    print(f"Processed {len(all_landmarks)} frames. Landmarks saved to {output_path}")
    video.release()

def calculate_similarity(landmarks1, landmarks2):
    if len(landmarks1) != len(landmarks2):
        raise ValueError("Landmark lists must have the same length")
    
    frame_bearings = collect_bearings(landmarks1)
    cam_bearings = collect_bearings(landmarks2)
    

    total_distance = 0
    for frame_list, cam_list in zip(frame_bearings, cam_bearings):
        for frame_angle, cam_angle in zip(frame_list, cam_list):
            distance = (cam_angle - frame_angle)**2
            total_distance += distance

    average_distance = total_distance / len(frame_bearings)
    similarity_score = 1 / (1 + average_distance)

    # Debug prints
    print(f"Total distance: {total_distance}")
    print(f"Average distance: {average_distance}")
    print(f"Similarity score: {similarity_score}")

    return similarity_score


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
    
    while True:
        # Read frames from video and webcam
        success_video, frame_video = video.read()
        success_webcam, frame_webcam = webcam.read()
        frame_webcam = cv2.flip(frame_webcam, 1)

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
        if results_webcam.pose_landmarks:
            webcam_landmarks = [
                (lm.x, lm.y, lm.z, lm.visibility)
                for lm in results_webcam.pose_landmarks.landmark
            ]
            
            # Compute similarity
            similarity = calculate_similarity(frame_landmarks, webcam_landmarks)
            if similarity is not None:
                # Display similarity score on webcam feed
                cv2.putText(frame_webcam, f"Similarity: {similarity:.2f}", (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
            
            # Draw landmarks on webcam frame
            mp_drawing.draw_landmarks(
                frame_webcam,
                results_webcam.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
            )
        else:
            print("No pose landmarks found in webcam frame")
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