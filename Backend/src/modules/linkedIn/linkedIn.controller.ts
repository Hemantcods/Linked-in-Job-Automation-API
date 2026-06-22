import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { scrapeLinkedInPosts } from "./scraper";
import { PostData } from "./types";
import { RawPost, RawPostModel } from "./rawpost.model";
import { isWithin24Hours, parseLinkedInTime } from "../../utils/linkedin";
import { containsEmail, processPosts } from "./processor";
import { JobModel } from "../job/job.model";

export const ScrapePosts = asyncHandler(async (req: Request, res: Response) => {
  const { querry } = req.body;
  if (!querry) {
    throw new AppError("Please provide Querry", 409);
  }
  let posts: PostData[] = [];
  try {
    posts = await scrapeLinkedInPosts(querry);
    // filter the lat 24 hour posts
    const filteredPosts = posts.filter((post) =>
      isWithin24Hours(post.postedTime) && containsEmail(post.content)
    );
    console.log(filteredPosts)
    if (filteredPosts.length == 0) {
      throw new AppError("No posts found", 404);
    }
    // convert the time of filtered post
    const Timedposts = filteredPosts.map((post) => ({
      postUrl: post.postUrl,
      content: post.content,
      author: post.author,
      postedTime: parseLinkedInTime(post.postedTime),
    }));
    console.log(Timedposts);
    if (Timedposts.length == 0) {
      throw new AppError("No posts found", 404);
    }
    // store the raw post to the db
    const scrapeJobId = crypto.randomUUID();
    const rawPosts = Timedposts.map((post) => ({
      scrapeJobId,
      postUrl: post.postUrl,
      content: post.content,
      authorName: post.author || null,
      postedAt: post.postedTime,
    }));
    await RawPostModel.insertMany(rawPosts, {
      ordered: false,
    });
    res.status(200).json({
      status: "success",
      data: {
        scrapeJobId,
        count: rawPosts.length,
      },
    });
  } catch (error: any) {
    throw new AppError(error.message, 500);
  }
});

export const ProcessPosts = asyncHandler(
  async (req: Request, res: Response) => {
    const { scrapeJobId } = req.params;
    if (!scrapeJobId) {
      throw new AppError("Please provide scrapeJobId", 409);
    }
    console.log(scrapeJobId);
    const posts = await RawPostModel.find({
      scrapeJobId,
      // TODO
      // processingStatus: "pending",
    });
    if (!posts.length) {
      throw new AppError("No pending Post found with given Scrape id", 404);
    }
    await RawPostModel.updateMany(
      {
        _id: {
          $in: posts.map((p) => p._id),
        },
      },
      {
        processingStatus: "processing",
      },
    );
    // Process with LLM
    let jobs;

    try {
      jobs = await processPosts(posts);
    } catch (error: any) {
      await RawPostModel.updateMany(
        {
          _id: {
            $in: posts.map((p) => p._id),
          },
        },
        {
          processingStatus: "failed",
          llmError: error.message,
        },
      );

      throw new AppError(error.message, 500);
    }

    if (!jobs.length) {
      await RawPostModel.updateMany(
        {
          _id: {
            $in: posts.map((p) => p._id),
          },
        },
        {
          processingStatus: "pending",
        },
      );
      throw new AppError("Processing the posts failed", 404);
    }
    // TODO
    // store them in the Job db
    await JobModel.insertMany(jobs,{
        ordered:false
    });

    await RawPostModel.updateMany(
      {
        _id: {
          $in: posts.map((p) => p._id),
        },
      },
      {
        processingStatus: "completed",
        llmError: null,
      },
    );

    res.status(200).json({
      status: "success",
      message:"Stored sucessfully in the db"
    });
  },
);
