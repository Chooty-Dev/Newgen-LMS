"use client";

import * as React from "react";

const loaderStyles = `
.center-loader-wrapper {
  color: var(--foreground);
  -webkit-user-select: none;
  user-select: none;
  background-color: transparent;
  border-radius: 50%;
  justify-content: center;
  align-items: center;
  width: 200px;
  height: 200px;
  font-size: 1.25rem;
  font-weight: 500;
  display: flex;
  position: relative;
  letter-spacing: 0.04em;
}

.center-loader-ring {
  aspect-ratio: 1;
  z-index: 0;
  background-color: transparent;
  border-radius: 50%;
  width: 100%;
  animation: 2.2s linear infinite center-loader-rotate;
  position: absolute;
  top: 0;
  left: 0;
}

@keyframes center-loader-rotate {
  0% {
    transform: rotate(90deg);
    box-shadow: inset 0 8px 18px var(--foreground), inset 0 20px 30px var(--ring), inset 0 50px 60px var(--accent);
  }
  50% {
    transform: rotate(270deg);
    box-shadow: inset 0 8px 18px var(--foreground), inset 0 20px 18px var(--secondary), inset 0 40px 60px var(--primary);
  }
  to {
    transform: rotate(450deg);
    box-shadow: inset 0 8px 18px var(--foreground), inset 0 20px 30px var(--ring), inset 0 50px 60px var(--accent);
  }
}

.center-loader-letter {
  opacity: 0.35;
  z-index: 1;
  border: none;
  border-radius: 50ch;
  animation: 2s infinite center-loader-letter-anim;
  display: inline-block;
  transform: translateY(0);
}

.center-loader-letter:nth-child(1) { animation-delay: 0s; }
.center-loader-letter:nth-child(2) { animation-delay: 0.1s; }
.center-loader-letter:nth-child(3) { animation-delay: 0.2s; }
.center-loader-letter:nth-child(4) { animation-delay: 0.3s; }
.center-loader-letter:nth-child(5) { animation-delay: 0.4s; }
.center-loader-letter:nth-child(6) { animation-delay: 0.5s; }
.center-loader-letter:nth-child(7) { animation-delay: 0.6s; }
.center-loader-letter:nth-child(8) { animation-delay: 0.7s; }
.center-loader-letter:nth-child(9) { animation-delay: 0.8s; }

@keyframes center-loader-letter-anim {
  0%, to {
    opacity: 0.35;
    transform: translateY(0);
  }
  20% {
    opacity: 1;
    transform: scale(1.18);
  }
  40% {
    opacity: 0.65;
    transform: translateY(0);
  }
}
`;

export function CenterSwitchLoader() {
  return (
    <>
      <style>{loaderStyles}</style>
      <div className="center-loader-wrapper">
        <span className="center-loader-letter">S</span>
        <span className="center-loader-letter">w</span>
        <span className="center-loader-letter">i</span>
        <span className="center-loader-letter">t</span>
        <span className="center-loader-letter">c</span>
        <span className="center-loader-letter">h</span>
        <span className="center-loader-letter">i</span>
        <span className="center-loader-letter">n</span>
        <span className="center-loader-letter">g</span>
        <div className="center-loader-ring" />
      </div>
    </>
  );
}

export default CenterSwitchLoader;
