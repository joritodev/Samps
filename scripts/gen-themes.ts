import { writeFileSync } from "node:fs";
import { buildThemesCss } from "../lib/theme/themes-css";

writeFileSync(new URL("../app/themes.css", import.meta.url), buildThemesCss());
console.log("app/themes.css gerado");
