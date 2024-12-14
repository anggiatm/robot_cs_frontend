import React from "react";

const styles = {
  root: {
    display: "flex",
    justifyContent: "space-around",
    margin: "1em",
    marginTop: "-1.2em",
    width: "5em",
    height: "3em",
  },
  circle: {
    borderRadius: "50%",
    width: "0.7em",
    height: "0.7em",
    transformOrigin: "50% 100%",
    animation: "bounce1 1s linear infinite",
    boxShadow: "10px 10px 5px rgba(0, 0, 0, 0.2)", // Tambahkan drop shadow
  },
  circleA: {
    background: "#ee4b10",
  },
  circleB: {
    background: "#ee4b10",
    animationDelay: "0.1s",
  },
  circleC: {
    background: "#ee4b10",
    animationDelay: "0.2s",
  },
};

function BounceAnimation() {
  return (
    <div style={styles.root}>
      <div style={{ ...styles.circle, ...styles.circleA }}></div>
      <div style={{ ...styles.circle, ...styles.circleB }}></div>
      <div style={{ ...styles.circle, ...styles.circleC }}></div>
    </div>
  );
}

export default BounceAnimation;
