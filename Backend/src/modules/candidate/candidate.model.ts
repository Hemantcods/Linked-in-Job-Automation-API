import { HydratedDocument, InferSchemaType, Schema, model } from "mongoose";

const CandidateSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index:true,
    },

    name: {
      type: String,
      required: true,
    },linkedin:{
      type:String,
      default:null
    },
    phone: {
      type: String,
      default: null,
    },

    location: {
      type: String,
      default: null,
    },

    experienceYears: {
      type: String,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    projects: [
      {
        name: String,
        skillsUsed: [String],
        summary: String,
      },
    ],

    experience: [
      {
        title: String,
        company: String,
        summary: String,
      },
    ],

    resumeFilePath: {
      type: String,
      required: true,
    },

    parsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
export type Candidate = InferSchemaType<
  typeof CandidateSchema
>;

export type  CandidateDocumet=
  HydratedDocument<Candidate>;

export const CandidateModel = model(
  "Candidate",
  CandidateSchema
);