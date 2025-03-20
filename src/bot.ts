import { Bot, Middleware, session } from "grammy";
import { MyContext, SessionData } from "./types";
import { WalletStore } from "./services/wallet";
import { ChatHistoryStore } from "./services/chatHistory";
import { handleDeposit } from "./commands/deposit";
import { handleMintYield, handleMintAmount } from "./commands/mint";
import { handleBalance } from "./commands/balance";
import { handleConvert, handleConvertAmount } from "./commands/redeem";
import {
  handleWithdraw,
  handleWithdrawalAmount,
  handleWithdrawalAddress,
} from "./commands/withdraw";
import {
  handleBackup,
  handleRecover,
  handleRecoverWithSeed,
  handleReset,
  handleResetConfirmation,
} from "./commands/wallet";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize wallet store
const walletStore = new WalletStore();
const chatHistoryStore = new ChatHistoryStore();

// Create bot instance
const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "");

// Chat history middleware
const chatHistoryMiddleware: Middleware<MyContext> = async (ctx, next) => {
  if (!ctx.from?.id) return next();

  const userId = ctx.from.id.toString();

  // Log user message if it exists
  if (ctx.message?.text) {
    chatHistoryStore.addMessage(userId, "user", ctx.message.text);
  }

  // Intercept bot's reply to log it
  const originalReply = ctx.reply.bind(ctx);
  ctx.reply = async (text, ...args) => {
    const result = await originalReply(text, ...args);
    chatHistoryStore.addMessage(userId, "bot", text);
    return result;
  };

  return next();
};

// Add middleware before session handling
bot.use(chatHistoryMiddleware);

// Set up session handling
bot.use(
  session({
    initial: (): SessionData => ({
      waitingForMintAmount: false,
      waitingForConversionAmount: false,
      waitingForWithdrawalAmount: false,
      waitingForAddress: false,
      waitingForResetConfirmation: false,
    }),
  })
);

// Command handlers
bot.command("start", async (ctx) => {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  // Start with main menu
  await ctx.reply(
    "Welcome to Kira! 🌟\n\n" +
      "Use the menu below to get started or type /help:",
    {
      reply_markup: {
        keyboard: [
          [{ text: "💰 Wallet Address" }],
          [{ text: "💎 Mint" }, { text: "📊 Check Balance" }],
          [{ text: "🔒 Backup Wallet" }, { text: "🔄 Reset Wallet" }],
        ],
        resize_keyboard: true,
      },
    }
  );
});

// Menu button handlers
bot.hears(
  "💰 Wallet Address",
  async (ctx) => await handleDeposit(ctx, walletStore)
);
bot.hears("💎 Mint", async (ctx) => await handleMintYield(ctx, walletStore));
bot.hears(
  "📊 Check Balance",
  async (ctx) => await handleBalance(ctx, walletStore)
);
bot.hears(
  "🔒 Backup Wallet",
  async (ctx) => await handleBackup(ctx, walletStore)
);
bot.hears(
  "🔄 Reset Wallet",
  async (ctx) => await handleReset(ctx, walletStore)
);

// Command handlers
bot.command("wallet", async (ctx) => await handleDeposit(ctx, walletStore));
bot.command("deposit", async (ctx) => await handleDeposit(ctx, walletStore));
bot.command("mint", async (ctx) => await handleMintYield(ctx, walletStore));
bot.command("balance", async (ctx) => await handleBalance(ctx, walletStore));
bot.command("redeem", async (ctx) => await handleConvert(ctx, walletStore));
bot.command("withdraw", async (ctx) => await handleWithdraw(ctx, walletStore));
bot.command("backup", async (ctx) => await handleBackup(ctx, walletStore));
bot.command("reset", async (ctx) => await handleReset(ctx, walletStore));
bot.command("recover", async (ctx) => await handleRecover(ctx, walletStore));

// Handle reset confirmation callbacks
bot.callbackQuery("confirm_reset", async (ctx) => {
  await handleResetConfirmation(ctx, walletStore, true);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("cancel_reset", async (ctx) => {
  await handleResetConfirmation(ctx, walletStore, false);
  await ctx.answerCallbackQuery();
});

// Handle text messages (for amounts and addresses)
bot.on("message:text", async (ctx) => {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const text = ctx.message.text;

  // Handle mint amount
  if (ctx.session.waitingForMintAmount) {
    const amount = parseFloat(text);
    if (!isNaN(amount) && amount > 0) {
      await handleMintAmount(ctx, walletStore, amount);
    } else {
      await ctx.reply("❌ Please enter a valid amount.");
    }
    return;
  }

  // // Handle conversion amount
  if (ctx.session.waitingForConversionAmount) {
    const amount = parseFloat(text);
    if (!isNaN(amount) && amount > 0) {
      await handleConvertAmount(ctx, walletStore, amount);
    } else {
      await ctx.reply("❌ Please enter a valid amount.");
    }
    return;
  }

  // // Handle withdrawal address
  if (ctx.session.waitingForWithdrawalAmount) {
    const amount = parseFloat(text);
    if (!isNaN(amount) && amount > 0) {
      ctx.session.withdrawalAmount = amount; // Store amount in session
      await handleWithdrawalAmount(ctx, walletStore, amount);
    } else {
      await ctx.reply("❌ Please enter a valid amount.");
    }
    return;
  }

  // // Handle withdrawal address
  if (ctx.session.waitingForAddress && ctx.session.withdrawalAmount) {
    await handleWithdrawalAddress(
      ctx,
      walletStore,
      text,
      ctx.session.withdrawalAmount
    );
    return;
  }

  // // Handle seed phrase recovery
  if (ctx.session.waitingForSeedPhrase) {
    await handleRecoverWithSeed(ctx, walletStore, text);
    return;
  }

  // await processMessage(ctx, walletStore, chatHistoryStore);
});

// Help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    "🤖 Available Commands:\n\n" +
      "/deposit - Get your deposit address\n" +
      "/mint - Mint USDi\n" +
      "/balance - Check your balances\n" +
      "/redeem - Convert USDi to USDC\n" +
      "/withdraw - Withdraw USDC\n" +
      "Need help? Contact @kira_support"
  );
});

// Error handler
bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };
