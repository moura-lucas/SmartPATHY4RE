export const SIDEBAR_WIDTH_STORAGE_KEY = "sidebar-width";
export const SIDEBAR_DEFAULT_WIDTH = 240;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 420;

/** Inlined in <head> so a saved width applies before the first paint. */
export const SIDEBAR_WIDTH_INIT_SCRIPT = `try{var w=Number(localStorage.getItem("${SIDEBAR_WIDTH_STORAGE_KEY}"));if(w>=${SIDEBAR_MIN_WIDTH}&&w<=${SIDEBAR_MAX_WIDTH})document.documentElement.style.setProperty("--sidebar-width",w+"px")}catch{}`;
