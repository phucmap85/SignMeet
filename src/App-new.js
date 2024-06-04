import './App.css';
import React, { Component } from 'react'
import io from 'socket.io-client'

var socket = null

class App extends Component {
  // constructor(props) {
  //   super(props)

  // }

  connectToSocketServer = () => {
    socket = io('http://localhost:4001', { secure: true })
    // console.dir(socket);

    socket.on('connect', () => {
      // alert("connected");
      socket.emit('join-call', window.location.href)

      socket.on('sigml', (msg) => {
        console.log(msg);
        window.CWASA.playSiGMLText(msg, 0);
      })
    })
  }

  sendMsg = async () => {
    const get = await fetch("https://raw.githubusercontent.com/PL508/test/master/test.txt")
    const response = await get.json();
    const tmp = `<?xml version="1.0" encoding="utf-8"?>
    <sigml>
    <hns_sign gloss="mug">
    <hamnosys_nonmanual>
    <hnm_mouthpicture picture="mVg"/>
    </hamnosys_nonmanual>
    <hamnosys_manual>
    <hamfist/> <hamthumbacrossmod/>
    <hamextfingerol/> <hampalml/>
    <hamshoulders/>
    <hamparbegin/> <hammoveu/> <hamarcu/>
    <hamreplace/> <hamextfingerul/> <hampalmdl/>
    <hamparend/>
    </hamnosys_manual>
    </hns_sign>
    <hns_sign gloss="take">
    <hamnosys_nonmanual>
    <hnm_mouthpicture picture="te_Ik"/>
    </hamnosys_nonmanual>
    <hamnosys_manual>
    <hamceeall/> <hamextfingerol/> <hampalml/>
    <hamlrbeside/> <hamshoulders/> <hamarmextended/>
    <hamreplace/> <hamextfingerl/> <hampalml/>
    <hamchest/> <hamclose/>
    </hamnosys_manual>
    </hns_sign>
    <hns_sign gloss="i">
    <hamnosys_nonmanual>
    <hnm_mouthpicture picture="a_I"/>
    </hamnosys_nonmanual>
    <hamnosys_manual>
    <hamfinger2/> <hamthumbacrossmod/>
    <hamextfingeril/> <hampalmr/>
    <hamchest/> <hamtouch/>
    </hamnosys_manual>
    </hns_sign>
    </sigml>
    `;

    console.log(response.sigml);
    // window.CWASA.playSiGMLText(tmp, 0);
    socket.emit("sigml", tmp);
  }

  componentDidMount() {
    this.connectToSocketServer()
  }
  render() {
    return (
      <div>
        <h1>Hello world</h1>
        <div className='CWASAPanel av0'></div>
        <button onClick={this.sendMsg}>click me</button>
      </div>
    )
  }
}
export default App;
