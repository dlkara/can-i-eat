import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/hjlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const base = "http://127.0.0.1:4173";
const output = path.resolve("../artifacts/screenshots");
await mkdir(output, { recursive: true });

const defaultState = {
  loggedIn: true,
  account: { displayName: "현정", email: "demo@local.example" },
  foodAllergies: ["밀", "복숭아"],
  drugReactions: [{ id: "d1", drugNameOrIngredient: "나프록센", symptom: "복용 후 두드러기", reactionType: "UNKNOWN" }],
  searchQuery: "밀가루 안 들어간 간식 찾아줘",
  category: "전체",
  profileTab: "food",
  selectedProductId: "p01"
};

const captures = [
  ["01-login.png", "login", { loggedIn: false }],
  ["02-signup.png", "signup", { loggedIn: false }],
  ["03-home-recommendations.png", "home", {}],
  ["04-all-products.png", "all-products", {}],
  ["05-search-results.png", "results", {}],
  ["06-product-detail.png", "detail", {}],
  ["07-food-allergies.png", "profile", { profileTab: "food" }],
  ["08-drug-reactions.png", "profile", { profileTab: "drug" }],
  ["09-allergy-card.png", "card", {}],
  ["10-privacy-notice.png", "privacy", {}]
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
for (const [file, route, override] of captures) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const state = { ...defaultState, ...override };
  await page.addInitScript(value => localStorage.setItem("meogeodoDwaePrototypeV3", JSON.stringify(value)), state);
  await page.goto(`${base}/#${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(output, file), fullPage: false });
  await context.close();
}
await browser.close();
console.log(`Captured ${captures.length} screens to ${output}`);
