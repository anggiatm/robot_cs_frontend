import { useEffect, useRef, useState, useCallback } from "react";

const useWebSocket = (url, reconnectInterval = 3000) => {
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  const reconnectRef = useRef(false); // Status untuk menghindari reconnect berlebih

  const connect = () => {
    // console.log("Connecting to WebSocket...");
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      reconnectRef.current = false; // Reset status reconnect ketika berhasil terhubung
    };

    socketRef.current.onmessage = (event) => {
      // console.log("Received data:", event.data);
      setMessages((prevMessages) => [...prevMessages, event.data]);
    };

    socketRef.current.onclose = () => {
      // console.log("Disconnected from WebSocket server");
      attemptReconnect();
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      attemptReconnect();
    };
  };

  const attemptReconnect = () => {
    if (!reconnectRef.current) {
      reconnectRef.current = true; // Tandai sedang reconnect
      setTimeout(() => {
        console.log("Attempting to reconnect...");
        connect(); // Coba reconnect
      }, reconnectInterval);
    }
  };

  // Inisialisasi koneksi pertama kali
  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url]);

  // Fungsi untuk mengirim pesan
  const sendMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      // console.log("WebSocket not connected");
    }
  }, []);

  return { sendMessage, messages };
};

export default useWebSocket;
