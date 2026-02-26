import React from "react";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

export const Instructions: React.FC = () => {
  return (
    <div
      style={{
        textAlign: "center",
        margin: "35px 60px",
        padding: "20px 30px",
        background: COLORS.subtleBg,
        borderRadius: 16,
        border: `1px solid ${COLORS.subtleBorder}`,
        position: "relative",
        zIndex: 2,
      }}
    >
      <p
        style={{
          fontSize: 22,
          color: COLORS.textTertiary,
          fontWeight: 400,
          fontFamily,
        }}
      >
        <span style={{ fontSize: 28, marginRight: 8 }}>{"\uD83C\uDFA7"}</span>
        Listen and complete the sentences
      </p>
    </div>
  );
};
