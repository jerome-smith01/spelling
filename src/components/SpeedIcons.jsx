// Speedometer glyphs for the syllable speed picker (Material "speed" style, 960 grid, currentColor).
// Needle left = slowest, up = slow, right = normal.
const Svg = ({ size, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 -960 960 960"
    fill="currentColor" aria-hidden="true" focusable="false">{children}</svg>
);

export function SpeedSlowestIcon({ size = '1.25em' }) {
  return (
    <Svg size={size}>
      <path d="M536-343q26-26 24-60t-30-56q-79-62-164-115T199-682q54 83 107 167.5T418-347q20 29 56 29.5t62-25.5ZM205-160q-22 0-40.5-9.5T135-198q-28-48-42-100.5T79-406q1-56 18.5-109T146-616l48 76q-17 32-26 66.5t-9 69.5q0 44 11.5 85.5T205-240h551q21-36 32.5-76.5T800-400q0-133-93.5-226.5T480-720q-37 0-72.5 9T340-686l-76-48q48-32 102.5-49T480-800q83 0 155.5 31.5t127 86q54.5 54.5 86 127T880-400q0 54-14 105t-40 97q-11 19-30 28.5t-40 9.5H205Zm274-238Z" />
    </Svg>
  );
}

export function SpeedSlowIcon({ size = '1.25em' }) {
  return (
    <Svg size={size}>
      <path d="M565-750A360 360 0 0 1 779-200H181A360 360 0 0 1 395-750" fill="none" stroke="currentColor" strokeWidth="80" strokeLinejoin="round" />
      <path d="M480-800 411-412A70 70 0 1 0 549-412Z" />
    </Svg>
  );
}

export function SpeedNormalIcon({ size = '1.25em' }) {
  return (
    <Svg size={size}>
      <path d="M204-160q-22 0-40.5-9.5T134-198q-26-47-40-97.5T80-400q0-83 31.5-156T197-683q54-54 127-85.5T480-800q23 0 46 3t46 8l-53 72q-10-2-19.5-2.5T480-720q-134 0-227 93t-93 227q0 42 11.5 82.5T204-240h551q22-36 33-77t11-83q0-66-25.5-126T700-631l21-87q75 57 116.5 140.5T879-400q1 54-13 105t-41 97q-11 19-29.5 28.5T755-160H204Zm243-168q32 14 64.5 1.5T554-372q29-97 52.5-194T649-762q-63 79-122.5 159T409-440q-20 29-8 63t46 49Zm32-73Z" />
    </Svg>
  );
}
