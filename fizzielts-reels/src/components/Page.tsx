import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, LAYOUT, TYPE, SHADOW } from "../brand";
import { FONT } from "../fonts";

/**
 * The page shell every composition sits inside: cream ground, two soft accent
 * blobs, the 82px margin, and the fizzIELTS footer.
 */
export const Page: React.FC<{
  accent: string;
  children: React.ReactNode;
}> = ({ accent, children }) => (
  <AbsoluteFill style={{ backgroundColor: COLOR.cream }}>
    <Blobs accent={accent} />
    <AbsoluteFill
      style={{
        padding: LAYOUT.margin,
        paddingBottom: LAYOUT.margin + LAYOUT.footerHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </AbsoluteFill>
    <Footer />
  </AbsoluteFill>
);

/**
 * Two large blurred shapes tinted with the module accent. Deliberately weak —
 * the page has to still read as cream, not as a coloured gradient.
 */
const Blobs: React.FC<{ accent: string }> = ({ accent }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        top: -300,
        right: -230,
        width: 620,
        height: 580,
        borderRadius: "48% 52% 42% 58% / 55% 45% 55% 45%",
        backgroundColor: accent,
        opacity: 0.16,
        filter: "blur(70px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: -330,
        left: -250,
        width: 580,
        height: 540,
        borderRadius: "56% 44% 60% 40% / 42% 58% 42% 58%",
        backgroundColor: accent,
        opacity: 0.16,
        filter: "blur(70px)",
      }}
    />
  </AbsoluteFill>
);

const Footer: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: LAYOUT.margin,
      right: LAYOUT.margin,
      bottom: LAYOUT.margin - 24,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
    }}
  >
    <div style={{ fontFamily: FONT.sans, fontSize: 30, fontWeight: 700, letterSpacing: -0.4 }}>
      <span style={{ color: COLOR.ink }}>fizz</span>
      <span style={{ color: COLOR.purple }}>IELTS</span>
    </div>
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: TYPE.footer.size,
        letterSpacing: TYPE.footer.tracking,
        textTransform: "uppercase",
        color: COLOR.muted,
      }}
    >
      @fizzielts_ · bandladder.com
    </div>
  </div>
);

/**
 * White card, 18px radius, 2px border, with a 4px accent stroke across the top
 * edge only.
 */
export const Card: React.FC<{
  accent: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ accent, children, style }) => (
  <div
    style={{
      position: "relative",
      backgroundColor: COLOR.white,
      border: `${LAYOUT.cardBorder}px solid ${COLOR.border}`,
      borderRadius: LAYOUT.cardRadius,
      boxShadow: SHADOW.card,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: LAYOUT.cardAccentStroke,
        backgroundColor: accent,
      }}
    />
    {children}
  </div>
);

/** Uppercase mono label — used for eyebrows and for card section headings. */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
}> = ({ children, color = COLOR.deep, size = TYPE.eyebrow.size }) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: size,
      fontWeight: 500,
      letterSpacing: TYPE.eyebrow.tracking,
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);
