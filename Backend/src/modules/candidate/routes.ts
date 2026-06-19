import express from "express";
import { SaveCandidate } from "./controller";


const router=express.Router()

router.post('/save',SaveCandidate)


export default router