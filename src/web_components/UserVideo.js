import React, { useRef, useEffect } from 'react';
import { Holistic } from '@mediapipe/holistic';
import * as hlt from '@mediapipe/holistic';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';
import { reshape } from 'mathjs';
import './UserVideo.css';


function indexOfMax(arr) {
    if (arr.length === 0) return -1;

    var max = arr[0], maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

async function runModel(landmarks) {
    const model = await tf.loadLayersModel('https://raw.githubusercontent.com/PL508/RegVNSL/master/model.json');

    landmarks = reshape(landmarks, [-1, landmarks.length, landmarks[0].length]);

    return model.predict(tf.tensor(landmarks)).dataSync();
}

function getTime() {
    return Date.now() / 1000;
}

function UserVideo() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    var camera = null;

    function makeLandmarkTimestep(results) {
        let face = [], pose = [], lh = [], rh = [];


        if (results.poseLandmarks) {
            let count = 0;
            results.poseLandmarks.forEach(val => {
                if (count > 10 && count < 17) pose.push([val.x, val.y, val.z]);
                count++;
            });
        } else {
            for (let i = 0; i < 6; i++) pose.push([0, 0, 0]);
        }

        if (results.faceLandmarks) {
            results.faceLandmarks.forEach(val => {
                face.push([val.x, val.y, val.z]);
            });
        } else {
            for (let i = 0; i < 468; i++) face.push([0, 0, 0]);
        }

        if (results.leftHandLandmarks) {
            results.leftHandLandmarks.forEach(val => {
                lh.push([val.x, val.y, val.z]);
            });
        } else {
            for (let i = 0; i < 21; i++) lh.push([0, 0, 0]);
        }

        if (results.rightHandLandmarks) {
            results.rightHandLandmarks.forEach(val => {
                rh.push([val.x, val.y, val.z]);
            });
        } else {
            for (let i = 0; i < 21; i++) rh.push([0, 0, 0]);
        }

        return { face, pose, lh, rh };
    }

    let lm_arr = [];
    let t0 = getTime(), on_countdown = 0, on_lip = 0, on_passed = 0, pre_num_of_frames = 0;

    function onResults(results) {
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        let timeStep = makeLandmarkTimestep(results);

        const face = timeStep.face, pose = timeStep.pose;
        const lh = timeStep.lh, rh = timeStep.rh;

        let lip_x_min = face[61][0], lip_x_max = face[409][0];
        let lip_y_min = Math.min(face[37][1], face[267][1]), lip_y_max = face[17][1]

        // console.log(lip_x_min, lip_x_max, lip_y_min, lip_y_max)
        console.log(getTime() - t0, on_lip);

        if (rh[12][0] > 0 && rh[12][1] > 0 && rh[12][0] >= lip_x_min && rh[12][0] <= lip_x_max
            && rh[12][1] >= lip_y_min && rh[12][1] <= lip_y_max) {

            if (!on_countdown) {
                t0 = getTime();
                on_countdown = 1;
            }

            if (0.5 - getTime() + t0 <= 0 && !on_passed) {
                on_passed = 1;
                on_lip = 1 - on_lip;
            }
        } else {
            on_passed = 0;
            on_countdown = 0;
        }

        if (on_lip) {
            if (!on_countdown) {
                let temp_pose = pose.flat(), temp_lh = lh.flat(), temp_rh = rh.flat();
                lm_arr.push(temp_pose.concat(temp_lh, temp_rh));
            }
        } else {
            if (lm_arr.length > 0) {
                pre_num_of_frames = lm_arr.length;
                console.log(pre_num_of_frames, lm_arr);

                runModel(lm_arr).then(res => {
                    console.log("Prediction: ", indexOfMax(res));
                });
                
                (lm_arr = []).length = 0;
            }
        }

        // Set canvas width
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;


        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext("2d");
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(
            results.image,
            0,
            0,
            canvasElement.width,
            canvasElement.height
        );


        drawConnectors(canvasCtx, results.poseLandmarks, hlt.POSE_CONNECTIONS,
            { color: '#00FF00' });
        drawLandmarks(canvasCtx, results.poseLandmarks,
            { color: '#FF0000', lineWidth: 0.1 });
        drawConnectors(canvasCtx, results.leftHandLandmarks, hlt.HAND_CONNECTIONS,
            { color: '#E0E0E0' });
        drawLandmarks(canvasCtx, results.leftHandLandmarks,
            { color: '#792cfa', lineWidth: 0.1 });
        drawConnectors(canvasCtx, results.rightHandLandmarks, hlt.HAND_CONNECTIONS,
            { color: '#E0E0E0' });
        drawLandmarks(canvasCtx, results.rightHandLandmarks,
            { color: '#502c79', lineWidth: 0.1 });


        canvasCtx.restore();
    }


    useEffect(() => {
        const holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        })


        holistic.setOptions({
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        holistic.onResults(onResults)

        if (typeof webcamRef.current !== "undefined" && webcamRef.current !== null) {
            camera = new cam.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    await holistic.send({ image: webcamRef.current.video });
                },
                width: 1280,
                height: 720,
            });
            camera.start();
        }
    }, [])


    return (
        <div id='user-video'>
            <Webcam ref={webcamRef} width={1280} height={720} hidden style={{ position: "absolute" }} />
            <canvas ref={canvasRef} style={{ borderRadius: "2%" }} />
        </div>
    );
}


export default UserVideo;

