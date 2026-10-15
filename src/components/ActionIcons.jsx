// Material Symbols glyphs for the card action row (Back / Check / Skip).
const Svg = ({ size, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 -960 960 960"
    fill="currentColor" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const ChevronLeftIcon = ({ size = '1.4em' }) => (
  <Svg size={size}><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" /></Svg>
);

export const ChevronRightIcon = ({ size = '1.4em' }) => (
  <Svg size={size}><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" /></Svg>
);

export const TaskAltIcon = ({ size = '1.3em' }) => (
  <Svg size={size}>
    <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q65 0 123 19t107 53l-58 59q-38-24-81-37.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-18-2-36t-6-35l65-65q11 32 17 66t6 70q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-56-216L254-466l56-56 114 114 400-401 56 56-456 457Z" />
  </Svg>
);

// Compass needle in a ring: the guided tour button.
export const TourIcon = ({ size = '1.25em' }) => (
  <Svg size={size}><path d="m319-280 161-73 161 73 15-15-176-425-176 425 15 15ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></Svg>
);
