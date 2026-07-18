import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const colors = {
  background: '#050816',
  cyan: '#55e6ff',
  violet: '#9d7bff',
  white: '#f7fbff',
};

export const AionexIntro = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({frame, fps, config: {damping: 14, stiffness: 90}});
  const glow = interpolate(frame, [0, 45, 89], [0.45, 0.9, 0.45]);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        background: `radial-gradient(circle at 50% 45%, rgba(85, 230, 255, ${glow * 0.22}), transparent 34%), ${colors.background}`,
        color: colors.white,
        display: 'flex',
        fontFamily: 'Arial, Helvetica, sans-serif',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          border: `2px solid rgba(85, 230, 255, ${glow})`,
          borderRadius: '50%',
          boxShadow: `0 0 90px rgba(157, 123, 255, ${glow * 0.65})`,
          height: 440,
          position: 'absolute',
          transform: `scale(${0.72 + entrance * 0.28}) rotate(${frame * 0.4}deg)`,
          width: 440,
        }}
      />
      <div
        style={{
          opacity: entrance,
          textAlign: 'center',
          transform: `translateY(${(1 - entrance) * 70}px)`,
        }}
      >
        <div
          style={{
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: 28,
            textShadow: `0 0 36px rgba(85, 230, 255, ${glow})`,
          }}
        >
          AIONEX
        </div>
        <div
          style={{
            color: colors.cyan,
            fontSize: 30,
            letterSpacing: 13,
            marginTop: 24,
            textTransform: 'uppercase',
          }}
        >
          Intelligence in motion
        </div>
      </div>
    </AbsoluteFill>
  );
};
