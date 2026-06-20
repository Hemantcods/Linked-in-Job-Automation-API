import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApplicationBatchModel, ApplicationModel } from "./application.model";
import { AppError } from "../../utils/AppError";
import { CandidateModel } from "../candidate/candidate.model";
import { JobModel } from "../job/job.model";
import { processApplications } from "./application.service";

export const GetAllApplications = asyncHandler(
  async (req: Request, res: Response) => {
    const applications = await ApplicationModel.find()
      .populate("candidateId", "name email")
      .populate("jobId", "title companyName recruiterEmail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      count: applications.length,
      data: applications,
    });
  },
);

export const ApplyApplication = asyncHandler(
  async (req: Request, res: Response) => {
    console.log(req.body)
    const { candidateEmail, searchQuery } = req.body;
    if (!candidateEmail || !searchQuery) {
      throw new AppError("Please provide all fields", 400);
    }
    const candidate = await CandidateModel.findOne({
      email: candidateEmail,
    });
    if (!candidate) {
      throw new AppError("Candidate not found", 404);
    }
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const jobs = await JobModel.find({
      createdAt: {
        $gte: yesterday,
      },
      $or: [
        {
          title: {
            $regex: searchQuery,
            $options: "i",
          },
        },
        {
          skills: {
            $regex: searchQuery,
            $options: "i",
          },
        },
      ],
    });

    if (!jobs.length) {
      throw new AppError("No matching jobs found", 404);
    }
    // Create batch record
    const batch=await ApplicationBatchModel.create({
      candidateId:candidate._id,
      searchQuery,
      totalJobs:jobs.length,
      status:"pending"
    })
    res.status(200).json({
      status: "success",
      batchId:batch._id,
      message: "Application process started",
    });

    // Start processing in background
    processApplications(batch._id.toString(),candidate, jobs).catch(console.error);
  },
);