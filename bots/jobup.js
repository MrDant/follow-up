const config = require("../config");
const MainBot = require("./main");
const console = require("../utils/logs");
const Firebase = require("../utils/firebase");
const path = require("path");

class JobUpBot extends MainBot {
  constructor() {
    super("jobup", "");
    this.browser = null;
    this.page = null;
    this.db = new Firebase();
    this.cookiesPath = path.resolve(
      __dirname,
      "..",
      "data",
      `cookies_jobup.json`
    );
  }

  async initDB() {}

  async saveJob(url) {
    const jobId = url
      .split("/")
      .filter((e) => !!e)
      .pop();
    const job = await this.db.getJob(jobId);
    if (!job) {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
      });
      await this.page.waitForSelector("[data-cy=vacancy-title]");

      const detailJob = {
        link: url,
        id: jobId,
        ...(await this.page.evaluate(() => {
          return {
            title: document.querySelector("[data-cy=vacancy-title]").innerText,
            companyName: document.querySelector(
              "[data-cy=company-link],[data-cy=vacancy-logo]"
            ).innerText,
            description: document.querySelector("[data-cy=vacancy-description]")
              .innerText,
            taux:
              document.querySelector("[data-cy=info-workload]").innerText ?? "",
            type:
              document.querySelector("[data-cy=info-contract]").innerText ?? "",
          };
        })),
      };
      await this.db.addJob(detailJob);
    } else {
      console.log("déjà fait");
    }
  }

  async nextPages() {
    try {
      const button = await this.page.waitForSelector("a[rel=next]", {
        timeout: 5000,
      });
      await button.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  async getJobs(location = "lausanne", max = 7) {
    console.log("\n🔐 Démarrage de jobup ...");
    try {
      await this.page.goto(
        `https://www.jobup.ch/fr/emplois/?location=${location}&publication-date=${max}`,
        {
          waitUntil: "networkidle2",
        }
      );

      const jobslink = [];
      let count = 0;
      do {
        await this.page.waitForSelector("[data-cy=job-link]");
        jobslink.push(
          ...(await this.page.$$eval("[data-cy=job-link]", (offers) =>
            offers.map((o) => o.href)
          ))
        );
        console.log(jobslink.length, count++);
      } while (await this.nextPages());

      return jobslink;
    } catch (error) {
      console.error("❌ Erreur de connexion:", error.message);
      await console.snapshot("error-jobs", this.page);
      throw error;
    }
  }
}

module.exports = JobUpBot;
