import ollama from "ollama";
export async function generateJson<T>(prompt: string): Promise<T> {
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
    return JSON.parse(response.message.content) as T;
  } catch (error) {
    console.error(response.message.content);
    throw new Error("Invalid JSON returned from model");
  }
}
