import { Candidate } from "../candidate/candidate.model"
import {Job} from '../job/job.model'
export interface SendEmail{
    candidate:Candidate
    job:Job,
    resumePath:string,
    highlights:string[]
}