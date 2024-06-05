import React, { Component, createRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import * as hlt from '@mediapipe/holistic';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import Webcam from 'react-webcam';
import './UserVideo.css';

function getTime() {
    return Date.now() / 1000;
}

function hamming_dist(x, y, u, v) {
    return Math.sqrt((x - u) * (x - u) + (y - v) * (y - v));
}

function landmark_to_pixel(x, y) {
    let new_x = Math.floor(x * 1280)
    let new_y = Math.floor(y * 720)
    return ({new_x, new_y})
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

        this.t0_hand = getTime();
        this.on_countdown_hand = 0;
        this.on_enter = 0;
        this.on_passed_hand = 0;

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
            // this.setState({signWord: response.result});

            this.props.onDataReceived(response.result)
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

        // console.log(getTime() - this.t0, this.on_lip);

        // Check if right hand on lip
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

                (lm_arr = []).length = 0;
            }
        }

        // Check if user click enter
        let new_x_hand = landmark_to_pixel(rh[12][0], rh[12][1]).new_x;
        let new_y_hand = landmark_to_pixel(rh[12][0], rh[12][1]).new_y;

        console.dir(hamming_dist(new_x_hand, new_y_hand, 50, 400));
        if (hamming_dist(new_x_hand, new_y_hand, 50, 400) <= 30) {
            if (!this.on_countdown_hand) {
                this.t0_hand = getTime();
                this.on_countdown_hand = 1;
            }

            if (1.0 - getTime() + this.t0_hand <= 0 && !this.on_passed_hand) {
                this.on_passed_hand = 1;
                this.on_enter = 1 - this.on_enter;
            }
        } else {
            this.on_passed_hand = 0;
            this.on_countdown_hand = 0;
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

        if(this.on_enter) {
            canvasCtx.beginPath();
            canvasCtx.rect(0, 50, 50, 50);
            canvasCtx.fillStyle = "#7F00FF";
            canvasCtx.fill();
            
            // Send request here
            console.log('da gui');
            this.props.onSendSignWord()

            this.on_enter = 0;
        }

        if(this.on_countdown_hand || this.on_countdown) {
            canvasCtx.beginPath();
            canvasCtx.rect(0, 0, 50, 50);
            canvasCtx.fillStyle = "#00FF00";
            canvasCtx.fill();
        } else {
            canvasCtx.beginPath();
            canvasCtx.rect(0, 0, 50, 50);
            canvasCtx.fillStyle = "red";
            canvasCtx.fill();
        }

        if(this.on_lip) {
            canvasCtx.beginPath();
            canvasCtx.rect(50, 0, 50, 50);
            canvasCtx.fillStyle = "blue";
            canvasCtx.fill();
        }

        var centerX = 25;
        var centerY = 267;
        var radius = 15;

        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        canvasCtx.fillStyle = 'lightblue';
        canvasCtx.fill();
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'black';
        canvasCtx.stroke();

        // Draw arrow
        var arrowLength = radius * 1.3;
        var arrowWidth = radius * 0.5;

        canvasCtx.beginPath();
        canvasCtx.moveTo(centerX - radius * 0.5, centerY);
        canvasCtx.lineTo(centerX - radius + arrowLength, centerY - arrowWidth);
        canvasCtx.lineTo(centerX - radius + arrowLength, centerY + arrowWidth);
        canvasCtx.closePath();
        canvasCtx.fillStyle = 'black';
        canvasCtx.fill();


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

