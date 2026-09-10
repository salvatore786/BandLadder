import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BLOBS,
  COLOR,
  HEADER_BAND,
  LAYOUT,
  PAGE_GRADIENT,
  SHADOW,
  TYPE,
  VIDEO,
  alpha,
} from "../brand";
import { FONT } from "../fonts";

/**
 * The page shell: a warm apricot-to-cream ground, five drifting colour blobs,
 * a tinted header band, the 82px margin and the fizzIELTS footer.
 *
 * The whole page also creeps in by ~3% over the reel's length. It is barely
 * perceptible frame to frame, and it means the composition is never completely
 * static even while a beat is being held.
 */
export const Page: React.FC<{
  accent: string;
  header: React.ReactNode;
  children: React.ReactNode;
}> = ({ accent, header, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const pushIn = interpolate(frame, [0, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: PAGE_GRADIENT, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${pushIn})`,
          transformOrigin: "50% 42%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Blobs />

        <HeaderBand accent={accent}>{header}</HeaderBand>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            paddingLeft: LAYOUT.margin,
            paddingRight: LAYOUT.margin,
            paddingTop: 26,
            paddingBottom: LAYOUT.margin + LAYOUT.footerHeight,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>

        <Footer />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HEADER_HEIGHT = 320;

/** The title sits on a solid warm band, not floating on the page. */
const HeaderBand: React.FC<{ accent: string; children: React.ReactNode }> = ({
  accent,
  children,
}) => (
  <div
    style={{
      position: "relative",
      flexShrink: 0,
      minHeight: HEADER_HEIGHT,
      background: HEADER_BAND,
      borderBottom: `4px solid ${alpha(accent, 0.28)}`,
      boxShadow: "0 10px 30px rgba(22, 18, 51, 0.06)",
      padding: `${LAYOUT.margin - 20}px ${LAYOUT.margin}px 26px`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

/**
 * Five blurred colour shapes, each drifting on its own slow cycle. Deliberately
 * visible: this is what makes the page feel warm before a word is read.
 */
const Blobs: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {BLOBS.map((b, i) => {
        // Long, mutually prime periods so the field never visibly repeats.
        const period = 340 + i * 47;
        const t = (frame / period) * Math.PI * 2;
        const driftX = Math.sin(t + i) * 26;
        const driftY = Math.cos(t * 0.8 + i * 1.7) * 22;
        const breathe = 1 + Math.sin(t * 0.6 + i) * 0.07;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x * VIDEO.width + driftX,
              top: b.y * VIDEO.height + driftY,
              width: b.w * VIDEO.width,
              height: b.h * VIDEO.height,
              borderRadius: "50%",
              backgroundColor: b.color,
              opacity: b.opacity,
              filter: "blur(84px)",
              transform: `scale(${breathe})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Footer: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: LAYOUT.margin,
      right: LAYOUT.margin,
      bottom: LAYOUT.margin - 26,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
    }}
  >
    <div style={{ fontFamily: FONT.sans, fontSize: 32, fontWeight: 700, letterSpacing: -0.4 }}>
      <span style={{ color: COLOR.ink }}>fizz</span>
      <span style={{ color: COLOR.purple }}>IELTS</span>
    </div>
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: TYPE.footer.size,
        letterSpacing: TYPE.footer.tracking,
        textTransform: "uppercase",
        color: COLOR.body,
      }}
    >
      @fizzielts_ · bandladder.com
    </div>
  </div>
);

/**
 * White card, 2px border, with a thick accent stroke across the top edge only.
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
