import './App.css';
import React from 'react';
import { useEffect } from 'react';

function resampleTo16kHZ(audioData, origSampleRate = 44100) {
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

function float32ToSigned16(floatArray) {
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

async function startRecord(data) {
  const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false})

  if (stream) {
    // call when the stream inactive
    stream.oninactive = () => {
      window.close();
    };
    const socket = new WebSocket("ws://twilight-wave-85883.pktriot.net:22760");
      // const socket = new WebSocket("ws://localhost:8080");
    let isServerReady = false;


    socket.addEventListener("open", () => {
      if (isServerReady === false) {
        alert("Server is ready")
        isServerReady = true;
      }
    });

    // socket.addEventListener("message", (event) => {
    //   const e = JSON.parse(event.data);
    //   console.log("Message from server ", e);
    //   if (e.type === "caption") {
    //     chrome.tabs.sendMessage(data.currentTabId, {
    //       type: "realtime-caption",
    //       caption: e.text
    //     })
    //   }
    //   else if (e.type === "vsl")
    //     chrome.tabs.sendMessage(data.currentTabId, {
    //       run: "realtime",
    //       data: e.sentence_arr
    //     })
    // });

    const audioDataCache = [];
    const context = new AudioContext();
    const mediaStream = context.createMediaStreamSource(stream);
    const recorder = context.createScriptProcessor(4096, 1, 1);

    recorder.onaudioprocess = async (event) => {
      console.dir(isServerReady);
      if (!context || !isServerReady) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const audioData16kHz = resampleTo16kHZ(inputData, context.sampleRate);

      console.dir(inputData);
      audioDataCache.push(inputData);
      socket.send(float32ToSigned16(audioData16kHz));
    };

    // Prevent page mute
    mediaStream.connect(recorder);
    recorder.connect(context.destination);
    mediaStream.connect(context.destination);
    // }
  } else {
    window.close();
  }
}

function App() {
  
  useEffect(() => {
    startRecord()
  },[])

  return (
    <div className="App">
      <h1>Say something</h1>
    </div>
  );
}

export default App;
