import React, { Component } from 'react'
import io from 'socket.io-client'

import { IconButton, Badge, Input, Button } from '@material-ui/core'
import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import CallEndIcon from '@material-ui/icons/CallEnd'
import ChatIcon from '@material-ui/icons/Chat'
import CallIcon from '@material-ui/icons/Call';
import RecordVoiceOverIcon from '@material-ui/icons/RecordVoiceOver';
import PanToolIcon from '@material-ui/icons/PanTool';
import SendIcon from '@material-ui/icons/Send';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { useRef, useEffect, createRef } from 'react';

import { message } from 'antd'

import Draggable from 'react-draggable';
import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "./Video.css"
import Switch from 'react-input-switch';


import ChromeOnly from './web_components/chromeOnly'
import UserVideo from './web_components/UserVideo'
import { Height } from '@material-ui/icons'

// const server_url = process.env.NODE_ENV === 'production' ? 'https://5a1e-14-241-131-46.ngrok-free.app' : "http://localhost:4001"
const server_url = 'https://affectionate-bird-59138.pktriot.net:22848';

var connections = {}
const peerConnectionConfig = {
	'iceServers': [
		{
		  urls: "stun:stun.l.google.com:19302",
		},
		{
		  urls: "turn:relay1.expressturn.com:3478",
		  username: "efNGNR39L1IM1M9JQ5",
		  credential: "fqsuElQ998zDTnGn",
		},
	],
}

var socket = null
var socketId = null
var elms = 0

class Video extends Component {
	constructor(props) {
		super(props)

		this.localVideoref = createRef()

		this.videoAvailable = false
		this.audioAvailable = false

		this.state = {
			video: false,
			audio: false,
			screen: false,
			showModal: false,
			screenAvailable: false,
			messages: [],
			message: "",
			newmessages: 0,
			askForUsername: true,
			username: null,
			userType: 0,
			CWASALoaded: false,
			isServerReady: false,
			isSpacePressed: false,
			CWASALoaded: false,
		}
		connections = {}
		this.signWord = ''
		this.webSocket = null
		this.audioContext = null
		this.camera = null
		this.recorder = null
		this.mediaStream = null
		this.audioDataCache = []
		this.StopCommand = "12122006"
		this.signWordArr = ""
		this.sigml = ""
		this.sigmlText = ""

		this.getPermissions()
	}

	getPermissions = async () => {
		try {
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => this.videoAvailable = true)
				.catch(() => this.videoAvailable = false)

			await navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => this.audioAvailable = true)
				.catch(() => this.audioAvailable = false)

			if (navigator.mediaDevices.getDisplayMedia) {
				this.setState({ screenAvailable: true })
			} else {
				this.setState({ screenAvailable: false })
			}

