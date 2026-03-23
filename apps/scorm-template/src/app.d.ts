import type { Scorm12API, Scorm2004API } from "./utils/scorm/types";

export { };

declare global {
    interface Window {
        API?: Scorm12API;
        API_1484_11?: Scorm2004API;
    }
}