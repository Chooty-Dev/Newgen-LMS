"use client";

import * as React from "react";

const loaderStyles = `
.center-loader-wrapper {
  color: #184880;
  -webkit-user-select: none;
  user-select: none;
  background-color: transparent;
  border-radius: 50%;
  justify-content: center;
  align-items: center;
  width: 210px;
  height: 210px;
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  position: relative;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
    box-shadow: inset 0 8px 18px #184880, inset 0 20px 30px #38BDF8, inset 0 50px 60px #EBF3FE;
  }
  50% {
    transform: rotate(270deg);
    box-shadow: inset 0 8px 18px #184880, inset 0 20px 22px #60A5FA, inset 0 45px 65px #0284C7;
  }
  to {
    transform: rotate(450deg);
    box-shadow: inset 0 8px 18px #184880, inset 0 20px 30px #38BDF8, inset 0 50px 60px #EBF3FE;
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
  color: #184880;
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
    color: #627D98;
  }
  20% {
    opacity: 1;
    transform: scale(1.22);
    color: #184880;
  }
  40% {
    opacity: 0.75;
    transform: translateY(0);
    color: #0284C7;
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
