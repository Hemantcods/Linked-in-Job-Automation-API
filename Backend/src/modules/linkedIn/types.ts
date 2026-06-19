import { ObjectId } from "mongoose";

export interface PostData {
  postUrl: string;
  author: string;
  content: string;
  postedTime: string;
}
