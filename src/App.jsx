import React from "react";

function App() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "300px",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "1rem",
        zIndex: 9999,
      }}
    >
      <h2>My Addons Panel</h2>
      <button
        onClick={() => alert("Do something!")}
        style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
      >
        Example Button
      </button>
      <p style={{ marginTop: "1rem" }}>Overlay content goes here.</p>
    </div>
  );
}

export default App;