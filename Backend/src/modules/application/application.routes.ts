import express from "express";
import { ApplyApplication, GetAllApplications } from "./application.controller";

const router=express.Router()

router.get('/',GetAllApplications)
router.post('/apply',ApplyApplication)


export default router