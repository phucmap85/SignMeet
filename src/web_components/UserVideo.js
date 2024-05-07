import React, { useRef, useEffect, useState, Component, createRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import * as hlt from '@mediapipe/holistic';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import Webcam from 'react-webcam';
import './UserVideo.css';

function getTime() {
    return Date.now() / 1000;
}

let lm_arr = [];

class UserVideo extends Component {
    constructor(props) {
        super(props);

        this.state = {
            signWord: ''
        }
        this.webcamRef = createRef();
        this.canvasRef = createRef();
        this.camera = null;
        this.t0 = getTime();
        this.on_countdown = 0;
        this.on_lip = 0;
        this.on_passed = 0;
        this.pre_num_of_frames = 0;

        lm_arr = [];
    }

    makeLandmarkTimestep = (results) => {
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

    sendHTTPReq = async (data) => {
        let formData = new FormData();
        formData.append("arr", data);
        const post = await fetch('https://sharp-pure-goat.ngrok-free.app/word', {
            method: 'POST',
            body: formData,
        })
        const response = await post.json();
        if (response.result !== "None") {
            this.setState({signWord: response.result});

            this.props.onDataReceived(this.signWord)
        }
        console.dir(response);
    }

    onResults = (results) => {
        const videoWidth = this.webcamRef.current.video.videoWidth;
        const videoHeight = this.webcamRef.current.video.videoHeight;

        let timeStep = this.makeLandmarkTimestep(results);

        const face = timeStep.face, pose = timeStep.pose;
        const lh = timeStep.lh, rh = timeStep.rh;

        let lip_x_min = face[61][0], lip_x_max = face[409][0];
        let lip_y_min = Math.min(face[37][1], face[267][1]), lip_y_max = face[17][1]

        // console.log(lip_x_min, lip_x_max, lip_y_min, lip_y_max)
        console.log(getTime() - this.t0, this.on_lip);

        if (rh[12][0] > 0 && rh[12][1] > 0 && rh[12][0] >= lip_x_min && rh[12][0] <= lip_x_max
            && rh[12][1] >= lip_y_min && rh[12][1] <= lip_y_max) {

            if (!this.on_countdown) {
                this.t0 = getTime();
                this.on_countdown = 1;
            }

            if (0.5 - getTime() + this.t0 <= 0 && !this.on_passed) {
                this.on_passed = 1;
                this.on_lip = 1 - this.on_lip;
            }
        } else {
            this.on_passed = 0;
            this.on_countdown = 0;
        }

        if (this.on_lip) {
            if (!this.on_countdown) {
                let temp_pose = pose.flat(), temp_lh = lh.flat(), temp_rh = rh.flat();
                lm_arr.push(temp_pose.concat(temp_lh, temp_rh));
            }
        } else {
            if (lm_arr.length > 0) {
                this.pre_num_of_frames = lm_arr.length;
                console.log(this.pre_num_of_frames, lm_arr);

                this.sendHTTPReq(lm_arr);

                // runModel(lm_arr).then(res => {
                //     console.log("Prediction: ", indexOfMax(res));
                // });

                (lm_arr = []).length = 0;
            }
        }

        // Set canvas width
        this.canvasRef.current.width = videoWidth;
        this.canvasRef.current.height = videoHeight;


        const canvasElement = this.canvasRef.current;
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


    componentDidMount() {
        const holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        })


        holistic.setOptions({
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        holistic.onResults(this.onResults)

        if (typeof this.webcamRef.current !== "undefined" && this.webcamRef.current !== null) {
            this.camera = new cam.Camera(this.webcamRef.current.video, {
                onFrame: async () => {
                    await holistic.send({ image: this.webcamRef.current.video });
                },
                width: 1280,
                height: 720,
            });
            this.camera.start();
        }
    }


    render() {
        return (
            <div id='user-video'>
                <Webcam ref={this.webcamRef} width={1280} height={720} hidden style={{ position: "absolute" }} />
                <canvas ref={this.canvasRef} style={{ borderRadius: "2%" }} />
                <h1 style={{ transform: "rotateY(180deg)", color: "white" }}>{this.state.signWord}</h1>
            </div>
        );
    }
}


export default UserVideo;

