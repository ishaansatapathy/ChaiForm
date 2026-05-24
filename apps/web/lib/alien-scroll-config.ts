/**

 * Alien scroll sections — black / grey / white palette only.

 */



export type AlienUiPanel = "fields" | "logic" | "stream" | "charts" | "deploy";



export type AlienScrollSection = {

  id: string;

  index: string;

  image: string;

  from: "left" | "right";

  scale?: number;

  blendMode?: "screen" | "normal";

  uiPanel: AlienUiPanel;

  eyebrow: string;

  heading: string;

  body: string;

  tag: string;

};



const ALIEN_DIR = "/images/ben10/aliens";



export const ALIEN_GLOW_FILTER =

  "drop-shadow(0 0 22px rgba(220, 220, 220, 0.16)) drop-shadow(0 0 50px rgba(160, 160, 160, 0.07))";



export const ALIEN_SCROLL_SECTIONS: AlienScrollSection[] = [

  {

    id: "ben",

    index: "01",

    image: `${ALIEN_DIR}/ben.png`,

    from: "right",

    scale: 1.08,

    uiPanel: "fields",

    eyebrow: "Build",

    heading: "Hero time\nfor your forms.",

    body: "Add your questions, shape the flow, share one link. No maze of menus — just build and send.",

    tag: "Blueprint",

  },

  {

    id: "upgrade",

    index: "02",

    image: `${ALIEN_DIR}/upgrade.png`,

    from: "left",

    scale: 1.02,

    uiPanel: "logic",

    eyebrow: "Flow",

    heading: "One question\nat a time.",

    body: "Typeform-style respondent UX — progress bar, keyboard Enter, and a focused question per step.",

    tag: "Arm",

  },

  {

    id: "xlr8",

    index: "03",

    image: `${ALIEN_DIR}/xlr8.png`,

    from: "right",

    scale: 1.06,

    uiPanel: "stream",

    eyebrow: "Live feed",

    heading: "Answers at\nlightning pace.",

    body: "Submissions show up instantly. No refresh spiral — watch them land as they happen.",

    tag: "Stream",

  },

  {

    id: "heatblast",

    index: "04",

    image: `${ALIEN_DIR}/heatblast-cutout.png`,

    from: "left",

    scale: 0.98,

    uiPanel: "charts",

    eyebrow: "Insights",

    heading: "Heat where it\nmatters.",

    body: "Clear charts, simple breakdowns, exports that just work. Know what your audience said.",

    tag: "Decode",

  },

  {

    id: "omnitrix",

    index: "05",

    image: `${ALIEN_DIR}/omnitrix-cutout.png`,

    from: "right",

    scale: 1.05,

    uiPanel: "deploy",

    eyebrow: "Launch",

    heading: "One link.\nGo everywhere.",

    body: "Share, embed, or drop it in a QR. Your form runs from a single place — point people and go.",

    tag: "Activate",

  },

];


