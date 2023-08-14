import logo from "./logo.svg";
import "./App.css";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useState, useEffect } from "react";
import axios from "axios";

function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

function App() {
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const [wait, setWait] = useState(false);

  const setting = {
    language: "id",
    continuous: false,
  };

  const startListening = () => {
    setWait(false);
    SpeechRecognition.startListening(setting);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const reseTrans = () => {
    resetTranscript();
  };

  // console.log("trans", transcript);
  // console.log("final", finalTranscript);
  // console.log(transcript);

  useEffect(() => {
    if (!wait) {
      startListening();
    }
    if (transcript !== "" && !listening && !wait) {
      console.log("kirim");
      setWait(true);
      const data = {
        queryText: transcript,
        sessionId: "123",
        languageCode: "id-ID",
      };

      var config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "http://localhost:5000/dialogflow-text",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: data,
      };

      axios(config)
        .then((response) => {
          // console.log(
          //   response.data.responseFromDialogFlow[0].queryResult.intent
          //     .ArrayBuffer
          // );

          // let parameters =
          //   response.data.responseFromDialogFlow[0].queryResult.parameters
          //     .fields;

          // let key = Object.keys(parameters)[0];

          // if (key !== undefined) {
          //   // console.log(parameters[key].stringValue);
          // } else {
          //   startListening();
          //   // console.log("response undefined");
          // }

          if (response.data.audio.data.length > 0) {
            const audioContext = new window.AudioContext();
            const sourceNode = audioContext.createBufferSource();
            audioContext.decodeAudioData(
              toArrayBuffer(response.data.audio.data),
              (decodedBuffer) => {
                sourceNode.buffer = decodedBuffer;
                sourceNode.connect(audioContext.destination);
                sourceNode.start();
                reseTrans();
                sourceNode.addEventListener("ended", () => {
                  console.log("Audio selesai diputar");
                  startListening();
                });
              }
            );
          } else {
            startListening();
          }
        }, [])
        .catch((err) => {
          console.log(err);
        });
    }
  });

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  } else {
    return (
      <div className="App">
        <div>
          <p>Microphone: {listening ? "on" : "off"}</p>
          <button onClick={startListening}>Start</button>
          <button onClick={stopListening}>Stop</button>
          <button onClick={reseTrans}>Reset</button>
          <p>{transcript}</p>
        </div>
      </div>
    );
  }
}

export default App;
