import express from 'express'
import LinkedInRouter from './modules/linkedIn/linkedin.router'
import candidateRouter from "./modules/candidate/routes"
import ApplicationRouter from "./modules/application/application.routes"
const app = express();
app.use(express.json());
app.use("/api/v1/linkedin",LinkedInRouter)
app.use("/api/v1/candidate",candidateRouter)
app.use("/api/v1/application",ApplicationRouter)
export default app;