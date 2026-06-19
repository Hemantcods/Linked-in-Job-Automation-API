const { Ollama } = require("ollama");
const { OpenAI } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

console.log("Ollama Client Initialized:", Ollama);
const ollama = new Ollama({
  host: "http://127.0.0.1:11434",
});
async function askLLM(prompt) {
  try {
    const response = await ollama.chat({
      model: "qwen3:8b",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      keep_alive: "5m",
    });
    console.log("Ollama Response:", response);
    return response.message.content;
  } catch (error) {
    console.error("Ollama Error:", error);
    throw error;
  }
}
async function generateJson(prompt) {
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
    think:false
  });
  return JSON.parse(response.message.content);
}
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
async function generateJson2(prompt) {
  const response = await client.chat.completions.create({
    model: "google/gemma-4-31b-it:free",
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: "Return only valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  });

  return JSON.parse(
    response.choices[0].message.content
  );
}


module.exports={
  askLLM,
  generateJson,
  generateJson2
}