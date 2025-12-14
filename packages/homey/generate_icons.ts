import fs from "fs/promises";
import path from "path";
import process from "process";

// Configuration
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const MODEL_NAME = "gemini-2.0-flash-exp";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const TASKS = [
  {
    name: "Vehicle Icon",
    path: "drivers/vehicle/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Model 3 car. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. The view should be from a front-right angle (3/4 view) as per Homey guidelines. The viewBox should be '0 0 960 960'. Use <path> elements with solid black fill (#000000). Ensure the paths are closed and clean. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Powerwall Icon",
    path: "drivers/powerwall/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Powerwall 2 battery unit. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. It is a vertical rectangle. The viewBox should be '0 0 960 960'. Use <path> elements with solid black fill (#000000). Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Wall Connector Icon",
    path: "drivers/wall-connector/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Wall Connector EV charger. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. It features the main unit body and a coiled cable. The viewBox should be '0 0 960 960'. Use <path> elements with solid black fill (#000000). Output ONLY the raw SVG XML code, no markdown.",
  },
];

async function generateIcons() {
  console.log("Starting SVG Icon generation (Conditional)...");

  for (const task of TASKS) {
    const outputPath = path.resolve(task.path);

    // CHECK IF FILE EXISTS
    try {
      await fs.access(outputPath);
      console.log(`Skipping: ${task.name} (File exists)`);
      continue;
    } catch {
      // File doesn't exist, proceed
    }

    console.log(`Generating: ${task.name} (File missing, generating...)`);

    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: task.prompt }] }],
        }),
      });
      const data = await resp.json();

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error(`  - Failed to generate text for ${task.name}`);
        continue;
      }

      // Extract SVG from text
      let svgContent = text;
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        svgContent = svgMatch[0];
      }

      svgContent = svgContent.trim();

      // Ensure directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      await fs.writeFile(outputPath, svgContent);
      console.log(`  - Saved to ${task.path}`);
    } catch (e) {
      console.error(`  - Error: ${e}`);
    }
  }
  console.log("Done.");
}

generateIcons();
