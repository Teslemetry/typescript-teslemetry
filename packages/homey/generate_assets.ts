import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import process from "process";

// Configuration
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error(
    "Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set.",
  );
  process.exit(1);
}

// Models
const GEMINI_MODEL = "gemini-3-pro-image-preview";
const IMAGEN_MODEL = "imagen-3.0-generate-001";

// Paths
const ASSETS_DIR = path.resolve("assets/images");
const DRIVER_VEHICLE_DIR = path.resolve("drivers/vehicle/assets/images");
const DRIVER_POWERWALL_DIR = path.resolve("drivers/powerwall/assets/images");
const DRIVER_WALL_CONNECTOR_DIR = path.resolve(
  "drivers/wall-connector/assets/images",
);

const ROOT_ASSETS_ICON = path.resolve("assets/icon.svg");
const BRANDMARK_PATH = path.resolve("assets/Brandmark - ELECTRIC TIGHT.png");

const dirs = [
  ASSETS_DIR,
  DRIVER_VEHICLE_DIR,
  DRIVER_POWERWALL_DIR,
  DRIVER_WALL_CONNECTOR_DIR,
];

interface ImageTask {
  name: string;
  prompt: string;
  outputDir: string;
  sizes: { name: string; width: number; height: number }[];
  useReference?: boolean;
}

const tasks: ImageTask[] = [
  // App Store Images (Banners)
  // Guideline: Lively, represents purpose, no logo, no big 2D shapes.
  // Resolutions: Small 250x175, Large 500x350, XLarge 1000x700 (Aspect ~1.43:1)
  {
    name: "App Store Images (Scene)",
    prompt:
      "A bright, modern, and clean smart home energy scene. A white electric vehicle charging in a minimalist garage with a home battery unit on the wall. Soft daylight lighting, photorealistic, 3D render style. No text, no logos, no people. Visualizes energy flow and connectivity.",
    outputDir: ASSETS_DIR,
    sizes: [
      { name: "small.png", width: 250, height: 175 },
      { name: "large.png", width: 500, height: 350 },
      { name: "xlarge.png", width: 1000, height: 700 },
    ],
  },

  // Driver Images
  // Guideline: White background, recognizable device.
  // Resolutions: Small 75x75, Large 500x500, XLarge 1000x1000 (Square 1:1)
  {
    name: "Driver: Tesla Vehicle",
    prompt:
      "A studio shot of a white Tesla Model 3 from a front 3/4 angle. Pure white background, soft studio lighting, sharp details, photorealistic. The car is isolated on white. No text.",
    outputDir: DRIVER_VEHICLE_DIR,
    sizes: [
      { name: "small.png", width: 75, height: 75 },
      { name: "large.png", width: 500, height: 500 },
      { name: "xlarge.png", width: 1000, height: 1000 },
    ],
  },
  {
    name: "Driver: Tesla Powerwall",
    prompt:
      "A studio shot of a Tesla Powerwall 2 battery unit. Pure white background. Front view, clean, minimalist, photorealistic. The unit is isolated on white. No text.",
    outputDir: DRIVER_POWERWALL_DIR,
    sizes: [
      { name: "small.png", width: 75, height: 75 },
      { name: "large.png", width: 500, height: 500 },
      { name: "xlarge.png", width: 1000, height: 1000 },
    ],
  },
  {
    name: "Driver: Tesla Wall Connector",
    prompt:
      "A studio shot of a Tesla Wall Connector Gen 3. Pure white background. Front view showing the white glass faceplate and the charging cable coiled neatly. Photorealistic. Isolated on white. No text.",
    outputDir: DRIVER_WALL_CONNECTOR_DIR,
    sizes: [
      { name: "small.png", width: 75, height: 75 },
      { name: "large.png", width: 500, height: 500 },
      { name: "xlarge.png", width: 1000, height: 1000 },
    ],
  },
];

async function generateAndSave() {
  console.log("Starting asset generation (Conditional)...");
  console.log("Model:", GEMINI_MODEL);

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Helper to copy icon.svg if missing
  const driverAssetsDirs = [
    path.resolve("drivers/vehicle/assets"),
    path.resolve("drivers/powerwall/assets"),
    path.resolve("drivers/wall-connector/assets"),
  ];
  for (const driverDir of driverAssetsDirs) {
    await fs.mkdir(driverDir, { recursive: true });
    const dest = path.join(driverDir, "icon.svg");
    try {
      await fs.access(dest);
    } catch {
      try {
        await fs.copyFile(ROOT_ASSETS_ICON, dest);
        console.log(
          `[WARN] Copied placeholder icon.svg to ${dest}. GUIDELINE CHECK: Replace this with a unique device SVG.`,
        );
      } catch (e) {
        /* ignore */
      }
    }
  }

  for (const task of tasks) {
    // CHECK IF FILES EXIST
    let allExist = true;
    for (const size of task.sizes) {
      try {
        await fs.access(path.join(task.outputDir, size.name));
      } catch {
        allExist = false;
        break;
      }
    }

    if (allExist) {
      console.log(`Skipping: ${task.name} (All files exist)`);
      continue;
    }

    console.log(`Processing: ${task.name} (Files missing, regenerating...)`);
    try {
      let imageBuffer: Buffer | null = null;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
      const geminiParts: any[] = [
        { text: "Generate an image of " + task.prompt },
      ];

      try {
        // @ts-ignore
        const resp = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: geminiParts }] }),
        });
        const data = await resp.json();

        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              imageBuffer = Buffer.from(part.inlineData.data, "base64");
              console.log("  - Gemini produced an image.");
              break;
            }
          }
        }
        if (!imageBuffer && data.error)
          console.error("  - Gemini Error:", data.error.message);
      } catch (e) {
        console.error("  - Gemini Fetch Error:", e);
      }

      // Fallback to Imagen 3
      if (!imageBuffer) {
        console.log(`  - Fallback to Imagen 3...`);
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${API_KEY}`;
        try {
          // @ts-ignore
          const resp = await fetch(imagenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt: task.prompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio: task.sizes.some((s) => s.width > s.height)
                  ? "16:9"
                  : "1:1",
              },
            }),
          });
          const data = await resp.json();
          if (data.predictions?.[0]?.bytesBase64Encoded) {
            imageBuffer = Buffer.from(
              data.predictions[0].bytesBase64Encoded,
              "base64",
            );
            console.log("  - Imagen 3 produced an image.");
          }
        } catch (e) {
          console.error("  - Imagen Fetch Error:", e);
        }
      }

      if (imageBuffer) {
        for (const size of task.sizes) {
          const outputPath = path.join(task.outputDir, size.name);
          await sharp(imageBuffer)
            .resize(size.width, size.height, { fit: "cover" })
            .toFile(outputPath);
          console.log(`  - Saved: ${outputPath}`);
        }
      } else {
        console.error("  - FAILED to create image for", task.name);
      }
    } catch (error) {
      console.error(`  - Error processing ${task.name}:`, error);
    }
  }
  console.log("Done.");
}

generateAndSave();
