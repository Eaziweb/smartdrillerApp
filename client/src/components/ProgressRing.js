// components/ProgressRing.js
"use client"
import React from "react";
import styles from "../styles/course-selection.module.css";

const ProgressRing = ({ percentage, radius = 13, stroke = 2 }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={styles.progressRing}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className={styles.progressSvg}
      >
        <circle
          stroke="#e6e6e6"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#0066ff"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <span className={styles.progressText}>{percentage}%</span>
    </div>
  );
};

export default ProgressRing;
