import express from 'express'
import LinkedInRouter from './modules/linkedIn/linkedin.router'
import candidateRouter from "./modules/candidate/routes"
const app = express();
app.use(express.json());
app.use("/api/v1/linkedin",LinkedInRouter)
app.use("/api/v1/candidate",candidateRouter)

export default app;