import { generateJson } from "../../ai/ai";
import { JsonPromptFromPost } from "../../ai/prompt";
import { RawPost } from "./rawpost.model";
import { JobExtraction } from "./types";

export async function processPosts(posts: RawPost[]) {
  const contents = posts.map((post) => post.content);
  const prompt = JsonPromptFromPost(contents);
  const extracted = await generateJson<JobExtraction | JobExtraction[]>(prompt);

  const result = Array.isArray(extracted) ? extracted : [extracted];
  console.log(result);
  return result.map((job) => ({
    ...job,
    postUrl: posts[job.index].postUrl,
    scrapeJobId: posts[job.index].scrapeJobId,
  }));
}
