const path = require("path");
const HomeyCompose = require("homey/lib/HomeyCompose"); // Adjust path to lib/HomeyCompose.js

// The directory of the Homey App you want to compose
const appPath = process.argv[2] || process.cwd();

console.log(`Composing app at: ${appPath}`);
HomeyCompose.build({ appPath, usesModules: true })
  .then(() => console.log("Compose complete!"))
  .catch((err) => {
    console.error("Compose failed:", err);
    process.exit(1);
  });
