import React from "react";

function App() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "1rem",
      }}
    >
      <h2>Sidebar / Addons</h2>
      <button onClick={() => alert("Button clicked!")}>Action</button>
      <p style={{ marginTop: "1rem" }}>Your overlay content here</p>
    </div>
  );
}

export default App;