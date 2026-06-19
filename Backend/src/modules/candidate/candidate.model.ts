import { InferSchemaType, Schema, model } from "mongoose";

const CandidateSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
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

CandidateSchema.index(
  { email: 1 },
  { unique: true }
);

export type Candidate = InferSchemaType<
  typeof CandidateSchema
>;

export const CandidateModel = model(
  "Candidate",
  CandidateSchema
);