import React, { useRef, useEffect } from 'react';
import { Holistic } from '@mediapipe/holistic';
import * as hlt from '@mediapipe/holistic';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';
import { reshape } from 'mathjs';

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

// async function runModel(landmarks) {
//     const model = await tf.loadLayersModel('https://raw.githubusercontent.com/PL508/model-test/master/model.json');

//     landmarks = reshape(landmarks, [-1, 30, 126]);

//     return model.predict(tf.tensor(landmarks)).dataSync();
//}

function UserVideo() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    var camera = null;

    function makeLandmarkTimestep(results) {
        let pose = [], lh = [], rh = [];

        if (results.poseLandmarks) {
            results.poseLandmarks.forEach(val => {
                pose.push([val.x, val.y, val.z]);
            });
        } else {
            (pose = []).length = 132;
            pose.fill(0);
        }

        if (results.leftHandLandmarks) {
            results.leftHandLandmarks.forEach(val => {
                lh.push([val.x, val.y, val.z]);
            });
        } else {
            (lh = []).length = 63;
            lh.fill(0);
        }

        if (results.rightHandLandmarks) {
            results.rightHandLandmarks.forEach(val => {
                rh.push([val.x, val.y, val.z]);
            });
        } else {
            (rh = []).length = 63;
            rh.fill(0);
        }

        pose = pose.flat();
        lh = lh.flat();
        rh = rh.flat();

        // return pose.concat(face, lh, rh);

        return lh.concat(rh);
    }

    let lmList = [];

    function onResults(results) {
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;
        
        console.log(makeLandmarkTimestep(results))
        // if (lmList.length < 30) lmList.push(makeLandmarkTimestep(results));
        // else {
        //     runModel(lmList).then(res => {
        //         console.log(indexOfMax(res));
        //     });
        //     (lmList = []).length = 0;
        // }

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
            { color: '#FF0000', lineWidth: 0.5 });
        drawConnectors(canvasCtx, results.leftHandLandmarks, hlt.HAND_CONNECTIONS,
            { color: '#E0E0E0' });
        drawLandmarks(canvasCtx, results.leftHandLandmarks,
            { color: '#792cfa', lineWidth: 0.5 });
        drawConnectors(canvasCtx, results.rightHandLandmarks, hlt.HAND_CONNECTIONS,
            { color: '#E0E0E0' });
        drawLandmarks(canvasCtx, results.rightHandLandmarks,
            { color: '#502c79', lineWidth: 0.5 });

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
        <div>
            <Webcam ref={webcamRef} width={1280} height={720} />
            <canvas ref={canvasRef} />
        </div>
    );
}

export default UserVideo;