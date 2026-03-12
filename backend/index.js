import express from 'express'
import dotenv from 'dotenv'
dotenv.config();
import cookieParser from 'cookie-parser'
import { connectDb } from './config/db.js'
import userRoutes from "./routes/user.routes.js"
import companyRoutes from "./routes/company.routes.js"


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/api/user',userRoutes);
app.use('/api/company',companyRoutes)


app.get("/", (req, res) => {
    res.send("JobHunt Backend Running");
});

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    try {
        await connectDb();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.log("Server failed to start");
    }
};

startServer();