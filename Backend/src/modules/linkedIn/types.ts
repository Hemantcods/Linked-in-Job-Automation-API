import { ObjectId } from "mongoose";

export interface PostData {
  postUrl: string;
  author: string;
  content: string;
  postedTime: string;
}

export interface JobExtraction {
  index:number,
  title: string | null;
  companyName: string | null;
  recruiterName: string | null;
  location: string | null;
  employmentType: string | null;
  experienceRequired: string | null;
  skills: string[];
  email: string | null;
  linkedinProfile: string | null;
  jobSummary: string | null;
}