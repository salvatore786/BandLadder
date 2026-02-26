import React from "react";
import { COLORS } from "../styles/colors";
import { fontFamily } from "../styles/fonts";

interface TitleSectionProps {
  category: string;
  scenarioDescription: string;
}

export const TitleSection: React.FC<TitleSectionProps> = ({
  category,
  scenarioDescription,
}) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "0 60px",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Category badge */}
      <div
        style={{
          display: "inline-block",
          padding: "10px 30px",
          background: "rgba(233, 69, 96, 0.15)",
          border: "1px solid rgba(233, 69, 96, 0.3)",
          borderRadius: 50,
          fontSize: 20,
          fontWeight: 600,
          color: COLORS.primaryLight,
          letterSpacing: 2,
          textTransform: "uppercase" as const,
          marginBottom: 25,
          fontFamily,
        }}
      >
        {category}
      </div>

      {/* Main title */}
      <h1
        style={{
          fontSize: 52,
          fontWeight: 800,
          marginBottom: 8,
          letterSpacing: -0.5,
          color: "rgba(20, 25, 45, 0.92)",
          fontFamily,
        }}
      >
        Sentence Completion
      </h1>

      {/* Underline */}
      <div
        style={{
          width: 200,
          height: 5,
          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
          margin: "0 auto 30px",
          borderRadius: 3,
        }}
      />

      {/* Scenario text */}
      <p
        style={{
          fontSize: 26,
          fontWeight: 400,
          color: "rgba(20, 25, 45, 0.55)",
          lineHeight: 1.5,
          padding: "0 20px",
          fontFamily,
        }}
      >
        {scenarioDescription}
      </p>
    </div>
  );
};
