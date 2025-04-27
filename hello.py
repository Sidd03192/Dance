import cv2
import mediapipe as mp
import pickle
import numpy as np
import math
from mediapipe.framework.formats import landmark_pb2
import os
angleData = {}
LengthData = 0.0

def compute_body_scale(landmarks):
    if not landmarks or len(landmarks) <= 12:
        return 1.0
    if landmarks[11][3] > 0.5 and landmarks[12][3] > 0.5:
        dx = landmarks[11][0] - landmarks[12][0]
        dy = landmarks[11][1] - landmarks[12][1]
        s = math.hypot(dx, dy)
        return s if s > 0 else 1.0
    return 1.0

def preprocess_and_annotate_video(video_path, output_video_path, landmark_output_path):
    """
    Reads video_path, runs MediaPipe pose + draws landmarks,
    writes out a WebM/VP8 to <base>.webm and pickles landmarks.
    Returns the full path to the .webm file.
    """
    mp_pose = mp.solutions.pose
    pose    = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
    drawer  = mp.solutions.drawing_utils
    styles  = mp.solutions.drawing_styles
    
    vid = cv2.VideoCapture(video_path)
    if not vid.isOpened():
        raise IOError(f"Cannot open {video_path}")

    w = int(vid.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(vid.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = vid.get(cv2.CAP_PROP_FPS) or 30

    # change extension to .webm
    base, _ = os.path.splitext(output_video_path)
    webm_path = base + ".webm"

    # VP8 fourcc
    out = cv2.VideoWriter(
        webm_path,
        cv2.VideoWriter_fourcc('V','P','8','0'),
        fps,
        (w, h)
    )

    all_landmarks = []
    while True:
        ret, frame = vid.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if res.pose_landmarks:
            lm = [(p.x, p.y, p.z, p.visibility)
                  for p in res.pose_landmarks.landmark]
            all_landmarks.append(lm)
            drawer.draw_landmarks(
                frame,
                res.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=styles.get_default_pose_landmarks_style()
            )
        else:
            all_landmarks.append(None)
        out.write(frame)
    
    vid.release()
    out.release()

    with open(landmark_output_path, 'wb') as f:
        pickle.dump(all_landmarks, f)

    return webm_path
def draw_lines(frame, pose_landmarks):
    """
    Draw exactly the same landmarks+connections you use
    in preprocess_and_annotate_video, but on a live frame.
    """
    mp_drawing = mp.solutions.drawing_utils
    mp_styles  = mp.solutions.drawing_styles

    mp_drawing.draw_landmarks(
        frame,
        pose_landmarks,
        mp.solutions.pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_styles.get_default_pose_landmarks_style()
    )
def calculate_angle(a, b, c):
    ba = (a[0]-b[0], a[1]-b[1])
    bc = (c[0]-b[0], c[1]-b[1])
    dot = ba[0]*bc[0] + ba[1]*bc[1]
    m1, m2 = math.hypot(*ba), math.hypot(*bc)
    if m1*m2 == 0:
        return 0.0
    return math.degrees(math.acos(max(-1, min(1, dot/(m1*m2)))))

def calculate_similarity(L1, L2):
    global angleData, LengthData
    if L1 is None or L2 is None or len(L1) != len(L2):
        return 0.0

    important = [
        (11,13,15,"Left Elbow"),
        (12,14,16,"Right Elbow"),
        (13,11,23,"Left Shoulder"),
        (14,12,24,"Right Shoulder")
    ]
    s1, s2 = compute_body_scale(L1), compute_body_scale(L2)
    avg_s = (s1 + s2) / 2.0

    pos_diffs = []
    for i, lm1 in enumerate(L1):
        lm2 = L2[i]
        if lm1[3] > 0.5 and lm2[3] > 0.5:
            pos_diffs.append(math.dist(lm1[:3], lm2[:3]) / avg_s)

    angleData = {}
    angle_sims = []
    for a,b,c,name in important:
        if all(L1[i][3] > 0.5 for i in (a,b,c)) and all(L2[i][3] > 0.5 for i in (a,b,c)):
            ang1 = calculate_angle(L1[a], L1[b], L1[c])
            ang2 = calculate_angle(L2[a], L2[b], L2[c])
            d = abs(ang1 - ang2)
            angleData[name] = {"video": ang1, "webcam": ang2, "diff": d}
            angle_sims.append(1 - d/180.0)

    if not pos_diffs or not angle_sims:
        return 0.0

    avg_pos = sum(pos_diffs) / len(pos_diffs)
    pos_sim = math.exp(-5 * avg_pos**2)
    LengthData = pos_sim
    return 0.2 * pos_sim + 0.8 * (sum(angle_sims) / len(angle_sims))

def resize_to_height(frame, H):
    h, w = frame.shape[:2]
    return cv2.resize(frame, (int(w * H/h), H))

def generate_feedback(ad, ls, thresh=25):
    msgs = []
    for nm, d in ad.items():
        if d["diff"] > thresh:
            if "Elbow" in nm:
                msgs.append(f"{nm}: bend more" if d["webcam"] < d["video"] else f"{nm}: straighten")
            else:
                msgs.append(f"{nm}: lower arm" if d["webcam"] > d["video"] else f"{nm}: raise arm")
    if ls < 0.5:
        msgs.append("Body position off")
    if not msgs:
        msgs = ["Nice! Form looks good!"]
    return msgs

def draw_colored_skeleton(frame, lmlist, score):
    h, w = frame.shape[:2]

    # map each connection to its joint name (if any)
    limb_to_part = {
        (11,13): "Left Elbow",    (13,15): "Left Elbow",
        (12,14): "Right Elbow",   (14,16): "Right Elbow",
        (13,11): "Left Shoulder", (11,23): "Left Shoulder",
        (14,12): "Right Shoulder",(12,24): "Right Shoulder",
    }

    for a, b in mp.solutions.pose.POSE_CONNECTIONS:
        A = lmlist.landmark[a]
        B = lmlist.landmark[b]
        if A.visibility > 0.5 and B.visibility > 0.5:
            x1, y1 = int(A.x*w), int(A.y*h)
            x2, y2 = int(B.x*w), int(B.y*h)

            part = limb_to_part.get((a,b)) or limb_to_part.get((b,a))
            if part and part in angleData:
                diff = angleData[part]["diff"]

                # give shoulders a more lenient green zone
                if "Shoulder" in part:
                    green_thresh  =  fifty = 50    # up to 50° is green
                    yellow_thresh = sixty = 80     # 50–80° is yellow
                else:
                    green_thresh  = 35            # elbows still 32°
                    yellow_thresh = 45            # elbows 32–45°

                if diff < green_thresh:
                    col = (0,255,0)       # green
                elif diff < yellow_thresh:
                    col = (0,165,255)     # yellow‐orange
                else:
                    col = (0,0,255)       # red
            else:
                col = (200,200,200)      # neutral gray

            cv2.line(frame, (x1,y1), (x2,y2), col, 2)

    h, w = frame.shape[:2]

    # map each connection to its joint name (if any)
    limb_to_part = {
        (11,13): "Left Elbow",   (13,15): "Left Elbow",
        (12,14): "Right Elbow",  (14,16): "Right Elbow",
        (13,11): "Left Shoulder",(11,23): "Left Shoulder",
        (14,12): "Right Shoulder",(12,24): "Right Shoulder",
    }

    for a, b in mp.solutions.pose.POSE_CONNECTIONS:
        # pixel coords
        A = lmlist.landmark[a]
        B = lmlist.landmark[b]
        if A.visibility > 0.5 and B.visibility > 0.5:
            x1, y1 = int(A.x*w), int(A.y*h)
            x2, y2 = int(B.x*w), int(B.y*h)

            # see if this bone is part of an “important” joint
            part = limb_to_part.get((a,b)) or limb_to_part.get((b,a))
            if part and part in angleData:
                diff = angleData[part]["diff"]
                # green if <20°, yellow if <45°, red otherwise
                if diff < 32:
                    col = (0,255,0)
                elif diff < 45:
                    col = (0,165,255)
                else:
                    col = (0,0,255)
            else:
                # neutral gray for non‐tracked bones
                col = (200,200,200)

            cv2.line(frame, (x1,y1), (x2,y2), col, 2)

def display_preprocessed_landmarks_and_webcam_with_comparison(video_path, landmarks_path):
    with open(landmarks_path, 'rb') as f:
        all_lm = pickle.load(f)

    vid = cv2.VideoCapture(video_path)
    cam = cv2.VideoCapture(0)
    mp_pose = mp.solutions.pose
    pose    = mp_pose.Pose(model_complexity=0,
                           min_detection_confidence=0.5,
                           min_tracking_confidence=0.5)
    REF_SCALE = 1
    CAM_SCALE = 1
    H = 720
    history = []
    idx = 0

    while True:
        ok1, fv = vid.read()
        ok2, fc = cam.read()
        # Reference frame
        # fv = cv2.flip(fv, 1)
        # fv = cv2.resize(fv, (int(fv.shape[1] * REF_SCALE), H))
        TARGET_HEIGHT = 480
        fv = cv2.flip(fv, 1)
        fv = resize_to_height(fv, TARGET_HEIGHT)


        raw = all_lm[idx]
        ref_list = None
        if raw:
            mirrored = [(1-x,y,z,v) for x,y,z,v in raw]
            ref_list = landmark_pb2.NormalizedLandmarkList(
                landmark=[landmark_pb2.NormalizedLandmark(x=x,y=y,z=z,visibility=v)
                          for x,y,z,v in mirrored]
            )

        # Webcam frame
        fc = cv2.flip(fc, 1)
        # fc = resize_to_height(fc, H)
        # fc = cv2.resize(fc, (int(fc.shape[1] * CAM_SCALE), H))
        # fc = resize_to_height(fc, H)

        rgb = cv2.cvtColor(fc, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)

        # Similarity
        if res.pose_landmarks and ref_list:
            cam_raw = [(p.x,p.y,p.z,p.visibility) for p in res.pose_landmarks.landmark]
            ref_raw = [(p.x,p.y,p.z,p.visibility) for p in ref_list.landmark]
            s = calculate_similarity(ref_raw, cam_raw)
            history.append(s)
            if len(history) > 3:
                history.pop(0)
            avg = sum(history) / len(history)
        else:
            avg = 0.0

        # Draw color‐coded skeletons
        if ref_list:
            draw_colored_skeleton(fv, ref_list, avg)
        if res.pose_landmarks:
            draw_colored_skeleton(fc, res.pose_landmarks, avg)

        # Draw reference angles
        if ref_list:
            y_off = 30
            for a,b,c,name in [(11,13,15,"Left Elbow"),(12,14,16,"Right Elbow"),
                               (13,11,23,"Left Shoulder"),(14,12,24,"Right Shoulder")]:
                lm = ref_list.landmark
                if lm[a].visibility>0.5 and lm[b].visibility>0.5 and lm[c].visibility>0.5:
                    angle = calculate_angle(
                        (lm[a].x, lm[a].y),
                        (lm[b].x, lm[b].y),
                        (lm[c].x, lm[c].y)
                    )
                    # cv2.putText(fv, f"{name}: {angle:.1f}°",
                    #             (10, y_off),
                    #             cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,0), 1, cv2.LINE_AA)
                    y_off += 25

        # Draw live stats & angles
        if res.pose_landmarks and ref_list:
            # cv2.putText(fc, f"Sim: {avg:.2f}", (10,30),
            #             cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2, cv2.LINE_AA)
            # cv2.putText(fc, f"Pos: {LengthData:.2f}", (10,60),
            #             cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2, cv2.LINE_AA)
            drawer = mp.solutions.drawing_utils
            drawer.draw_landmarks(fc, res.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            y_off = 90
            for nm, d in angleData.items():
                # col = (0,255,0) if d['diff']<20 else (0,165,255) if d['diff']<45 else (0,0,255)
                # txt = f"{nm}: V{d['video']:.1f} W{d['webcam']:.1f} D{d['diff']:.1f}"
                # cv2.putText(fc, txt, (10, y_off),
                #             cv2.FONT_HERSHEY_SIMPLEX, 0.6, col, 1, cv2.LINE_AA)
                y_off += 25

        # Combine and feedback
        combined = np.hstack((fv, fc))
        if avg >= 0.8:
            fb = "Great"
        elif avg >= 0.5:
            fb = "Acceptable"
        else:
            fb = "Wrong"
        ts, _ = cv2.getTextSize(fb, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
        x = (combined.shape[1] - ts[0]) 
        # cv2.putText(combined, fb, (x, 50),
        #             cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 2, cv2.LINE_AA)

        for i, msg in enumerate(generate_feedback(angleData, LengthData)):
            cv2.putText(combined, msg, (10, combined.shape[0] - 100 + 30*i),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,0), 2, cv2.LINE_AA)

        cv2.imshow("Comparison", combined)
        cv2.imshow("Reference", fv)
        cv2.imshow("Webcam",    fc)






        if cv2.waitKey(30) & 0xFF == ord('q'):
            break

        idx = (idx + 1) % len(all_lm)


    
if __name__ == "__main__":
    preprocess_and_annotate_video("advfinal1.mp4", "annotated_video.mp4", "ok.pkl")
    display_preprocessed_landmarks_and_webcam_with_comparison("advfinal1.mp4", "ok.pkl") #update these two
