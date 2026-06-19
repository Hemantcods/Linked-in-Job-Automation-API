import express from 'express'
import LinkedInRouter from "./modules/linkedIn/linkedin.router"
const app = express()
const port = 3000

app.use(express.json())
app.use("/api/v1/linkedin",LinkedInRouter)
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})