import React from "react";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

export const Watermark: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 2,
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.watermark,
          letterSpacing: 2,
          fontFamily,
        }}
      >
        @bandladder
      </span>
    </div>
  );
};
