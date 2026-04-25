const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

/**
 * Docker Orchestrator Service
 * Handles provisioning and terminating Freqtrade AI Microservices.
 */

const CONFIG_DIR = path.join(__dirname, '../freqtrade_configs/user_data');

function generateFreqtradeConfig(bot) {
  // Ensure the directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Define a custom config template bridging Solidus variables into Freqtrade format
  const configTemplate = {
    "initial_state": "running",
    "max_open_trades": 3,
    "stake_currency": "USDT",
    "stake_amount": bot.amount, // Directly mapped from User UI Capital Allocation
    "tradable_balance_ratio": 0.99,
    "fiat_display_currency": "USD",
    "dry_run": true,
    "cancel_open_orders_on_exit": false,
    "exchange": {
      "name": "binance",
      "key": "your_exchange_key",
      "secret": "your_exchange_secret",
      "ccxt_config": { "enableRateLimit": true },
      "ccxt_async_config": {
        "enableRateLimit": true,
        "rateLimit": 200
      },
      "pair_whitelist": [
        bot.pair.replace('USDT', '/USDT') // Convert BTCUSDT -> BTC/USDT
      ],
      "pair_blacklist": ["BNB/BTC", "USDC/USDT"]
    },
    "pairlists": [
      {
        "method": "StaticPairList"
      }
    ],
    // Required Pricing configuration blocks for recent Freqtrade versions
    "entry_pricing": {
      "price_side": "same",
      "use_order_book": true,
      "order_book_top": 1,
      "price_last_balance": 0.0,
      "check_depth_of_market": {
        "enabled": false,
        "bids_to_ask_delta": 1
      }
    },
    "exit_pricing": {
      "price_side": "same",
      "use_order_book": true,
      "order_book_top": 1
    },
    // Freqtrade webhook bridging back to Solidus Node.js server
    "webhook": {
      "enabled": true,
      "url": "http://host.docker.internal:4002/api/webhook",
      "webhookentry": { "type": "open", "botName": bot.name, "botId": bot.id, "price": "{current_rate}" },
      "webhookexit": { "type": "close", "botName": bot.name, "botId": bot.id, "pnl": "{profit_amount}", "price": "{current_rate}" }
    }
  };

  const configPath = path.join(CONFIG_DIR, `config_${bot.id}.json`);
  fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2));
  return configPath;
}

async function ensureImageExists() {
  const envPrefix = 'export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin && ';
  try {
    const { stdout } = await execPromise(`${envPrefix}docker images -q solidus-ai-engine:latest`);
    if (!stdout.trim()) {
      console.log('\n[Docker Orchestrator] Custom image solidus-ai-engine not found. Building now... (this may take 1-2 minutes)');
      const dockerfilePath = path.resolve(__dirname, '../freqtrade_configs');
      await execPromise(`${envPrefix}docker build -t solidus-ai-engine:latest "${dockerfilePath}"`);
      console.log('[Docker Orchestrator] Custom image solidus-ai-engine built successfully.');
    }
  } catch (err) {
    if (err.message.includes('command not found: docker') || err.message.includes('docker: command not found') || err.message.includes('Cannot connect to the Docker daemon')) {
       // Silent ignore in simulated mode
    } else {
       console.error('[Docker Orchestrator] Error checking/building image:', err);
    }
  }
}

async function spawnCloudEngine(bot) {
  console.log(`\n[Orchestrator] Provisioning Cloud AI Engine for Bot: ${bot.name} (${bot.id})`);
  
  // 1. Generate Config
  const configPath = generateFreqtradeConfig(bot);
  console.log(`[Orchestrator] Successfully generated custom ML config: ${configPath}`);

  // 1.5 Ensure Custom AI Image Exists
  await ensureImageExists();

  // 2. Prepare Docker Execution Command
  // Uses custom solidus-ai-engine, mounts the local configs, and selects NostalgiaForInfinityX
  const containerName = `freqtrade_engine_${bot.id}`;
  const envPrefix = 'export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin && ';
  const dockerCmd = `${envPrefix}docker run -d --name ${containerName} \
    -v ${path.resolve(__dirname, '../freqtrade_configs')}:/freqtrade/user_data \
    solidus-ai-engine:latest trade \
    --strategy NostalgiaForInfinityX \
    --config /freqtrade/user_data/user_data/config_${bot.id}.json`;

  console.log(`[Orchestrator] Executing payload: ${dockerCmd}`);

  // 3. Spawn the Container via Child Process
  exec(dockerCmd, (error, stdout, stderr) => {
    if (error) {
      if (error.message.includes('command not found: docker') || error.message.includes('docker: command not found')) {
        console.warn(`\n[Orchestrator Warning] Docker is not installed on this server environment.`);
        console.warn(`[Orchestrator] Entering "Simulated Orchestrator Mode". Bot ${bot.name} is running virtually.`);
      } else {
        console.error(`[Orchestrator Error] Failed to spawn container: ${error.message}`);
      }
      return;
    }
    console.log(`\n[Orchestrator Success] Freqtrade AI Container '${containerName}' is now LIVE.`);
    if (stdout) console.log(`Container ID: ${stdout.trim()}`);
  });
}

function terminateCloudEngine(botId) {
  const containerName = `freqtrade_engine_${botId}`;
  console.log(`\n[Orchestrator] Terminating container: ${containerName}`);

  const envPrefix = 'export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin && ';
  const dockerCmd = `${envPrefix}docker stop ${containerName} && ${envPrefix}docker rm ${containerName}`;
  
  exec(dockerCmd, (error, stdout, stderr) => {
    if (error) {
      // Ignore errors if docker wasn't running (e.g. simulated mode)
      if (error.message.includes('command not found: docker') || error.message.includes('No such container')) {
        console.log(`[Orchestrator] Engine shutdown simulated locally.`);
      } else {
        console.error(`[Orchestrator Error] Failed to terminate container: ${error.message}`);
      }
    } else {
      console.log(`[Orchestrator Success] Destroyed container: ${containerName}`);
    }

    // Cleanup config file
    const configPath = path.join(CONFIG_DIR, `config_${botId}.json`);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log(`[Orchestrator] Cleaned up config for bot ${botId}`);
    }
  });
}

module.exports = {
  spawnCloudEngine,
  terminateCloudEngine
};
