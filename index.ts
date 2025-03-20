import { bot } from "./src/bot";

async function main() {
  bot.start();
  console.log("Bot is running!");
}

main().catch(console.error);
