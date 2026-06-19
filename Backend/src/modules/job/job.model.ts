import { InferSchemaType, Schema, model } from "mongoose";

const JobSchema = new Schema(
  {
    postUrl: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      default: null,
    },

    companyName: {
      type: String,
      default: null,
    },

    recruiterName: {
      type: String,
      default: null,
    },

    recruiterEmail: {
      type: String,
      default: null,
    },

    linkedinProfile: {
      type: String,
      default: null,
    },

    location: {
      type: String,
      default: null,
    },

    employmentType: {
      type: String,
      default: null,
    },

    experienceRequired: {
      type: String,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    jobSummary: {
      type: String,
      default: null,
    },

    source: {
      type: String,
      default: "linkedin",
    },

    scrapeJobId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


JobSchema.index({ companyName: 1 });

JobSchema.index({ recruiterEmail: 1 });

JobSchema.index({ title: 1 });

JobSchema.index({ createdAt: -1 });

export type Job = InferSchemaType<typeof JobSchema>;

export const JobModel = model(
  "Job",
  JobSchema
);