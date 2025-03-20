import { Context } from "grammy";
import { MyContext } from "../types";
import { WalletStore } from "../services/wallet";

export async function handleDeposit(ctx: MyContext, walletStore: WalletStore) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();
  let wallet = walletStore.getWallet(userId);
  if (!wallet) {
    wallet = walletStore.createWallet(userId);
  }

  const solBalance = await walletStore.checkSolBalance(userId);
  const usdcBalance = await walletStore.checkUsdcBalance(userId);
  const usdiBalance = await walletStore.checkUsdiBalance(userId);
  const MINIMUM_SOL_BALANCE = 0.01;

  await ctx.reply(
    "Yes, USDC is accepted at the moment, once deposit, you can convert to USDi to earn yield. Here is your wallet address: " +
      `<code>${wallet.publicKey}</code> (tap to copy)\n\n` +
      `Current SOL balance: ${solBalance.toFixed(5)} SOL\n` +
      `Current USDC balance: ${usdcBalance.toFixed(5)} USDC\n` +
      `Current USDi balance: ${usdiBalance.toFixed(5)} USDi`,
    {
      parse_mode: "HTML",
    }
  );
}
