import fs from "fs/promises";
import path from "path";
import process from "process";

// Configuration
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const MODEL_NAME = "gemini-3-flash-preview";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const TASKS = [
  {
    name: "Vehicle Icon",
    path: "drivers/vehicle/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Model 3 car. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. The view should be from a front-right angle (3/4 view) as per Homey guidelines. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Ensure the paths are closed and clean. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Powerwall Icon",
    path: "drivers/powerwall/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Powerwall 2 battery unit. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. It is a vertical rectangle. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Wall Connector Icon",
    path: "drivers/wall-connector/assets/icon.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a Tesla Wall Connector EV charger. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. It features the main unit body and a coiled cable. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  // Custom Capability Icons
  {
    name: "Flash Lights Capability",
    path: "assets/capabilities/button_flash_lights.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of car headlights flashing. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a headlight with radiating light beams. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Honk Horn Capability",
    path: "assets/capabilities/button_honk_horn.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car horn with sound waves. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a horn with curved sound wave lines emanating from it. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Sentry Mode Capability",
    path: "assets/capabilities/sentry_mode.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a security camera or surveillance eye. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a stylized security camera or watchful eye representing surveillance mode. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Defrost Mode Capability",
    path: "assets/capabilities/defrost_mode.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car windshield with defrost lines. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a windshield with upward curving arrows or wavy lines indicating heat/defrost. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Frunk Capability",
    path: "assets/capabilities/frunk.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car front trunk (frunk) open. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show the front hood/bonnet of a car in an open position. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Trunk Capability",
    path: "assets/capabilities/trunk.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car rear trunk open. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show the rear trunk/boot of a car in an open position. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Valet Mode Capability",
    path: "assets/capabilities/valet_mode.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car key with a lock or restriction symbol. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a key with a lock or limited access symbol representing valet mode restrictions. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Seat Heater Capability",
    path: "assets/capabilities/seat_heater_front_left.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a car seat with heat waves. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a simplified car seat with upward wavy lines indicating heat. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Steering Wheel Heater Capability",
    path: "assets/capabilities/steering_wheel_heater.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a steering wheel with heat waves. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a circular steering wheel with upward wavy lines indicating heat. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Charge Port Door Capability",
    path: "assets/capabilities/charge_port_door.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of an EV charging port door open. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a charging port cover/door in open position with a charging plug socket visible. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Operation Mode Capability",
    path: "assets/capabilities/operation_mode.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a settings gear with energy symbols. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a gear/cog with a lightning bolt or battery symbol representing operation mode settings. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Storm Watch Capability",
    path: "assets/capabilities/storm_watch.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a cloud with lightning bolt and shield. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a storm cloud with lightning and a protective shield symbol representing storm preparation mode. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
  {
    name: "Backup Reserve Capability",
    path: "assets/capabilities/backup_reserve.svg",
    prompt:
      "Generate the XML code for a Scalable Vector Graphic (SVG) icon of a battery with a shield or reserve indicator. The style must be: simple, flat, minimalist, monochrome (black shape), transparent background. Show a battery outline with a reserve level line and protective symbol. The viewBox should be '0 0 960 960'. Use 40px lines for outlines, 20px lines for detail, 10px lines for minor detail, and no fill. Output ONLY the raw SVG XML code, no markdown.",
  },
];

async function generateIcons() {
  console.log("Starting SVG Icon generation (Conditional)..");

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

    console.log(`Generating: ${task.name} (File missing, generating..)`);

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
