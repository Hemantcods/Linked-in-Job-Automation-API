import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { scrapeLinkedInPosts } from "./scraper";
import { PostData } from "./types";
import { RawPost, RawPostModel } from "./rawpost.model";
import { isWithin24Hours, parseLinkedInTime } from "../../utils/linkedin";
import { count } from "node:console";

export const ScrapePosts=asyncHandler(async(req:Request,res:Response)=>{
    const {querry}=req.body
    if (!querry){
        throw new AppError("Please provide Querry",409)
    }
    let posts:PostData[]=[]
    try{
        posts=await scrapeLinkedInPosts(querry)
        // filter the lat 24 hour posts
        const filteredPosts=posts.filter((post)=>isWithin24Hours(post.postedTime))
        if (filteredPosts.length==0){
            throw new AppError("No posts found",404)
        }
        // convert the time of filtered post
        const Timedposts=filteredPosts.map((post)=>({
            postUrl:post.postUrl,
            content:post.content,
            author:post.author,
            postedTime:parseLinkedInTime(post.postedTime)
        }))
        console.log(Timedposts)
        if (Timedposts.length==0){
            throw new AppError("No posts found",404)
        }
        // store the raw post to the db 
        const scrapeJobId=crypto.randomUUID()
        const rawPosts = Timedposts.map((post) => ({
            scrapeJobId,
            postUrl: post.postUrl,
            content: post.content,
            authorName: post.author || null,
            postedAt: post.postedTime,
        }));
        await RawPostModel.insertMany(rawPosts,{
            ordered:false
        })
        res.status(200).json({
        status:"success",
        data:{
            scrapeJobId,
            count:rawPosts.length
        }
    })
    }catch(error:any){
        throw new AppError(error.message,500)
    }

})

