export const THEME_STORAGE_KEY = "theme";

/** Inlined in <head>: light is the default, whatever the operating system prefers. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch{}`;
