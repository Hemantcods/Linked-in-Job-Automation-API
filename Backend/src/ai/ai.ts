import ollama from "ollama";
import { Candidate } from "../modules/candidate/types";

export async function generateJson(prompt: string) {
  const response = await ollama.chat({
    model: "qwen3:8b",
    format: "json",
    messages: [
      {
        role: "system",
        content: `
                You are a JSON extraction API.
                Return only valid JSON.
`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    think: false,
  });
  try {
    const parsed = JSON.parse(response.message.content);

    const jobs = Array.isArray(parsed) ? parsed : [parsed];

    return jobs;
  } catch (error) {
    console.error(response.message.content);
    throw new Error("Invalid JSON returned from model");
  }
}

export async function generateResumeJson(prompt: string): Promise<Candidate> {
  const response = await ollama.chat({
    model: "qwen3:8b",
    format: "json",
    messages: [
      {
        role: "system",
        content: `
                You are a JSON extraction API.
                Return only valid JSON.
`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    think: false,
  });
  try {
    return JSON.parse(response.message.content);
  } catch (error) {
    console.error(response.message.content);
    throw new Error("Invalid Json Returned form model");
  }
}
