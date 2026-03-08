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
      <h2>Sidebar / Addons</h2>
      <button onClick={() => alert("Button clicked!")}>
        Example Action
      </button>
      <p style={{ marginTop: "1rem" }}>
        Your custom React UI goes here.
      </p>
    </div>
  );
}

export default App;