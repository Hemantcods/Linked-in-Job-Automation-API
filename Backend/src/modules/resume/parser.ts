import mammoth from "mammoth";
import fs from "fs";
import pizzip from "pizzip";
export async function extractResumeText(filePath: string) {
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

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function createTailoredResume(
  originalResumePath: string,
  enhancements: string[],
) {
  // create output folder
  fs.mkdirSync("./generated", {
    recursive: true,
  });

  const outputPath = `./generated/${Date.now()}.docx`;

  // copy original resume
  fs.copyFileSync(originalResumePath, outputPath);

  // open docx zip
  const content = fs.readFileSync(outputPath, "binary");

  const zip = new pizzip(content);

  let xml = zip.file("word/document.xml")?.asText();

  if (!xml) {
    throw new Error("Could not read document.xml");
  }

  const extraContent = `
<w:p>
  <w:r>
    <w:t>ROLE RELEVANT HIGHLIGHTS</w:t>
  </w:r>
</w:p>

${enhancements
  .map(
    (point) => `
<w:p>
  <w:r>
    <w:t>• ${escapeXml(point)}</w:t>
  </w:r>
</w:p>`,
  )
  .join("")}
`;

  xml = xml.replace("</w:body>", `${extraContent}</w:body>`);

  zip.file("word/document.xml", xml);

  const buffer = zip.generate({
    type: "nodebuffer",
  });

  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
