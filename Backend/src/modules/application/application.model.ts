import { Schema, model, InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "ApplicationBatch",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    recruiterEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "opened", "replied", "interview", "rejected", "offer"],
      default: "sent",
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ApplicationSchema.index(
  {
    candidateId: 1,

    jobId: 1,
  },
  {
    unique: true,
  },
);

export type Application = InferSchemaType<typeof ApplicationSchema>;

export const ApplicationModel = model("Application", ApplicationSchema);

const ApplicationBatchSchema = new Schema(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    searchQuery: {
      type: String,
      required: true,
    },

    totalJobs: {
      type: Number,
      required: true,
    },

    completedJobs: {
      type: Number,
      default: 0,
    },

    failedJobs: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type ApplicationBatch = InferSchemaType<typeof ApplicationBatchSchema>;

export const ApplicationBatchModel = model(
  "ApplicationBatch",
  ApplicationBatchSchema,
);
