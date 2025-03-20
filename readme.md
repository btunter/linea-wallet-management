# Hedge Trading Bot

A Telegram bot for managing Solana wallets and interacting with DeFi protocols. This bot allows users to deposit USDC, mint USDi, and manage their wallets directly through Telegram.

## Features

- 💰 Wallet Creation & Management
- 💎 USDC Deposits & Withdrawals
- 📈 Minting
- 🔄 USDi/USDC Conversions
- 🔒 Secure Backup & Recovery
- 📊 Balance Checking

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Solana RPC endpoint (optional, defaults to public mainnet-beta)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/btunter/hedge-traing-bot-beta.git
cd hedge-traing-bot-beta
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
BOT_TOKEN=your_telegram_bot_token_here
```

## Development

Start the bot in development mode:

```bash
npm run dev
```

Build the TypeScript code:

```bash
npm run build
```

Start the production version:

```bash
npm start
```

## Bot Commands

- `/start` - Initialize the bot and show main menu
- `/deposit` - Get deposit address
- `/mint` - Start minting
- `/balance` - Check current balances
- `/convert` - Convert between USDi and USDC
- `/withdraw` - Withdraw funds
- `/backup` - Backup wallet seed phrase
- `/reset` - Reset wallet
- `/help` - Show available commands

## Project Structure

```
src/
├── commands/        # Command handlers
├── services/        # Core services (wallet, swap, transfer)
├── types/          # TypeScript type definitions
└── utils/          # Utilities and constants
```

## Security Notes

- Seed phrases are only shown once during backup
- Private keys are stored encrypted (TODO)
- Never share your seed phrase or private keys
- Always verify transaction details before confirming

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

This bot is provided as-is. Users are responsible for their own funds and should exercise caution when using DeFi protocols.
