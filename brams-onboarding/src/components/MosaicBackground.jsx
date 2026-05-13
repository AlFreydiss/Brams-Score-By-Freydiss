import { useMemo } from 'react'

// Tu poseras tes images dans /public/mosaic/ nommées 01.jpg ... 12.jpg
// (jpg ou webp, idéalement ~600x400, des scènes One Piece / Brams).
// Si une image manque, on retombe sur un dégradé sombre.

const TILES = 12

export default function MosaicBackground() {
  const items = useMemo(
    () =>
      Array.from({ length: TILES }, (_, i) => {
        const n = String(i + 1).padStart(2, '0')
        return { src: `/mosaic/${n}.jpg`, delay: i * 60 }
      }),
    []
  )

  return (
    <div className="mosaic" aria-hidden="true">
      <div className="mosaic-grid">
        {items.map((t, i) => (
          <div
            key={i}
            className="mosaic-tile"
            style={{
              backgroundImage: `url(${t.src})`,
              animationDelay: `${t.delay}ms`
            }}
          />
        ))}
      </div>
      <div className="mosaic-overlay" />
      <div className="mosaic-vignette" />

      <style>{`
        .mosaic {
          position: fixed;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }
        .mosaic-grid {
          position: absolute;
          inset: -4%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 6px;
          animation: slowZoom 24s ease-out forwards;
        }
        .mosaic-tile {
          background-color: #1c1d22;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0;
          animation: fadeIn 1.4s ease-out forwards;
        }
        .mosaic-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10, 10, 13, 0.78);
        }
        .mosaic-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 35%,
            rgba(10, 10, 13, 0.6) 100%
          );
        }

        @media (max-width: 700px) {
          .mosaic-grid {
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
