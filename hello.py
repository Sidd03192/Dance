import cv2
import mediapipe as mp

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Initialize webcam
webcam = cv2.VideoCapture(0)

# Initialize pose detection
with mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5) as pose:
    
    while webcam.isOpened():
        # Read frame
        ret, frame = webcam.read()
        if not ret:
            print("Failed to grab frame")
            break
            
        # Convert BGR to RGB (MediaPipe requires RGB)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the image (set writeable=False for performance)
        frame_rgb.flags.writeable = False
        results = pose.process(frame_rgb)
        frame_rgb.flags.writeable = True
        
        # Draw the pose annotations on the image
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())
            
            # Optionally: Print coordinates of specific landmarks
            # For example, to get coordinates of the right shoulder (landmark 12):
            # if results.pose_landmarks.landmark[12].visibility > 0.5:  # Check if visible
            #     h, w, c = frame.shape
            #     right_shoulder = (int(results.pose_landmarks.landmark[12].x * w), 
            #                      int(results.pose_landmarks.landmark[12].y * h))
            #     print(f"Right shoulder coordinates: {right_shoulder}")
                
        # Show the frame
        cv2.imshow("MediaPipe Pose Detection", frame)
        
        # Check for quit key
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Release resources
webcam.release()
cv2.destroyAllWindows()