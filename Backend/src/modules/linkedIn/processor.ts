import { generateJson } from "../../ai/ai";
import { JsonPromptFromPost } from "../../ai/prompt";
import { RawPost } from "./rawpost.model";

export async function processPosts(
  posts: RawPost[]
) {
  const contents = posts.map(
    (post) => post.content
  );

  const result = await generateJson(JsonPromptFromPost(contents));
  console.log(result)
  return result.map((job: any, index: number) => ({
    ...job,
    postUrl: posts[index].postUrl,
  }));

}