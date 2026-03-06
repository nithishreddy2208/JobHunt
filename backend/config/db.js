import mongoose from 'mongoose'


export const connectDb = async () => {
    const MONGO_URI = process.env.MONGO_URI;
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log("Connection Error:", error.message);
        throw error;
    }
}