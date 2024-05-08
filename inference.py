import cv2
import mediapipe as mp
import numpy as np
import time
import os
import math
import tensorflow as tf

model = tf.keras.models.load_model("RegVNSL.h5")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

mp_drawing = mp.solutions.drawing_utils
mp_holistic = mp.solutions.holistic

classes = sorted(os.listdir('dataset/VNSL'))

def draw_landmark_on_image(image, results):  
    # Right hand
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                                mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4),
                                mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2)
                                )

    # Left Hand
    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS, 
                                mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
                                mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2)
                                )

    # Pose Detections
    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS, 
                                mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                                mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                                )

def make_landmark_timestep(results):
    face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]) if results.face_landmarks else np.zeros((468, 3))
    
    pose = np.array([[res.x, res.y, res.z] for res in results.pose_landmarks.landmark]) if results.pose_landmarks else np.zeros((33, 3))
    pose = np.delete(pose, [i for i in range(11)] + [i for i in range(17, len(pose))], 0)
    
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]) if results.left_hand_landmarks else np.zeros((21, 3))
    
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]) if results.right_hand_landmarks else np.zeros((21, 3))
    
    return face, pose, lh, rh

def landmark_to_pixel(x, y, device_width = 1280, device_height = 720):
    new_x = (int) (x * device_width)
    new_y = (int) (y * device_height)
    return (new_x, new_y)

def detect(lm_list):
    # Padding
    timestep = 25

    while(len(lm_list) < timestep):
        lm_list.append([0] * len(lm_list[0]))
    
    # Predict
    lm_list = np.asarray(lm_list)
    lm_list = lm_list.reshape((-1, lm_list.shape[0], lm_list.shape[1]))
    results = model.predict(lm_list)
    index = np.argmax(results)
    if(results[0][index] > 0.8):
        return classes[index]
    else:
        return "None"

def hamming_dist(x, y, u, v):
    return math.sqrt((x - u) ** 2 + (y - v) ** 2)

with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
    t0, on_countdown, on_lip, on_passed, pre_num_of_frames, pre_predict = time.time(), False, 0, False, 0, "None"

    t0_hand, on_countdown_hand, on_enter, on_passed_hand, = time.time(), False, 0, False

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
        cv2.putText(image, pre_predict, (0, 700), 
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 0, 255), 3, cv2.LINE_AA)
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
                lm_arr.append(np.concatenate([pose.flatten(), lh.flatten(), rh.flatten()]))
        else:
            if(len(lm_arr) > 0):
                pre_num_of_frames = len(lm_arr)
                pre_predict = detect(lm_arr)
                lm_arr.clear()

        cv2.circle(image, landmark_to_pixel(rh[12][0], rh[12][1], image.shape[1], image.shape[0]), 8, (255, 255, 255), 15)
        cv2.circle(image, landmark_to_pixel(lh[12][0], lh[12][1], image.shape[1], image.shape[0]), 8, (255, 255, 255), 15)

        cv2.circle(image, (50, 400), 15, (0, 128, 255), 30)

        # On_enter
        new_x_hand, new_y_hand = landmark_to_pixel(rh[12][0], rh[12][1], image.shape[1], image.shape[0])
        print(hamming_dist(new_x_hand, new_y_hand, 50, 400))

        if(hamming_dist(new_x_hand, new_y_hand, 50, 400) <= 20):
            # cv2.putText(image, 'YES', (1200, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)
            
            cv2.putText(image, str(max(0, round(0.5 - time.time() + t0_hand, 2))), (800, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)

            if not on_countdown_hand:
                t0_hand = time.time()
                on_countdown_hand = True
            
            if(0.5 - time.time() + t0_hand <= 0 and not on_passed_hand):
                on_passed_hand = True
                on_enter = 1 - on_enter
        else:
            on_passed_hand = False
            on_countdown_hand = False
        
        if on_enter:
            cv2.putText(image, 'OK', (800, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 3, cv2.LINE_AA)
            on_enter = 0

        # Show to screen
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.imshow('SignMeet', image)

        # Break gracefully
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()