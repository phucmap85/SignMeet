import cv2
import mediapipe as mp
import numpy as np
import time
from datetime import datetime
import os

cap = cv2.VideoCapture(2, cv2.CAP_DSHOW)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

mp_drawing = mp.solutions.drawing_utils
mp_holistic = mp.solutions.holistic

def draw_landmark_on_image(image, results):
    # Face landmarks
    # mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_CONTOURS, 
    #                           mp_drawing.DrawingSpec(color=(80,110,10), thickness=1, circle_radius=1),
    #                           mp_drawing.DrawingSpec(color=(80,256,121), thickness=1, circle_radius=1))
    
    # Right hand
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                              mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4),
                              mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2))

    # Left Hand
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                              mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
                              mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2))

    # Pose Detections
    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS, 
                              mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                              mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2))

def landmarks_normalization(landmarks):
    lm_list = []
    
    base_x, base_y, base_z = landmarks[0][0], landmarks[0][1], landmarks[0][2]
    
    center_x = np.mean([lm[0] for lm in landmarks])
    center_y = np.mean([lm[1] for lm in landmarks])
    center_z = np.mean([lm[2] for lm in landmarks])
    
    distances = [np.sqrt((lm[0] - center_x)**2 + (lm[1] - center_y)**2 + (lm[2] - center_z)**2) for lm in landmarks[1:]]

    scale_factors = [1.0 / dist if dist != 0 else 0.0 for dist in distances]

    lm_list.append(0.0)
    lm_list.append(0.0)
    lm_list.append(0.0)

    for lm, scale_factor in zip(landmarks[1:], scale_factors):
        lm_list.append((lm[0] - base_x) * scale_factor)
        lm_list.append((lm[1] - base_y) * scale_factor)
        lm_list.append((lm[2] - base_z) * scale_factor)
    
    return np.asarray(lm_list)

def make_landmark_timestep(results):
    face = np.asarray([[res.x, res.y, res.z, res.visibility] for res in results.face_landmarks.landmark]) if results.face_landmarks else np.zeros((468, 4))
    
    pose = np.asarray([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]) if results.pose_landmarks else np.zeros((33, 4))
    pose = np.delete(pose, [i for i in range(11)] + [i for i in range(17, len(pose))], 0)
    
    lh = np.asarray([[res.x, res.y, res.z, res.visibility] for res in results.left_hand_landmarks.landmark]) if results.left_hand_landmarks else np.zeros((21, 4))
    
    rh = np.asarray([[res.x, res.y, res.z, res.visibility] for res in results.right_hand_landmarks.landmark]) if results.right_hand_landmarks else np.zeros((21, 4))
    
    return face, pose, lh, rh

def landmark_to_pixel(x, y, device_width = 1280, device_height = 720):
    new_x = (int) (x * device_width)
    new_y = (int) (y * device_height)
    return (new_x, new_y)

path = 'word_data/' + 'thương yêu'

try:
    os.makedirs(path)
except:
    pass

with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
    t0, on_countdown, on_lip, on_passed, pre_num_of_frames = time.time(), False, 0, False, 0
    lm_arr = []

    while cap.isOpened():
        ret, frame = cap.read()

        # Resize
        resize = cv2.resize(frame, (1280, 720))

        # Recolor Feed
        image = cv2.cvtColor(resize, cv2.COLOR_BGR2RGB)

        # Make predictions
        results = holistic.process(image)
        
        # Draw landmarks
        draw_landmark_on_image(image, results)

        # Extract landmarks position
        face, pose, lh, rh = make_landmark_timestep(results)

        lip_x_min, lip_x_max = face[61][0], face[409][0]
        lip_y_min, lip_y_max = min(face[37][1], face[267][1]), face[17][1]

        cv2.putText(image, "RECORD: ON" if on_lip else "", (0, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(image, "RECORD: OFF" if not on_lip else "", (0, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3, cv2.LINE_AA)
        cv2.putText(image, str(f'NUM OF FRAMES: {pre_num_of_frames}'), (950, 700), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3, cv2.LINE_AA)

        if(rh[12][0] > 0 and rh[12][1] > 0 and rh[12][0] >= lip_x_min 
           and rh[12][0] <= lip_x_max and rh[12][1] >= lip_y_min and rh[12][1] <= lip_y_max):
            cv2.putText(image, 'YES', (1200, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)
            
            cv2.putText(image, str(max(0, round(0.5 - time.time() + t0, 2))), (1200, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)

            if not on_countdown:
                t0 = time.time()
                on_countdown = True
            
            if(0.5 - time.time() + t0 <= 0 and not on_passed):
                on_passed = True
                on_lip = 1 - on_lip
        else:
            on_passed = False
            on_countdown = False
            cv2.putText(image, 'NO', (1200, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)
        
        if on_lip:
            if not on_countdown:
                lm_arr.append(np.concatenate([landmarks_normalization(pose), 
                                              landmarks_normalization(lh), 
                                              landmarks_normalization(rh)]))
        else:
            if(len(lm_arr) > 0):
                data_path = path + '/' + str(datetime.now().strftime("%d-%m-%Y_%H.%M.%S.%f"))
                np.save(data_path, np.array(lm_arr))
                pre_num_of_frames = len(lm_arr)
                lm_arr.clear()

        cv2.circle(image, landmark_to_pixel(rh[12][0], rh[12][1], image.shape[1], image.shape[0]), 8, (255, 255, 255), 15)
        cv2.circle(image, landmark_to_pixel(lh[12][0], lh[12][1], image.shape[1], image.shape[0]), 8, (255, 255, 255), 15)

        # Show to screen
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.imshow('SignMeet', image)

        # Break gracefully
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()