import React from "react";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

export const Header: React.FC = () => {
  return (
    <div
      style={{
        padding: "70px 60px 0",
        textAlign: "center",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Logo area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            width: 56,
            height: 56,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
            color: "#fff",
            fontFamily,
            boxShadow: `0 4px 20px rgba(233, 69, 96, 0.4)`,
          }}
        >
          B
        </div>

        {/* Logo text */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: -0.5,
            fontFamily,
            background: "linear-gradient(135deg, #1a1a2e 0%, #3d4663 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          BandLadder
        </div>
      </div>

      {/* Practice label */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.textSecondary,
          letterSpacing: 3,
          textTransform: "uppercase" as const,
          marginBottom: 30,
          fontFamily,
        }}
      >
        IELTS Listening Practice
      </div>
    </div>
  );
};
