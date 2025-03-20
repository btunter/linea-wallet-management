import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  USDT_MINT,
  USDI_MINT,
  AMM_CONFIG,
  POOL_STATE,
  OUTPUT_VAULT,
  INPUT_VAULT,
  OBSERVATION_STATE,
  CLMM_PROGRAM_ID,
  USDC_MINT,
} from "../utils/constants";

export async function createSwapTransaction(
  connection: Connection,
  userKeypair: Keypair,
  amountIn: number,
  isWithdrawal: boolean = false
): Promise<Transaction> {
  const userPublicKey = userKeypair.publicKey;

  // Get token accounts
  const userUsdcAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    userPublicKey
  );

  const userUsdiAccount = await getAssociatedTokenAddress(
    USDI_MINT,
    userPublicKey
  );

  // Create transaction
  const transaction = new Transaction();

  // Create token accounts if they don't exist
  const usdcAccount = await connection.getAccountInfo(userUsdcAccount);
  if (!usdcAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userPublicKey,
        userUsdcAccount,
        userPublicKey,
        USDC_MINT
      )
    );
  }

  const usdiAccount = await connection.getAccountInfo(userUsdiAccount);
  if (!usdiAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userPublicKey,
        userUsdiAccount,
        userPublicKey,
        USDI_MINT
      )
    );
  }

  // Add swap instruction with all required accounts
  const swapIx = createSwapInstruction(
    userPublicKey,
    userUsdcAccount,
    userUsdiAccount,
    amountIn,
    isWithdrawal
  );

  transaction.add(swapIx);

  // Get latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPublicKey;

  return transaction;
}

function createSwapInstruction(
  userPublicKey: PublicKey,
  userUsdcAccount: PublicKey,
  userUsdiAccount: PublicKey,
  amountIn: number,
  isWithdrawal: boolean
): TransactionInstruction {
  // Convert amount to raw units (USDC has 6 decimals)
  const amount = Math.floor(amountIn * Math.pow(10, 6));

  // Prepare instruction data
  const data = Buffer.alloc(41);

  // Write swap instruction discriminator
  data.write("2b04ed0b1ac91e62", 0, "hex");

  // Write amount
  data.writeBigUInt64LE(BigInt(amount), 8);

  // Write minimum output amount (0 for now - no slippage protection)
  // data.writeBigUInt64LE(BigInt(0), 16);

  // Write minimum output amount (98.9% of input amount)
  const minimumAmountOut = Math.floor(amount * 0.989);
  data.writeBigUInt64LE(BigInt(minimumAmountOut), 16);

  // Write sqrtPriceLimitX64 - using exact value from successful transaction
  const sqrtPriceLimitX64 = isWithdrawal
    ? BigInt("4295048017") // For withdrawals (USDi -> USDC)
    : BigInt("79226673515401279992447579055"); // For deposits (USDC -> USDi)
  const bn = new BN(sqrtPriceLimitX64.toString());
  bn.maskn(64).toArrayLike(Buffer, "le", 8).copy(data, 24);
  bn.shrn(64).maskn(64).toArrayLike(Buffer, "le", 8).copy(data, 32);

  // Write direction flag
  data[40] = 1;

  // Use same account order as old code
  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },
    { pubkey: AMM_CONFIG, isSigner: false, isWritable: false },
    { pubkey: POOL_STATE, isSigner: false, isWritable: true },
    {
      pubkey: isWithdrawal ? userUsdiAccount : userUsdcAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: isWithdrawal ? userUsdcAccount : userUsdiAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: isWithdrawal ? OUTPUT_VAULT : INPUT_VAULT,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: isWithdrawal ? INPUT_VAULT : OUTPUT_VAULT,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: OBSERVATION_STATE, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: isWithdrawal ? USDI_MINT : USDC_MINT,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: isWithdrawal ? USDC_MINT : USDI_MINT,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey("3JP1QNbACeXBFpwBBHjAg8YUxaZvHRZ6aUSkekKt521M"),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey("E14EG74exe5oZeAL6cJksNDT59jFfYVu72o4QDqJBrEB"),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: isWithdrawal ? new PublicKey("ChvSyZQDGr9jcioJXBwq6Ube8Emi9sCjW3bzSGW5pYbG") : new PublicKey("FXMRNUwWrNAMiCZghjo3jvgmHak3Lrgcmd6QuuJZfkAx"),
      isSigner: false,
      isWritable: true,
    },
  ];

  return new TransactionInstruction({
    programId: CLMM_PROGRAM_ID,
    keys,
    data,
  });
}
