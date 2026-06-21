import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { extractResumeText } from "../resume/parser";
import { JsonPromptForResume } from "../../ai/prompt";
import { generateJson } from "../../ai/ai";
import {  CandidateModel } from "./candidate.model";
import { Candidate } from "./types";

export const SaveCandidate=asyncHandler(async(req:Request,res:Response)=>{
    const {filePath}=req.body
    if (!filePath){
        throw new AppError("Please proved file path",400)
    }
    const resumeText=await extractResumeText(filePath)
    if(!resumeText){
        throw new AppError("Resume is Empty",404)
    }
    // call the llm
    const prompt=JsonPromptForResume(resumeText)
    const ResumeData:Candidate=await generateJson<Candidate>(prompt)
    // store the resume data in the db
    const candidate=await CandidateModel.findOneAndUpdate({
        email:ResumeData.email,
    },{
        ...ResumeData,
        resumeFilePath:filePath,
        parsedAt:new Date(),
    },{
        upsert:true,
        new:true,
    })
    res.status(200).json({
        status:"success",
        candidate
    })
})