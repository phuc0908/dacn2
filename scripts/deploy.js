// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat")
const { items } = require("../src/items.json")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {
  // Setup accounts
  const [deployer] = await ethers.getSigners()

  // Deploy Dappazon
  const Dappazon = await hre.ethers.getContractFactory("Dappazon")
  const dappazon = await Dappazon.deploy()
  await dappazon.deployed()

  console.log(`Deployed Dappazon Contract at: ${dappazon.address}\n`)

  // Save config
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, '../src/config.json');

  const config = {
    "31337": {
      "dappazon": {
        "address": dappazon.address
      }
    },
    // Keep other potential networks if we were merging, but for now strict overwrite is fine for local dev
    // or we can read existing and update.
  };

  // Let's try to preserve existing if possible, but simplest is to just write for localhost
  let currentConfig = {};
  try {
    currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) { }

  currentConfig["31337"] = {
    "dappazon": {
      "address": dappazon.address
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));

  // Listing items...
  for (let i = 0; i < items.length; i++) {
    const transaction = await dappazon.connect(deployer).list(
      items[i].id,
      items[i].name,
      items[i].category,
      items[i].image,
      tokens(items[i].price),
      items[i].rating,
      items[i].stock,
    )

    await transaction.wait()

    console.log(`Listed item ${items[i].id}: ${items[i].name}`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
