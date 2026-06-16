const mammoth = require("mammoth");
const {
  Document,
  Paragraph,
  Packer
} = require("docx");

async function extractResumeText(filePath) {
  try {
    const result = await mammoth.extractRawText({
      path: filePath
    });

    return result.value;
  } catch (err) {
    console.error("Error extracting resume:", err);
    throw err;
  }
}

const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function renderResume(templatePath, tailoredData, outputPath) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(tailoredData);
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buf);
}

const tailoredData = {
  summary: "Backend engineer with 2 years building scalable Node.js APIs...",
  skills: ["Node.js", "Docker", "AWS", "PostgreSQL", "REST APIs"],
  experiences: [
    {
      id: "exp1",
      bullets: [
        "Deployed containerized microservices on AWS ECS, reducing deploy time by 40%",
        "Built REST APIs serving 10k+ daily requests using Node.js and Express",
      ],
    },
  ],
};

renderResume('./resume.docx', tailoredData, './tailored_resume.docx');