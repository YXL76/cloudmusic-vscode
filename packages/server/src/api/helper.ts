export const API_CONFIG = { protocol: process.env["CM_HTTPS_API"] === "0" ? <const>"http" : <const>"https" };
