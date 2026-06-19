import express from "express";
import { ProcessPosts, ScrapePosts } from "./linkedIn.controller";

const router=express.Router()

router.post("/scrape",ScrapePosts)
router.post("/process/:scrapeJobId",ProcessPosts)

export default router;