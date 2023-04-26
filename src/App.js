import logo from "./logo.svg";
import "./App.css";

import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useEffect, useState } from "react";
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

  const [trans, setTrans] = useState("");
  const [finalTrans, setFinalTrans] = useState("");
  const [chat, setChat] = useState("");

  useEffect(() => {
    if (trans !== finalTrans) {
      // sendHandle(trans)
      const data = {
        queryText: trans,
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
          // console.log(response.data.text);
          console.log(
            response.data.responseFromDialogFlow[0].queryResult.intent
              .displayName
          );

          let parameters =
            response.data.responseFromDialogFlow[0].queryResult.parameters
              .fields;

          let key = Object.keys(parameters)[0];

          if (key != undefined) {
            console.log(parameters[key].stringValue);
          }

          if (response.data.audio.data.length > 0) {
            const audioContext = new window.AudioContext();
            const sourceNode = audioContext.createBufferSource();
            audioContext.decodeAudioData(
              toArrayBuffer(response.data.audio.data),
              (decodedBuffer) => {
                sourceNode.buffer = decodedBuffer;
                sourceNode.connect(audioContext.destination);
                sourceNode.start();
              }
            );
          }
        }, [])
        .catch((err) => {
          console.log(err);
        });
      setFinalTrans(trans);
    }
  });

  if (finalTranscript !== trans && finalTranscript.length > 0) {
    setTrans(finalTranscript);
    resetTranscript();
  }

  if (!browserSupportsSpeechRecognition) {
    return <span>Your browser doesn't support</span>;
  }

  const setting = {
    language: "id",
    continuous: true,
  };

  if (browserSupportsSpeechRecognition) {
    SpeechRecognition.startListening(setting);
  } else {
    // Fallback behaviour
  }

  const sendHandle = (trans) => {};

  const onChangeHandle = (event) => {
    setChat(event.target.value);
  };

  return (
    <div>
      <p>Listening : {listening ? "on" : "off"}</p>
      <button onClick={resetTranscript}>Reset</button>
      <p>{transcript}</p>
      <p>{trans}</p>

      <audio>j</audio>

      <input type="text" onChange={onChangeHandle} value={chat}></input>
      <button onClick={sendHandle}>Send</button>
      {/* <button onClick={res}>resume</button> */}
    </div>
  );
}

export default App;
