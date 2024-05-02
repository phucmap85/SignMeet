import React, { Component } from 'react';
import { Input, Button, IconButton } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import "./Home.css"
import { ReactComponent as Logo } from './components/SignMeetLogo.svg';

class Home extends Component {
	constructor(props) {
		super(props)
		this.state = {
			url: ''
		}
	}

	handleChange = (e) => this.setState({ url: e.target.value })

	join = () => {
		var url
		if (this.state.url !== "") {
			url = this.state.url.split("/")
			window.location.href = `/${url[url.length - 1]}`
		} else {
			url = Math.random().toString(36).substring(2, 7)
			window.location.href = `/${url}`
		}
	}

	render() {
		return (
			<div className="container2">
				<div className='join-box-wrapper'>
					<h1 className='title'>SignMeet</h1>
					<p className='info'>Ứng dụng hỗ trợ giao tiếp trực tuyến dành cho người khiếm thính</p>
					<div className='join-box'>
						<p>Tham gia cuộc họp</p>
						<div className='interactive-content'>
							<Input placeholder="Mã cuộc họp" onChange={e => this.handleChange(e)} />
							<Button variant="contained" color="primary" onClick={this.join} style={{background: "#A5402D"}}>{this.state.url === '' ? "Bắt đầu" : "Tham gia"}</Button>
						</div>
					</div>
				</div>

				<div className='description'>
					{/* <img className='logo' src={require('./components/SignMeetLogo.png')}/> */}
					<Logo />
				</div>
			</div>
		)
	}
}

export default Home;