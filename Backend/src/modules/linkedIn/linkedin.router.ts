import express from "express";
import { ScrapePosts } from "./linkedIn.controller";

const router=express.Router()

router.post("/scrape",ScrapePosts)


export default router;