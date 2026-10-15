// Timer glyphs for the pause-length picker (Material "timer" style, 960 grid, currentColor).
// The letter inside is S / M / L for short, medium, long.
const TIMER_BODY = 'M360-840v-80h240v80H360Zm-19.5 731.5Q275-137 226-186t-77.5-114.5Q120-366 120-440t28.5-139.5Q177-645 226-694t114.5-77.5Q406-800 480-800q62 0 119 20t107 58l56-56 56 56-56 56q38 50 58 107t20 119q0 74-28.5 139.5T734-186q-49 49-114.5 77.5T480-80q-74 0-139.5-28.5ZM678-242q82-82 82-198t-82-198q-82-82-198-82t-198 82q-82 82-82 198t82 198q82 82 198 82t198-82ZM480-440Z';

const LETTERS = {
  S: 'M360-610H600V-530H440V-480H600V-270H360V-350H520V-400H360Z',
  M: 'M360-270V-610H440L480-530L520-610H600V-270H520V-480L480-400L440-480V-270Z',
  L: 'M360-610H440V-350H600V-270H360Z'
};

function TimerIcon({ letter, size = '1.25em' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 -960 960 960"
      fill="currentColor" aria-hidden="true" focusable="false">
      <path d={`${LETTERS[letter]}${TIMER_BODY}`} />
    </svg>
  );
}

export const PauseShortIcon = (props) => <TimerIcon letter="S" {...props} />;
export const PauseMediumIcon = (props) => <TimerIcon letter="M" {...props} />;
export const PauseLongIcon = (props) => <TimerIcon letter="L" {...props} />;
