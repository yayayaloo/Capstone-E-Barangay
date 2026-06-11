const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const files = [
  "BARANGAY CLEARANCE.docx",
  "BUSINESS ENDORSEMENT.docx",
  "CERTIFICATE OF INDIGENCY.docx",
  "CERTIFICATE OF RESIDENCY.docx",
  "CERTIFICATION OF LOT OCCUPANCY_POSSESSION.docx",
  "First Time Jobseekers.docx"
];

const publicDir = path.join(__dirname, 'public');

for (const file of files) {
  console.log(`\n--- ${file} ---`);
  const docxPath = path.join(publicDir, file);
  const tempDir = path.join(__dirname, `temp_${Date.now()}`);
  
  try {
    fs.mkdirSync(tempDir);
    // Copy the docx to zip
    const zipPath = path.join(tempDir, 'doc.zip');
    fs.copyFileSync(docxPath, zipPath);
    
    // Extract using tar (built into windows 10+)
    execSync(`tar -xf doc.zip`, { cwd: tempDir, stdio: 'ignore' });
    
    // Read word/document.xml
    const xmlPath = path.join(tempDir, 'word', 'document.xml');
    if (fs.existsSync(xmlPath)) {
        let xml = fs.readFileSync(xmlPath, 'utf8');
        // Simple regex to extract text
        let text = xml.replace(/<w:p[^>]*>/g, '\n');
        text = text.replace(/<[^>]+>/g, '');
        console.log(text.trim());
    } else {
        console.log("word/document.xml not found");
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  } finally {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch(e){}
  }
}
