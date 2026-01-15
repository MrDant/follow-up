const fs = require("fs").promises;

const Console = { ...console };
let count = 0;
Console.log = (...msg) => {
  if (process.env.DEBUG == "true") {
    console.log(...msg);
  }
};

Console.snapshot = async (name, page) => {
  await page.screenshot({ path: `./screenshots/${name}.jpg` }).then();
  await fs.writeFile(`./snapshots/${name}.html`, await page.content());
};

module.exports = Console;
