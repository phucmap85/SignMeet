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
import { useRef, useEffect, createRef } from 'react';
import { Holistic } from '@mediapipe/holistic';
import * as hlt from '@mediapipe/holistic';
import * as cam from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';
import { reshape } from 'mathjs';


import { message } from 'antd'
import 'antd/dist/antd.css'

import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "./Video.css"
import Switch from 'react-input-switch';


import ChromeOnly from './web_components/chromeOnly'
import UserVideo from './web_components/UserVideo'
import { Height } from '@material-ui/icons'

const server_url = process.env.NODE_ENV === 'production' ? 'https://adoring-sea-27008.pktriot.net' : "http://localhost:4001"

function dragElement(elmnt) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
		elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
	}

	function closeDragElement() {
		// stop moving when mouse button is released:
		document.onmouseup = null;
		document.onmousemove = null;
	}

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}
	// move the DIV from anywhere inside the DIV:
	if (document.getElementById("canvas-header")) {
		// if present, the header is where you move the DIV from:
		document.getElementById("canvas-header").onmousedown = dragMouseDown;
	} else {
		// otherwise, move the DIV from anywhere inside the DIV:
		elmnt.onmousedown = dragMouseDown;
	}
}

var connections = {}
const peerConnectionConfig = {
	'iceServers': [
		// { 'urls': 'stun:stun.services.mozilla.com' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
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
			userType: 0
		}
		connections = {}
		this.camera = null

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

	getMedia = () => {
		this.setState({
			video: this.videoAvailable,
			audio: this.audioAvailable
		}, () => {
			this.getUserMedia()
			this.connectToSocketServer()
		})
	}

	getUserMedia = () => {
		if ((this.state.video && this.videoAvailable) || (this.state.audio && this.audioAvailable)) {
			navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.then(this.getUserMediaSuccess)
				.then((stream) => { })
				.catch((e) => console.log(e))
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
		socket = io.connect(server_url, { secure: true })

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
						var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
						if (searchVidep !== null) { // if i don't do this check it make an empyt square
							searchVidep.srcObject = event.stream
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
		if (Caption) dragElement(Caption);
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
						<div className="bottom-btn" onLoad={this.changeBodyColor()}>
							<IconButton id='bot-btn' className='mic' onClick={this.handleAudio}>
								{this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
							</IconButton>

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
								<Input className='chat-content-msg' placeholder="Tin nhắn" value={this.state.message} onKeyPress={(e) => {if(e.key === "Enter")this.sendMessage}} onChange={e => this.handleMessage(e)} />
								<Button className='chat-send-btn' variant="contained" color="primary" onClick={this.sendMessage}>Gửi</Button>
							</Modal.Footer>
						</Modal>

						<div className="main-content">
							<div className='copy-box' style={{ paddingTop: "20px", height: "60px" }}>
								<Input value={window.location.href} disable="true" style={{ color: "white", width:"maxContent"}}></Input>
								<Button style={{
									background: "#A5402D", color: "white", marginLeft: "20px",
									width: "100px", fontSize: "12px"
								}} onClick={this.copyUrl}>Sao chép</Button>
							</div>

							<Row id="main" className="video-container">
								<div id='user'>
									<UserVideo></UserVideo>
									{/* <video id="user-video" ref={this.localVideoref} autoPlay muted></video> */}
									{/* <a className='user-name'>{this.state.username}</a> */}
								</div>
							</Row>
							{/* <div id="caption-canvas"><a id="caption-text">{this.handleCaption}Phụ đề sẽ trông như thế này</a><button id="close-caption">X</button></div> */}

						</div>
					</div>
				}
			</div>
		)
	}
}

export default Video