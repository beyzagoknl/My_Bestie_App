// Load our .env variables
import dotenv from "dotenv";
import express from "express";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/connectDB.js";
import { logInfo, logError } from "./util/logging.js";

const port = process.env.PORT;

if (port == null) {
  logError(new Error("Cannot find a PORT number, did you create a .env file?"));
}

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      logInfo(`Server started on port ${port}`);
    });
  } catch (error) {
    logError(error);
  }
};

if (process.env.NODE_ENV === "production") {
  app.use(
    express.static(new URL("../../client/dist", import.meta.url).pathname)
  );
  // Redirect * requests to give the client data
  app.get("*", (req, res) =>
    res.sendFile(
      new URL("../../client/dist/index.html", import.meta.url).pathname
    )
  );
}

// Start the server
startServer();
