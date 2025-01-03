import { useState, useContext, useEffect } from "react";
import { RobotIpContext } from "./RobotIpContext";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";
import useWebSocket from "../hook/useWebSocket";
import { Box, Typography } from "@mui/material";

import BounceAnimation from "./BounceAnimation";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const LISTENING = 1;
const THINKING = 2;
const SPEAKING_MOUTH_UP = 3;
const SPEAKING_MOUTH_DOWN = 4;
const SPEAKING_NECK_L = 5;
const SPEAKING_NECK_R = 6;
const SPEAKING_NECK_C = 7;

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
  const { robotIp } = useContext(RobotIpContext);

  const wsUrl = robotIp ? `ws://${robotIp}/ws` : `ws://localhost/ws`;

  // Establish WebSocket connection
  const { sendMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true, // Reconnect automatically
  });

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

  const [displayText, setDisplayText] = useState("Silahkan tanya Mimi !");

  const handleSendWsMessage = () => {
    sendMessage(wsMessage); // Mengirim pesan melalui WebSocket
    setWsMessage(""); // Mengosongkan input setelah mengirim
  };

  const startListening = () => {
    setWait(false);
    SpeechRecognition.startListening(setting);
    setRobotStat("listening");
    setDisplayText("Silahkan tanya Mimi !");
  };

  const stopListening = () => {
    setWait(true);
    SpeechRecognition.stopListening();
    setRobotStat("thinking");
  };

  const reseTrans = () => {
    resetTranscript();
  };

  const getAudio = (data, endpoint) => {
    console.log("kirim");
    // setRobotStat("thinking");
    // setDisplayText("Mimi sedang berfikir");

    const config = {
      method: "POST",
      maxBodyLength: Infinity,
      url: process.env.REACT_APP_SERVER_ADDR + endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    // stopListening();
    axios(config)
      .then((response) => {
        // console.log(response.data.response);
        setDisplayText(response.data.response);

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
              analyser.fftSize = 256; // Ukuran FFT untuk resolusi data frekuensi
              const dataArray = new Uint8Array(analyser.frequencyBinCount);

              // Menghubungkan sourceNode ke AnalyserNode dan audioContext
              sourceNode.connect(analyser);
              analyser.connect(audioContext.destination);

              let animationId;

              // Fungsi untuk mengambil dan menampilkan data frekuensi hanya saat audio diputar
              const logFrequencyData = () => {
                analyser.getByteTimeDomainData(dataArray);
                const averageValue =
                  dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const normalizedValue = Math.round(
                  Math.pow(
                    Math.min(4096, Math.max(0, averageValue * 16)) - 2025,
                    2
                  )
                );

                if (normalizedValue > 2000 && normalizedValue < 10000) {
                  setRobotStat("mouthup");
                } else if (normalizedValue > 10000) {
                  setRobotStat("neckl");
                } else if (normalizedValue < 50) {
                  setRobotStat("neckr");
                } else if (normalizedValue < 200 && normalizedValue > 50) {
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
                startListening();
              });

              sendMessage("neckc");

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
    if (
      new Date() - lastRequest >
      parseInt(process.env.REACT_APP_BORING_TIMEOUT)
    ) {
      getAudio({}, "boring");
      setSessionId(generate_random_string("http"));
      setLastRequest(new Date());
    }
  };

  useEffect(() => {
    const intervalId = setInterval(boring, 1000); // 300000 ms = 5 menit
    console.log("useEffect Booring Interval");
    return () => clearInterval(intervalId);
  }, [lastRequest]);

  useEffect(() => {
    console.log("useEffect Switch Robot Stat");
    switch (robotStat) {
      case "mouthdown":
        sendMessage(SPEAKING_MOUTH_DOWN);
        break;

      case "mouthup":
        sendMessage(SPEAKING_MOUTH_UP);
        break;

      case "listening":
        sendMessage(LISTENING);
        break;

      case "thinking":
        sendMessage(THINKING);
        break;

      case "neckl":
        sendMessage(SPEAKING_NECK_L);
        break;

      case "neckr":
        sendMessage(SPEAKING_NECK_R);
        break;

      case "neckc":
        sendMessage(SPEAKING_NECK_C);
        break;
    }
  }, []);

  useEffect(() => {
    console.log("useEffect listening getAudio");
    console.log(finalTranscript);
    console.log(robotStat);
    if (robotStat === "listening") {
      startListening();
    }
    // if (!wait) {
    //   startListening();
    // }
    // // if (!listening && !wait) {
    // setLastRequest(new Date());

    // const data = {
    //   text: finalTranscript,
    //   session_id: sessionId,
    //   config: {
    //     temperature: 0.2,
    //   },
    // };
    // getAudio(data, "answer");
    // stopListening();
    // }
  }, [finalTranscript]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  } else {
    return (
      <>
        <Box
          sx={{
            position: "relative",
            height: "100vh",
            backgroundImage: "url(/background.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "blur(2px)",
            zIndex: -1,
          }}></Box>
        <Box
          sx={{
            display: "flex",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#ee4b10",
            textAlign: "center",
            textShadow: "10px 10px 4px rgba(0, 0, 0, 0.3)",
            zIndex: 1,
          }}>
          <Typography variant="h3" component="div">
            {transcript === "" ? displayText : transcript}
          </Typography>

          {robotStat === "thinking" && transcript === "" ? (
            <BounceAnimation />
          ) : robotStat === "listening" && transcript === "" ? (
            <FontAwesomeIcon icon={faMicrophone} className="shake fa-3x" />
          ) : (
            ""
          )}
        </Box>

        <div>
          <p>Microphone: {listening ? "on" : "off"}</p>
          <button id="start" onClick={startListening}>
            Start
          </button>
          <button onClick={stopListening}>Stop</button>
          <button onClick={reseTrans}>Reset</button>
          <button onClick={boring}>Boring</button>

          <p>Robot IP: {robotIp || "Not set yet."}</p>

          <button onClick={handleSendWsMessage}>Send Ws</button>
        </div>
      </>
    );
  }
};

export default Panel;
