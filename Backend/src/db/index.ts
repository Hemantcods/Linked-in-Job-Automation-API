import {env} from '../config/env'
import mongoose from 'mongoose'
export const connectDB=async():Promise<void>=>{
    try{
        if (!env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB connected");
    }catch(error){
        console.error("DB connection error:", error);
        process.exit(1);
    }
}