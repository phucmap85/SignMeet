import React from "react";

function ChromeOnly() {
    return (
        <div style={{
            background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
            textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"
        }}>
            <h1>Sorry, this works only with Google Chrome</h1>
        </div>
    );
}

export default ChromeOnly;