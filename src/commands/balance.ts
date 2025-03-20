import { MyContext } from "../types";
import { WalletStore } from "../services/wallet";

export async function handleBalance(ctx: MyContext, walletStore: WalletStore) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat ID is undefined");
    return;
  }
  const userId = ctx.from?.id.toString();
  if (!userId) {
    await ctx.reply("❌ Could not determine user ID.");
    return;
  }

  const wallet = walletStore.getWallet(userId);
  if (!wallet) {
    await ctx.reply("❌ No wallet found. Use /deposit first.");
    return;
  }

  const loadingMsg = await ctx.reply("Checking your balances...");

  try {
    const usdcBalance = await walletStore.checkUsdcBalance(userId);
    const usdiBalance = await walletStore.checkUsdiBalance(userId);
    const solBalance = await walletStore.checkSolBalance(userId);

    await ctx.reply(
      "💰 Your current balance is:\n\n" +
        `USDC: ${usdcBalance.toFixed(5)} USDC\n` +
        `USDi: ${usdiBalance.toFixed(5)} USDi\n` +
        `SOL: ${solBalance.toFixed(5)} SOL`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error checking balances:", error);
    await ctx.reply("❌ Error checking balances. Please try again.");
  } finally {
    await ctx.api
      .deleteMessage(ctx.chat.id, loadingMsg.message_id)
      .catch(() => {});
  }
}
