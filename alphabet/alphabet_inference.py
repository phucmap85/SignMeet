import cv2
import mediapipe as mp
import numpy as np
import os
import joblib

model = joblib.load("AlphabetRegVNSL.joblib")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

mp_drawing = mp.solutions.drawing_utils
mp_holistic = mp.solutions.holistic

classes = sorted([name.split('.')[0] for name in os.listdir('alphabet_data')])

def draw_landmark_on_image(image, results):  
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
    face = np.array([[res.x, res.y, res.z, res.visibility] for res in results.face_landmarks.landmark]) if results.face_landmarks else np.zeros((468, 4))
    
    pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]) if results.pose_landmarks else np.zeros((33, 4))
    pose = np.delete(pose, [i for i in range(11)] + [i for i in range(17, len(pose))], 0)
    
    lh = np.array([[res.x, res.y, res.z, res.visibility] for res in results.left_hand_landmarks.landmark]) if results.left_hand_landmarks else np.zeros((21, 4))
    
    rh = np.array([[res.x, res.y, res.z, res.visibility] for res in results.right_hand_landmarks.landmark]) if results.right_hand_landmarks else np.zeros((21, 4))
    
    return face, pose, lh, rh

def landmark_to_pixel(x, y, device_width = 1280, device_height = 720):
    new_x = (int) (x * device_width)
    new_y = (int) (y * device_height)
    return (new_x, new_y)

with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
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

        cv2.putText(image, classes[model.predict([landmarks_normalization(rh)])[0]], (0, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3, cv2.LINE_AA)

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