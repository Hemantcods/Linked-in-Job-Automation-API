import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || "3000",
  MONGO_URI: process.env.MONGO_URI || "",
  GMAIL_USER_ID: process.env.GMAIL_USER || "",
  GMAIL_PASSWORD: process.env.GMAIL_PASS || "",
};
