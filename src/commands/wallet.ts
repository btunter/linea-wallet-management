import { MyContext } from "../types";
import { WalletStore } from "../services/wallet";
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";

export async function handleBackup(ctx: MyContext, walletStore: WalletStore) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();
  const wallet = walletStore.getWallet(userId);

  if (!wallet) {
    await ctx.reply("❌ No wallet found. Use /deposit first.");
    return;
  }

  if (wallet.seedPhraseBackedUp) {
    await ctx.reply(
      "⚠️ Seed phrase has already been backed up.\n\n" +
        "For security reasons, each wallet's seed phrase can only be exported once.\n\n" +
        "If you need to reset your wallet, use /reset"
    );
    return;
  }

  try {
    // Generate or retrieve seed phrase
    const seedPhrase = wallet.seedPhrase || generateSeedPhrase();

    // Send as a private message
    await ctx.reply(
      "🔐 IMPORTANT: Store this seed phrase safely!\n\n" +
        "This is the ONLY way to recover your wallet if you lose access to your Telegram account.\n\n" +
        `Seed Phrase:\n<code>${seedPhrase}</code>\n\n` +
        "⚠️ Never share this with anyone!\n" +
        "⚠️ Save this somewhere safe!\n" +
        "⚠️ This will be shown only ONCE!",
      {
        parse_mode: "HTML",
        protect_content: true, // Prevents forwarding/saving
      }
    );

    // Mark as backed up and clear seed phrase from storage
    walletStore.markSeedPhraseBackedUp(userId);

    await ctx.reply(
      "✅ Seed phrase has been provided.\n" +
        "Make sure you have saved it securely before continuing."
    );
  } catch (error) {
    console.error("Error in backup process:", error);
    await ctx.reply("❌ Error generating backup. Please try again later.");
  }
}

export async function handleReset(ctx: MyContext, walletStore: WalletStore) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();

  await ctx.reply(
    "⚠️ WARNING: This will reset your wallet!\n\n" +
      "• All wallet data will be erased\n" +
      "• You'll need to create a new wallet\n" +
      "• Make sure you have backed up your seed phrase\n\n" +
      "Are you sure you want to continue?",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Yes, reset wallet", callback_data: "confirm_reset" },
            { text: "No, cancel", callback_data: "cancel_reset" },
          ],
        ],
      },
    }
  );

  ctx.session.waitingForResetConfirmation = true;
}

export async function handleResetConfirmation(
  ctx: MyContext,
  walletStore: WalletStore,
  confirmed: boolean
) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();

  if (!confirmed) {
    await ctx.reply("Wallet reset cancelled.");
    ctx.session.waitingForResetConfirmation = false;
    return;
  }

  try {
    // Reset the wallet
    walletStore.resetWallet(userId);

    await ctx.reply(
      "✅ Wallet has been reset.\n\n" + "Use /deposit to create a new wallet."
    );
  } catch (error) {
    console.error("Error resetting wallet:", error);
    await ctx.reply("❌ Error resetting wallet. Please try again later.");
  } finally {
    ctx.session.waitingForResetConfirmation = false;
  }
}

function generateSeedPhrase(): string {
  return bip39.generateMnemonic(256); // 24 words
}

function getKeypairFromSeedPhrase(seedPhrase: string): Keypair {
  // 1) Create a 64-byte seed buffer from mnemonic
  const seedBuffer = bip39.mnemonicToSeedSync(seedPhrase);

  // 2) If you need only the first 32 bytes for Ed25519:
  const partialSeed = seedBuffer.subarray(0, 32);

  // 3) Convert the 32 bytes to a real Buffer (in case it's typed array)
  const partialSeedBuffer = Buffer.from(partialSeed);

  // 4) Convert the buffer to a hex string:
  const seedHex = partialSeedBuffer.toString("hex");

  // 5) Now pass the hex string into derivePath
  //    Because the function signature wants "seed: Hex"
  const { key } = derivePath("m/44'/501'/0'/0'", seedHex);

  // 6) Finally, create a Keypair from the derived key
  //    which is presumably a Buffer or Uint8Array
  return Keypair.fromSeed(key);
}

export async function handleRecover(ctx: MyContext, walletStore: WalletStore) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  await ctx.reply(
    "Please enter your 24-word seed phrase to recover your wallet.\n" +
      "Each word should be separated by a space."
  );

  ctx.session.waitingForSeedPhrase = true;
}

export async function handleRecoverWithSeed(
  ctx: MyContext,
  walletStore: WalletStore,
  seedPhrase: string
) {
  if (!ctx.chat?.id || !ctx.from?.id) {
    console.error("Chat/User ID is undefined");
    return;
  }

  const userId = ctx.from.id.toString();

  try {
    // Validate seed phrase
    if (!bip39.validateMnemonic(seedPhrase)) {
      await ctx.reply("❌ Invalid seed phrase. Please check and try again.");
      return;
    }

    // Generate keypair from seed phrase
    const keypair = getKeypairFromSeedPhrase(seedPhrase);

    // Create new wallet data
    const walletData = {
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString("base64"),
      createdAt: Date.now(),
      seedPhraseBackedUp: true, // Mark as backed up since user has the seed phrase
    };

    // Update wallet store
    walletStore.updateWallet(userId, walletData);

    await ctx.reply(
      "✅ Wallet recovered successfully!\n\n" +
        `Your wallet address: <code>${walletData.publicKey}</code>\n\n` +
        "You can now use all bot functions normally.",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error recovering wallet:", error);
    await ctx.reply("❌ Error recovering wallet. Please try again later.");
  } finally {
    ctx.session.waitingForSeedPhrase = false;
  }
}
