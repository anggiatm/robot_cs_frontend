import { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import { toArrayBuffer } from "../utils/toArrayBuffer";
import { generateRandomString } from "../utils/generateRandomString";

import { RobotIpContext } from "./RobotIpContext";
import useWebSocket from "../hook/useWebSocket";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

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

const Panel2 = () => {
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [robotStat, setRobotStat] = useState("listening");
  const [displayText, setDisplayText] = useState("Silahkan tanya Mimi !");
  const sessionId = useRef(generateRandomString("http"));
  const lastRequestRef = useRef(new Date()); // Inisialisasi ref

  const { robotIp } = useContext(RobotIpContext);
  const wsUrl = robotIp ? `ws://${robotIp}/ws` : `ws://localhost/ws`;
  //   Establish WebSocket connection
  const { sendMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true, // Reconnect automatically
  });

  const listeningState = () => {
    SpeechRecognition.startListening({
      language: "id",
      continuous: true,
    });
    setRobotStat("listening");
    setDisplayText("Silahkan tanya Mimi !");
  };

  const thinkingState = () => {
    SpeechRecognition.stopListening();
    setRobotStat("thinking");
    setDisplayText("Mimi sedang berfikir");
    resetTranscript();
  };

  const speakingState = (answer) => {
    SpeechRecognition.stopListening();
    setRobotStat("speaking");
    setDisplayText(answer);
  };

  useEffect(() => {
    console.log(`useEffect Switch Robot Stat: ${robotStat}`);
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
  }, [robotStat]);

  useEffect(() => {
    listeningState();
  }, []);

  const getAudio = (data, endpoint) => {
    console.log("kirim");
    const config = {
      method: "POST",
      maxBodyLength: Infinity,
      url: process.env.REACT_APP_SERVER_ADDR + endpoint,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios(config)
      .then((response) => {
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

                animationId = requestAnimationFrame(logFrequencyData);
              };

              // Mulai pemutaran audio dan logging data frekuensi
              sourceNode.start();
              logFrequencyData(); // Memulai logging saat audio mulai diputar

              // Menghentikan logging ketika audio selesai diputar
              sourceNode.addEventListener("ended", () => {
                console.log("Audio selesai diputar");
                cancelAnimationFrame(animationId);
                // startListening();
                listeningState();
              });

              //   sendMessage("neckc");
            })
            .catch((error) => {
              console.error("Error decoding audio:", error);
              //   startListening();
              listeningState();
            });
        } else {
          //   startListening();
          listeningState();
        }
      })
      .catch((err) => {
        console.error("Error in axios request:", err);
        // startListening();
        listeningState();
      });
  };

  const boring = () => {
    if (
      new Date() - lastRequestRef.current >
        parseInt(process.env.REACT_APP_BORING_TIMEOUT) &&
      robotStat === "listening"
    ) {
      console.log("useEffect Booring Interval");
      thinkingState();
      getAudio({}, "boring");
      sessionId.current = generateRandomString("http");
      lastRequestRef.current = new Date();
    } else {
      console.log("useEffect Booring Interval check only");

      console.log(new Date() - lastRequestRef.current);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(boring, 300000); // 300000 ms = 5 menit
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (finalTranscript !== "") {
      console.log(`Final Transcript : ${finalTranscript}`);
      thinkingState();
      const data = {
        text: finalTranscript,
        session_id: sessionId.current,
        config: {
          temperature: 0.2,
        },
      };
      getAudio(data, "answer");
    }
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
            width: "80%",
            transform: "translate(-50%, -50%)",
            color: "#ee4b10",
            textAlign: "center",
            justifyContent: "center",
            alignItems: "center",
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

        <p>Robot Stat: {robotStat}</p>
        <p>mic: {listening ? "on" : "off"}</p>
        <button id="start" onClick={listeningState}>
          Start
        </button>
        <p>{transcript}</p>
        <p>{finalTranscript}</p>
      </>
    );
  }
};

export default Panel2;
