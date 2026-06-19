import mammoth from "mammoth";

export async function extractResumeText(filePath:string) {
  try {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    return result.value;
  } catch (err) {
    console.error("Error extracting resume:", err);
    throw err;
  }
}