			if (this.videoAvailable || this.audioAvailable) {
				navigator.mediaDevices.getUserMedia({ video: this.videoAvailable, audio: this.audioAvailable })
					.then((stream) => {
						window.localStream = stream
						this.localVideoref.current.srcObject = stream
					})
					.then((stream) => { })
					.catch((e) => console.log(e))
			}
		} catch (e) { console.log(e) }
	}

	resampleTo16kHZ = (audioData, origSampleRate = 44100) => {
		// Convert the audio data to a Float32Array
		const data = new Float32Array(audioData);

		// Calculate the desired length of the resampled data
		const targetLength = Math.round(data.length * (16000 / origSampleRate));

		// Create a new Float32Array for the resampled data
		const resampledData = new Float32Array(targetLength);

		// Calculate the spring factor and initialize the first and last values
		const springFactor = (data.length - 1) / (targetLength - 1);
		resampledData[0] = data[0];
		resampledData[targetLength - 1] = data[data.length - 1];

		// Resample the audio data
		for (let i = 1; i < targetLength - 1; i++) {
			const index = i * springFactor;
			const leftIndex = Math.floor(index).toFixed();
			const rightIndex = Math.ceil(index).toFixed();
			const fraction = index - leftIndex;
			resampledData[i] = data[leftIndex] + (data[rightIndex] - data[leftIndex]) * fraction;
		}

		// Return the resampled data
		return resampledData;
	}


	float32ToSigned16 = (floatArray) => {
		var signed16Array = new Int16Array(floatArray.length);

		for (var i = 0; i < floatArray.length; i++) {
			var floatValue = floatArray[i];
			// Clamp the value between -1 and 1
			floatValue = Math.max(-1, Math.min(floatValue, 1));
			// Convert to a signed 16-bit integer
			signed16Array[i] = floatValue * 0x7FFF;
		}

		return signed16Array;
	}


	handleWSServer = (stream) => {
		if (this.state.userType === 0) {
			this.webSocket = new WebSocket("wss://twilight-wave-85883.pktriot.net:22760");
			// this.webSocket = new WebSocket("ws://localhost:8080");

			this.webSocket.addEventListener("message", (data) => {
				console.dir(data.data);
				const response = JSON.parse(data.data);
				this.sigml = response.sigml;
				this.sigmlText = response.text;
				socket.emit("sigml", response.sigml);
				socket.emit("caption-text", 1, response.text);
			});

			this.audioContext = new AudioContext();
			this.mediaStream = this.audioContext.createMediaStreamSource(stream);
			this.recorder = this.audioContext.createScriptProcessor(4096, 1, 1);

			// alert("server connected")

			// Prevent page mute
			this.mediaStream.connect(this.recorder);
			this.recorder.connect(this.audioContext.destination);
			// this.mediaStream.connect(this.audioContext.destination);

			// socket.addEventListener("open", () => {
			// });

		}
	}
	startRecordAudio = async function () {
		// console.log("i'm here")
		this.recorder.onaudioprocess = async (event) => {
			if (!this.audioContext || this.state.userType) return;

			const inputData = event.inputBuffer.getChannelData(0);
			const audioData16kHz = this.resampleTo16kHZ(inputData, this.audioContext.sampleRate);

			console.dir(inputData);
			this.audioDataCache.push(inputData);
			this.webSocket.send(this.float32ToSigned16(audioData16kHz));
		};
	}

	stopRecordAudio = function () {
		if (this.audioContext) {
			this.recorder.onaudioprocess = () => { };
			this.webSocket.send(this.StopCommand)
			console.log("audio node closed");
		}
		else {
			console.log("there's no audio context");
		}
	}

	getMedia = () => {
		this.setState({
			video: this.videoAvailable,
			audio: this.audioAvailable
		}, () => {
			this.getUserMedia()
			this.connectToSocketServer()
		})
	}

	getUserMedia = async () => {
		if ((this.state.video && this.videoAvailable) || (this.state.audio && this.audioAvailable)) {
			const stream = await navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.catch(e => console.log("Error while fetching video/ audio: ", e))
			this.getUserMediaSuccess(stream)
			if (this.state.audio) {
				this.startRecordAudio()
			}
			else {
				this.stopRecordAudio();
			}
		} else {
			try {
				let tracks = this.localVideoref.current.srcObject.getTracks()
				tracks.forEach(track => track.stop())
			} catch (e) { }
		}
	}

	getUserMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch (e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				try {
					let tracks = this.localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch (e) { console.log(e) }

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				this.localVideoref.current.srcObject = window.localStream

				for (let id in connections) {
					connections[id].addStream(window.localStream)

					connections[id].createOffer().then((description) => {
						connections[id].setLocalDescription(description)
							.then(() => {
								socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
							})
							.catch(e => console.log(e))
					})
				}
			})
		})
	}

	getDislayMedia = () => {
		if (this.state.screen) {
			if (navigator.mediaDevices.getDisplayMedia) {
				navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
					.then(this.getDislayMediaSuccess)
					.then((stream) => { })
					.catch((e) => console.log(e))
			}
		}
	}

	getDislayMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch (e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				screen: false,
			}, () => {
				try {
					let tracks = this.localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch (e) { console.log(e) }

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = blackSilence()
				this.localVideoref.current.srcObject = window.localStream

				this.getUserMedia()
			})
		})
	}

	gotMessageFromServer = (fromId, message) => {
		var signal = JSON.parse(message)

		if (fromId !== socketId) {
			if (signal.sdp) {
				connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
					if (signal.sdp.type === 'offer') {
						connections[fromId].createAnswer().then((description) => {
							connections[fromId].setLocalDescription(description).then(() => {
								socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
							}).catch(e => console.log(e))
						}).catch(e => console.log(e))
					}
				}).catch(e => console.log(e))
			}

			if (signal.ice) {
				connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
			}
		}
	}

	changeCssVideos = (main) => {
		let width = ""
		if (elms === 0 || elms === 1) {
			width = "100%"
		} else if (elms === 2) {
			width = "45%"
		} else if (elms === 3 || elms === 4) {
			width = "35%"
		} else {
			width = String(100 / elms) + "%"
		}

		let videos = main.querySelectorAll("#user")
		for (let a = 0; a < videos.length; ++a) {
			videos[a].style.setProperty("width", width)
		}
		return { width }
	}

	connectToSocketServer = () => {
		socket = io(server_url, { secure: true })

		socket.on('signal', this.gotMessageFromServer)

		socket.on('connect', () => {
			// alert("server connected");
			socket.emit('join-call', window.location.href)
			socketId = socket.id

			socket.on('chat-message', this.addMessage)

			socket.on('user-left', (id) => {
				let video = document.querySelector(`[data-socket="${id}"]`)
				if (video !== null) {
					elms--
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					this.changeCssVideos(main)
				}
			})

			socket.on('caption-text', (type, data) => {
				const Caption = document.querySelector("#caption-text");
				if (Caption && this.state.userType === type) {
					Caption.innerHTML = data;
					console.dir(data);
				}
			})

			socket.on('sigml', (sigml) => {
				console.dir("sigml data: ", sigml);
				if (this.state.userType === 1) {
					console.log(this.state.CWASALoaded)
					// if (this.state.CWASALoaded) {
					window.CWASA.playSiGMLText(sigml, 0);
					// }

				}
			});

			socket.on('user-joined', (id, clients) => {
				clients.forEach((socketListId) => {
					connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
					// Wait for their ice candidate       
					connections[socketListId].onicecandidate = function (event) {
						if (event.candidate != null) {
							socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
						}
					}

					// Wait for their video stream
					connections[socketListId].onaddstream = (event) => {
						// TODO mute button, full screen button
						var searchVideo = document.querySelector(`[data-socket="${socketListId}"]`)
						if (searchVideo !== null) { // if i don't do this check it make an empty square
							searchVideo.srcObject = event.stream
						} else {
							elms = clients.length
							let main = document.getElementById('main')
							let cssMesure = this.changeCssVideos(main)

							let User = document.createElement('div')
							let Username = document.createElement('a')
							let video = document.createElement('video')

							let css = {
								Transform: "rotateZ(180)"
							}
							for (let i in css) User.style[i] = css[i]

							User.style.setProperty("width", cssMesure.width)
							// User.style.setProperty("height", cssMesure.height)
							video.setAttribute('data-socket', socketListId)
							video.setAttribute('id', "user-video");
							video.srcObject = event.stream
							video.autoplay = true
							video.playsinline = true

							// Username.setAttribute('className', "user-name");

							// <a className='user-name'>{this.state.username}</a>
							User.setAttribute('id', 'user');
							User.appendChild(video);

							// User.appendChild(Username);

							// main.appendChild(User)
							main.appendChild(User);
						}
					}

					// Add the local video stream
					if (window.localStream !== undefined && window.localStream !== null) {
						connections[socketListId].addStream(window.localStream)
					} else {
						let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
						window.localStream = blackSilence()
						connections[socketListId].addStream(window.localStream)
					}
				})

				if (id === socketId) {
					for (let id2 in connections) {
						if (id2 === socketId) continue

						try {
							connections[id2].addStream(window.localStream)
						} catch (e) { }

						connections[id2].createOffer().then((description) => {
							connections[id2].setLocalDescription(description)
								.then(() => {
									socket.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
								})
								.catch(e => console.log(e))
						})
					}
				}
			})
		})
	}

	silence = () => {
		let ctx = new AudioContext()
		let oscillator = ctx.createOscillator()
		let dst = oscillator.connect(ctx.createMediaStreamDestination())
		oscillator.start()
		ctx.resume()
		return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
	}
	black = ({ width = 640, height = 480 } = {}) => {
		let canvas = Object.assign(document.createElement("canvas"), { width, height })
		canvas.getContext('2d').fillRect(0, 0, width, height)
		let stream = canvas.captureStream()
		return Object.assign(stream.getVideoTracks()[0], { enabled: false })
	}

	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())
	handleScreen = () => this.setState({ screen: !this.state.screen }, () => this.getDislayMedia())

	handleEndCall = () => {
		try {
			let tracks = this.localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) { }
		window.location.href = "/"
	}

	openChat = () => this.setState({ showModal: true, newmessages: 0 })
	closeChat = () => this.setState({ showModal: false })
	handleMessage = (e) => this.setState({ message: e.target.value })

	addMessage = (data, sender, socketIdSender) => {
		this.setState(prevState => ({
			messages: [...prevState.messages, { "sender": sender, "data": data }],
		}))
		if (socketIdSender !== socketId) {
			this.setState({ newmessages: this.state.newmessages + 1 })
		}
	}

	handleUsername = (e) => this.setState({ username: e.target.value })

	sendMessage = () => {
		console.log("msg sent")
		socket.emit('chat-message', this.state.message, this.state.username)
		this.setState({ message: "", sender: this.state.username })
	}

	copyUrl = () => {
		let text = window.location.href
		if (!navigator.clipboard) {
			let textArea = document.createElement("textarea")
			textArea.value = text
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()
			try {
				document.execCommand('copy')
				message.success("Đường dẫn đã được sao chép!")
			} catch (err) {
				message.error("Sao chép thất bại")
			}
			document.body.removeChild(textArea)
			return
		}
		navigator.clipboard.writeText(text).then(function () {
			message.success("Đường dẫn đã được sao chép!")
		}, () => {
			message.error("Sao chép thất bại")
		})
	}

	connect = () => this.setState({ askForUsername: false }, () => this.getMedia())

	isChrome = function () {
		let userAgent = (navigator && (navigator.userAgent || '')).toLowerCase()
		let vendor = (navigator && (navigator.vendor || '')).toLowerCase()
		let matchChrome = /google inc/.test(vendor) ? userAgent.match(/(?:chrome|crios)\/(\d+)/) : null
		// let matchFirefox = userAgent.match(/(?:firefox|fxios)\/(\d+)/)
		// return matchChrome !== null || matchFirefox !== null
		return matchChrome !== null
	}

	changeBodyColor = () => {
		let Body = document.querySelector('body');
		Body.style.setProperty("background", "#202124")
	}

	forceUsername = () => {
		let UnInput = document.querySelector("#username-input");
		UnInput.style.setProperty("color", "red");
		UnInput.style.setProperty("border", "2px solid red");
	}

	HandleConnection = () => {
		if (this.state.username === null || this.state.username === "") {
			this.forceUsername();
			alert("Please enter a username");
		}
		else this.connect();
	}

	handleSwitchUserType = () => this.setState({ userType: this.state.userType === 0 ? 1 : 0 })

	handleCaption = () => {
		let Caption = document.querySelector("#caption-canvas");
		// if (Caption) dragElement(Caption);
	}

	handleEnterMessage = (e) => {
		if (e.key === "Enter") {
			this.sendMessage();
		}
	}

	HandleCWASALoad = () => {
		if (this.state.CWASALoaded === false) {
			console.log("CWASALoaded")
			//Set video start state
			window.CWASA.init({
				useClientConfig: true,
				avSettings: { initSpeed: +1.4 }
			});

			//Loading hanlder

			const doneLoad = () => {
				if (this.state.CWASALoaded === false) {
					this.setState({ CWASALoaded: true })
				}
			}

			window.CWASA.addHook("avatarloaded", doneLoad);
			this.setState({ CWASALoaded: true });
		}
	}

	handleKeyDown = (e) => {
		if (this.state.isSpacePressed === false && e.code == "Space") {
			console.log("started")
			this.handleAudio();
			this.setState({ isSpacePressed: true });
		}
	}
	handleKeyUp = (e) => {
		if (this.state.isSpacePressed === true && e.code == "Space") {
			console.log("ended")
			this.handleAudio();
			this.setState({ isSpacePressed: false });
		}
	}

	handleBottomBtn = () => {
		this.changeBodyColor()
		if (this.state.userType === 0) {
			window.addEventListener('keydown', this.handleKeyDown);
			window.addEventListener('keyup', this.handleKeyUp);
		}
	}

	handleSignWordChange = (data) => {
		this.signWord = data;
		console.log("SW in video.js received as: ", data)
		console.log(this.signWord);
		if (this.signWordArr === '') this.signWordArr = this.signWordArr + this.signWord;
		else {
			this.signWordArr += '/';
			this.signWordArr = this.signWordArr + this.signWord;
		}
		const sendBtn = document.querySelector("#send-sign-sentence-btn");
		if (sendBtn) {
			sendBtn.innerHTML = "Send " + this.signWordArr
			console.log(this.signWordArr)
		}
		const signWordText = document.querySelector("#sign-word-text");
		if (signWordText) {
			signWordText.innerHTML = this.signWordArr
		}
	}
	async componentDidMount() {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
		this.handleWSServer(stream);
	}

	handleSendSignSen = async () => {
		let formData = new FormData();
		formData.append("text", this.signWordArr);
		const post = await fetch('https://sharp-pure-goat.ngrok-free.app/sentence', {
			method: 'POST',
			body: formData,
		})
		const response = await post.json();

		const signWordText = document.querySelector("#sign-word-text");
		if (signWordText) {
			signWordText.innerHTML = ''
		}

		socket.emit('caption-text', 0, response.result)

		// const Caption = document.querySelector("#caption-text");
		// if (Caption) {
		// 	Caption.innerHTML = response.result
		// }

		console.dir("handleSendSignSen: " + response.result);
		this.signWordArr = "";
	}

	render() {
		if (this.isChrome() === false) {
			return (
				<ChromeOnly />
			)
		}
		else return (
			<div>
				{this.state.askForUsername === true ?
					<div>
						<div className='username-page'>
							<p className='title'>Hãy đặt tên người dùng</p>
							<Input id="username-input" className='input' placeholder="Tên người dùng" onChange={e => this.handleUsername(e)} />
							<Button className='button' variant="contained" color="primary" onClick={this.HandleConnection} style={{ background: "#A5402D" }} ><CallIcon />&nbsp;Kết nối</Button>
							<div className='switch'>
								<RecordVoiceOverIcon></RecordVoiceOverIcon>
								<Switch value={this.state.userType} onChange={this.handleSwitchUserType} styles={{
									track: {
										backgroundColor: '#cccccc'
									},
									trackChecked: {
										backgroundColor: '#A5402D'
									},
									button: {
										backgroundColor: '#ffffff'
									},
									buttonChecked: {
										backgroundColor: '#ffffff'
									}

								}} style={{ transform: "scale(1.5)", marginTop: "8px" }}></Switch>
								<PanToolIcon></PanToolIcon>
							</div>
						</div>

						<div className='video-wrapper'>
							<video id="user-video" ref={this.localVideoref} autoPlay muted> {console.log(this.localVideoref)}</video>
						</div>
					</div>
					:
					<div>
						<div className="bottom-btn" onLoad={this.handleBottomBtn()}>
							{this.state.userType === 0 ?
								<IconButton id='bot-btn' className='mic' onClick={this.handleAudio}>
									{this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
								</IconButton>
								: <div>{this.setState()}</div>}

							<IconButton id='bot-btn' className='video-cam' onClick={this.handleVideo}>
								{(this.state.video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
							</IconButton>

							{this.state.screenAvailable === true ?
								<IconButton id='bot-btn' className='screen-share' onClick={this.handleScreen}>
									{this.state.screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
								</IconButton>
								: null}

							<Badge badgeContent={this.state.newmessages} max={999} color="secondary" onClick={this.openChat}>
								<IconButton id='bot-btn' className='icon' onClick={this.openChat}>
									<ChatIcon />
								</IconButton>
							</Badge>

							<IconButton id='bot-btn' className='leave' onClick={this.handleEndCall}>
								<CallEndIcon />
							</IconButton>
						</div>

						<Modal className='chat-modal' show={this.state.showModal} onHide={this.closeChat}>
							<Modal.Header closeButton>
								<Modal.Title>Trò chuyện</Modal.Title>
							</Modal.Header>
							<Modal.Body className='chat-body'>
								{this.state.messages.length > 0 ? this.state.messages.map((item, index) => (
									<div className='wrapper' key={index}>
										<p className='content'><b>{item.sender}</b>: {item.data}</p>
									</div>
								)) : <p>Chưa có tin nhắn</p>}
							</Modal.Body>
							<Modal.Footer className="chat-send-msg">
								<input className='chat-content-msg' placeholder="Tin nhắn" value={this.state.message} onKeyDown={e => this.handleEnterMessage(e)} onChange={e => this.handleMessage(e)} />
								<button className='chat-send-btn' onClick={this.sendMessage}><SendIcon />&nbsp;Gửi</button>
							</Modal.Footer>
						</Modal>

						<div className="main-content">
							<div className='copy-box' style={{ paddingTop: "20px", height: "60px" }}>
								<Input value={window.location.href} disable="true" style={{ color: "white", width: "200px" }}></Input>
								<Button style={{
									background: "#A5402D", color: "white", marginLeft: "20px", padding: "5px",
									width: "120px", fontSize: "12px"
								}} onClick={this.copyUrl}><FileCopyIcon />&nbsp;Sao chép</Button>
							</div>

							<Row id="main" className="video-container">
								{this.state.userType === 1 ?
									<div id='user'>
										<UserVideo onDataReceived={this.handleSignWordChange} onSendSignWord={this.handleSendSignSen} />
										<div id='sign-word-text' style={{
											background: "white", position: "absolute", bottom: "0.8em",
											width: "calc(100% - 20px)", borderRadius: "10px",
											zIndex: "10", left: "10px"
										}}></div>
										<video id="user-video" style={{ position: "absolute", opacity: "0%" }} ref={this.localVideoref} autoPlay muted></video>
										{/* <a className='user-name'>{this.state.username}</a> */}
									</div>
									:
									<div id='user'>

										<video id="user-video" ref={this.localVideoref} autoPlay muted></video>
										{/* <a className='user-name'>{this.state.username}</a> */}
									</div>
								}
							</Row>

							{/* {this.state.userType === 1 ? <button id='send-sign-sentence-btn' style={{
								position: "absolute", top: "300px", left: "50px",
								height: "100px", background: "white", color: "black"
							}}
								onClick={this.handleSendSignSen}></button> : null} */}



							<Draggable>
								<div id="caption-canvas"><a id="caption-text">Phụ đề sẽ trông như thế này</a><button id="close-caption">X</button></div>
							</Draggable>
							{this.state.userType === 1 ?
								<Draggable>
									<div id="canvas-wrapper">
										<button id="close-canvas">X</button>
										<div id="canvas" onLoad={this.HandleCWASALoad()} class="CWASAAvatar av0"></div>
									</div>
								</Draggable>
								: null}
						</div>
					</div>
				}
			</div>
		)
	}
}

export default Video