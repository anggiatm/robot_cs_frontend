import axios from "axios";
const instance = axios.create({
  baseURL: "http://localhost:5000", // Ganti dengan base URL Anda
  timeout: 5000, // Timeout maksimum untuk permintaan (opsional)
  headers: {
    "Content-Type": "multipart/form-data", // Header tipe konten (opsional)
  },
});

export default instance;
