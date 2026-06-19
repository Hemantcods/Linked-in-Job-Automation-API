import express from 'express'
import LinkedInRouter from './modules/linkedIn/linkedin.router'
const app = express();

app.use(express.json());
app.use("/api/v1/linkedin",LinkedInRouter)


export default app;