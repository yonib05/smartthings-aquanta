import * as process from "process";


export const AQUANTA_CREDENTIALS = {
    "email": process.env.AQUANTA_EMAIL || "user@domain.com",
    "password": process.env.AQUANTA_PASSWORD || "password"
};


export const AQUANTA_GOOGLE_KEY =  process.env.GOOGLE_KEY || 'AIzaSyBHWHB8Org9BWCH-YFzis-8oEbMaKmI2Tw';
