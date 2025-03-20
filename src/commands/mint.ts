import { Context } from "grammy";
import { MyContext } from "../types";
import { WalletStore } from "../services/wallet";
import { createSwapTransaction } from "../services/swap";
import { CONNECTION } from "../utils/constants";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { stat } from "fs";

export async function handleMintYield(
  ctx: MyContext,
  walletStore: WalletStore
) {
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

  const usdcBalance = await walletStore.checkUsdcBalance(userId);

  if (usdcBalance <= 0) {
    await ctx.reply(
      "❌ No USDC found in your wallet.\n\n" +
        "First deposit USDC using /deposit"
    );
    return;
  }

  await ctx.reply(
    `Your USDC balance: ${usdcBalance.toFixed(5)} USDC\n` +
      "How much USDC do you want to participate in the yield vault?",
    { parse_mode: "HTML" }
  );

  ctx.session.waitingForMintAmount = true;
}

export async function handleMintAmount(
  ctx: MyContext,
  walletStore: WalletStore,
  amount: number
) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();
  const processingMsg = await ctx.reply("Processing your deposit...");

  try {
    // Check SOL balance first
    const solBalance = await walletStore.checkSolBalance(userId);
    const MINIMUM_SOL_BALANCE = 0.01; // Minimum SOL needed for transaction fees

    if (solBalance < MINIMUM_SOL_BALANCE) {
      await ctx.reply(
        "❌ Insufficient SOL for transaction fees.\n\n" +
          `You need at least ${MINIMUM_SOL_BALANCE} SOL for transaction fees.\n` +
          `Current balance: ${solBalance.toFixed(5)} SOL\n\n` +
          "Please deposit some SOL to your wallet address first."
      );
      return;
    }

    const keypair = walletStore.getKeypairForUser(userId);
    const transaction = await createSwapTransaction(
      CONNECTION,
      keypair,
      amount,
      false // isWithdrawal = false
    );

    // Get latest blockhash
    const latestBlockhash = await CONNECTION.getLatestBlockhash();

    // Create TransactionMessage
    const message = new TransactionMessage({
      payerKey: keypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: transaction.instructions,
    }).compileToV0Message();

    // Create VersionedTransaction
    const versionedTransaction = new VersionedTransaction(message);

    // Sign transaction
    versionedTransaction.sign([keypair]);

    // Send transaction
    const signature = await CONNECTION.sendTransaction(versionedTransaction);

    const confirmationMessage = await ctx.reply(
      "⏳ Waiting for confirmation..."
    );

    // Try to confirm transaction with timeout
    try {
      const confirmationStrategy = {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      };

      // Wait for confirmation with 30 second timeout
      await Promise.race([
        CONNECTION.confirmTransaction(confirmationStrategy),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("confirmation-timeout")), 30000)
        ),
      ]);
    } catch (error: unknown) {
      // Type guard for Error objects
      if (error instanceof Error && error.message === "confirmation-timeout") {
        const status = await CONNECTION.getSignatureStatus(signature);
        if (status.value?.err) {
          throw new Error("Transaction failed");
        }
        // If status is ok, continue as success
        console.log("Transaction confirmed through status check");
      } else {
        // Re-throw other errors
        throw error;
      }
    } finally {
      if (ctx.chat?.id && confirmationMessage.message_id) {
        await ctx.api
          .deleteMessage(ctx.chat.id, confirmationMessage.message_id)
          .catch(() => {});
      }
    }

    await ctx.reply(
      "✅ Transaction successful!\n\n" +
        `View transaction: https://solscan.io/tx/${signature}\n\n` +
        "Use /balance to check your updated balance.",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error processing deposit:", error);
    if (error instanceof Error) {
      if (error.message === "Wallet not found") {
        await ctx.reply("❌ Wallet not found. Please use /deposit first.");
      } else if (error.message === "Invalid wallet data") {
        await ctx.reply(
          "❌ Invalid wallet data. Please reset your wallet using /reset."
        );
      } else if (error.message === "confirmation-timeout") {
        await ctx.reply(
          "⚠️ Transaction sent but confirmation timed out. Please check your balance in a few minutes."
        );
      } else {
        await ctx.reply(
          "❌ Error processing the deposit. Please try again later."
        );
      }
    } else {
      await ctx.reply("❌ Unknown error occurred. Please try again later.");
    }
  } finally {
    ctx.session.waitingForMintAmount = false;
    if (ctx.chat?.id && processingMsg.message_id) {
      await ctx.api
        .deleteMessage(ctx.chat.id, processingMsg.message_id)
        .catch(() => {});
    }
  }
}
