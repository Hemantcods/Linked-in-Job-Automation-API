const { Ollama } = require("ollama");

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


module.exports={
  askLLM,
  generateJson
}