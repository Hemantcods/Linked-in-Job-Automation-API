import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { extractResumeText } from "../resume/parser";
import { JsonPromptForResume } from "../../ai/prompt";
import { generateJson } from "../../ai/ai";

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
    console.log(resumeText)
    const prompt=JsonPromptForResume(resumeText)
    const ResumeData=await generateJson(prompt)
    console.log(ResumeData)
    res.status(200).json({
        data:ResumeData
    })
})