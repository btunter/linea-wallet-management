import { MyContext } from "../types";
import { WalletStore } from "../services/wallet";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { CONNECTION } from "../utils/constants";
import { createTransferTransaction } from "../services/transfer";

export async function handleWithdraw(ctx: MyContext, walletStore: WalletStore) {
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
      "❌ No USDC balance available to withdraw.\n" +
        "Note: USDi direct withdrawal is not activated at the moment. " +
        "Please convert USDi to USDC first, then withdraw USDC."
    );
    return;
  }

  await ctx.reply(
    `Your current USDC balance is ${usdcBalance.toFixed(5)} USDC.\n\n` +
      "How much would you like to withdraw?\n\n" +
      "Note: USDi direct withdrawal is not activated at the moment.",
    { parse_mode: "HTML" }
  );

  ctx.session.waitingForWithdrawalAmount = true;
}

export async function handleWithdrawalAmount(
  ctx: MyContext,
  walletStore: WalletStore,
  amount: number
) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat ID is undefined");
    return;
  }
  const userId = ctx.from.id.toString();
  const wallet = walletStore.getWallet(userId);
  if (!wallet) return;

  const usdcBalance = await walletStore.checkUsdcBalance(userId);

  if (amount > usdcBalance) {
    await ctx.reply(
      `❌ Insufficient USDC balance. You have ${usdcBalance.toFixed(
        5
      )} USDC available.`
    );
    return;
  }

  await ctx.reply(
    "What receiving address do you want to use?\n" +
      "Make sure the address can receive USDC on Solana network."
  );

  ctx.session.waitingForWithdrawalAmount = false;
  ctx.session.waitingForAddress = true;
}

export async function handleWithdrawalAddress(
  ctx: MyContext,
  walletStore: WalletStore,
  address: string,
  amount: number
) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();
  const wallet = walletStore.getWallet(userId);
  if (!wallet) return;

  let destinationPubkey: PublicKey;
  try {
    destinationPubkey = new PublicKey(address);
  } catch (error) {
    await ctx.reply("❌ Invalid Solana address. Please check and try again.");
    return;
  }

  const processingMsg = await ctx.reply("Processing your withdrawal...");

  try {
    const keypair = walletStore.getKeypairForUser(userId);
    const transaction = await createTransferTransaction(
      CONNECTION,
      keypair,
      destinationPubkey,
      amount
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

    // Get updated balances
    // const newUsdcBalance = await walletStore.checkUsdcBalance(userId);
    // const newUsdiBalance = await walletStore.checkUsdiBalance(userId);

    await ctx.reply(
      "✅ Done! Here is the transaction record:\n\n" +
        `Transaction: https://solscan.io/tx/${signature}\n\n`,
        // "Your new balance is:\n" +
        // `USDC: ${newUsdcBalance.toFixed(5)}\n` +
        // `USDi: ${newUsdiBalance.toFixed(5)}`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error processing withdrawal:", error);
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
          "❌ Error processing the withdrawal. Please try again later."
        );
      }
    } else {
      await ctx.reply("❌ Unknown error occurred. Please try again later.");
    }
  } finally {
    ctx.session.waitingForAddress = false;
    if (ctx.chat?.id && processingMsg.message_id) {
      await ctx.api
        .deleteMessage(ctx.chat.id, processingMsg.message_id)
        .catch(() => {});
    }
  }
}
