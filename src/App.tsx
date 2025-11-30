// src/App.tsx
import React from "react";
import SOMPage from "./app/routes/SOM";   // <- RELATIVE path
import "./styles/globals.css";

export default function App() {
  return (
    <div style={{ 
      minHeight: "100vh",
      background: "#0b0f14",
      position: "fixed",
      inset: 0,
      overflowY: "auto"
    }}>
      <SOMPage />
    </div>
  );
}
