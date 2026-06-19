import { Schema, model, InferSchemaType } from "mongoose";

const ApplicationSchema = new Schema(
  {
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
      enum: [
        "sent",
        "opened",
        "replied",
        "interview",
        "rejected",
        "offer"
      ],
      default: "sent",
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,
  }
);

ApplicationSchema.index(
  {
    candidateId: 1,
    jobId: 1,
  },
  {
    unique: true,
  }
);

export type Application = InferSchemaType<
  typeof ApplicationSchema
>;

export const ApplicationModel = model(
  "Application",
  ApplicationSchema
);