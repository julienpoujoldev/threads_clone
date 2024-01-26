import mongoose from "mongoose";

let isConnected = false;

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URL) return console.log("MONGO_DB not find");
  if (isConnected) {
    console.log("MONGO_DB already connected");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL);
    isConnected = true; // Set the connection status to true
    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};
