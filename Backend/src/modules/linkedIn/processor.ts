import { generateJson } from "../../ai/ai";
import { JsonPromptFromPost } from "../../ai/prompt";
import { RawPost } from "./rawpost.model";
import { JobExtraction } from "./types";



export function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
}
export function containsEmail(text: string): boolean {
  const emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

  return emailRegex.test(text);
}
export async function processPosts(posts: RawPost[]) {
  const jobs = [];

  for (const post of posts) {
    try {
      const prompt = JsonPromptFromPost([post.content]);

      const extracted = await generateJson<JobExtraction | JobExtraction[]>(
        prompt,
      );
      console.log(extracted);
      const result = Array.isArray(extracted) ? extracted[0] : extracted;

      if (!result) {
        continue;
      }
      if(!isValidEmail(result.email as string)){
        continue
      }
      jobs.push({
        ...result,
        postUrl: post.postUrl,
        scrapeJobId: post.scrapeJobId,
      });
    } catch (error) {
      console.error(`Failed processing post: ${post.postUrl}`, error);
    }
  }
  console.log(jobs);
  return jobs;
}
