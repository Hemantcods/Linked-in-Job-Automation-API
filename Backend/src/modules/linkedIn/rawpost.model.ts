import { InferSchemaType, Schema, model } from "mongoose";

const RawPostSchema = new Schema(
  {
    scrapeJobId: {
      type: String,
      required: true,
      index: true,
    },

    postUrl: {
      type: String,
      required: true,
      unique: true,
    },

    content: {
      type: String,
      required: true,
    },

    authorName: {
      type: String,
      default: null,
    },

    postedAt: {
      type: Date,
      default: null,
    },

    scrapedAt: {
      type: Date,
      default: Date.now,
    },

    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    llmError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

RawPostSchema.index({
  processingStatus: 1,
});

RawPostSchema.index({
  scrapeJobId: 1,
});

RawPostSchema.index({
  scrapedAt: -1,
});

export type RawPost = InferSchemaType<typeof RawPostSchema>;

export const RawPostModel = model("RawPost", RawPostSchema);
