import { useState, useEffect } from "react";

import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import axios from "axios";

import useWebSocket from "../hook/useWebSocket";

function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

function generate_random_string(prefix, length = 5) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return prefix + "_" + result;
}

const setting = {
  language: "id",
  continuous: false,
};

const Panel = () => {
  const { sendMessage, messages } = useWebSocket(
    process.env.REACT_APP_ROBOT_WS_ADDR
  ); // Ganti URL sesuai server WebSocket Anda
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const [wait, setWait] = useState(false);
  const [wsMessage, setWsMessage] = useState("");
  const [robotStat, setRobotStat] = useState("listening");
  const [lastRequest, setLastRequest] = useState(new Date());
  const [sessionId, setSessionId] = useState(generate_random_string("http"));

  const handleSendWsMessage = () => {
    sendMessage(wsMessage); // Mengirim pesan melalui WebSocket
    setWsMessage(""); // Mengosongkan input setelah mengirim
  };

  const startListening = () => {
    setWait(false);
    SpeechRecognition.startListening(setting);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setWait(true);
  };

  const reseTrans = () => {
    resetTranscript();
  };

  const getAudio = (data, endpoint) => {
    setWait(true);

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: process.env.REACT_APP_SERVER_ADDR + endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then((response) => {
        console.log(response.data.response);

        if (response.data.audio && response.data.audio.length > 50) {
          const audioContext = new window.AudioContext();
          const audioBuffer = Uint8Array.from(atob(response.data.audio), (c) =>
            c.charCodeAt(0)
          );
          const arrayBuffer = toArrayBuffer(audioBuffer);

          audioContext
            .decodeAudioData(arrayBuffer)
            .then((decodedBuffer) => {
              const sourceNode = audioContext.createBufferSource();
              sourceNode.buffer = decodedBuffer;

              // Membuat AnalyserNode
              const analyser = audioContext.createAnalyser();
              analyser.fftSize = 2048; // Ukuran FFT untuk resolusi data frekuensi
              const dataArray = new Uint8Array(analyser.frequencyBinCount);

              // Menghubungkan sourceNode ke AnalyserNode dan audioContext
              sourceNode.connect(analyser);
              analyser.connect(audioContext.destination);

              let animationId;

              // Fungsi untuk mengambil dan menampilkan data frekuensi hanya saat audio diputar
              const logFrequencyData = () => {
                analyser.getByteTimeDomainData(dataArray);
                let averageValue =
                  dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                let normalizedValue = Math.round(
                  Math.pow(
                    Math.min(4096, Math.max(0, averageValue * 16)) - 2025,
                    2
                  )
                );
                if (normalizedValue > 300) {
                  setRobotStat("mouthup");
                  // stat = SPEAKING_MOUTH_UP;
                } else {
                  // stat = SPEAKING_MOUTH_DOWN;
                  setRobotStat("mouthdown");
                }
                animationId = requestAnimationFrame(logFrequencyData); // Memanggil fungsi ini secara berulang
              };

              // Mulai pemutaran audio dan logging data frekuensi
              sourceNode.start();
              logFrequencyData(); // Memulai logging saat audio mulai diputar

              // Menghentikan logging ketika audio selesai diputar
              sourceNode.addEventListener("ended", () => {
                console.log("Audio selesai diputar");
                cancelAnimationFrame(animationId);
                startListening(); // Memulai pendengaran kembali setelah audio selesai
              });

              reseTrans();
            })
            .catch((error) => {
              console.error("Error decoding audio:", error);
              startListening();
            });
        } else {
          startListening(); // Memulai pendengaran jika tidak ada audio yang cukup panjang
        }
      })
      .catch((err) => {
        console.error("Error in axios request:", err);
        const data = {};
        startListening(data);
      });
  };

  // Fungsi yang akan dijalankan setiap 5 menit
  const boring = () => {
    console.log(lastRequest);
    if (
      new Date() - lastRequest >
      parseInt(process.env.REACT_APP_BORING_TIMEOUT)
    ) {
      getAudio({}, "boring");
      generate_random_string("http");
      setLastRequest(new Date());
    }
  };

  useEffect(() => {
    const intervalId = setInterval(boring, 1000); // 300000 ms = 5 menit
    // Membersihkan interval saat komponen di-unmount
    return () => clearInterval(intervalId);
  }, [lastRequest]);

  useEffect(() => {
    if (!wait) {
      startListening();
    }
    if (transcript !== "" && !listening && !wait) {
      setLastRequest(new Date());

      const data = {
        text: transcript,
        session_id: sessionId,
        config: {
          temperature: 0.2,
        },
      };

      getAudio(data, "answer");
    }
  }, [wait, transcript, listening, lastRequest]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  } else {
    return (
      <div>
        <p>Microphone: {listening ? "on" : "off"}</p>
        <button id="start" onClick={startListening}>
          Start
        </button>
        <button onClick={stopListening}>Stop</button>
        <button onClick={reseTrans}>Reset</button>
        <button onClick={boring}>Boring</button>
        <p>{transcript}</p>
      </div>
    );
  }
};

export default Panel;
