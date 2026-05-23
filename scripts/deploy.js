const hre = require("hardhat");

async function main() {
  const [deployer, depositWallet] = await hre.ethers.getSigners();

  const now = Math.floor(Date.now() / 1000);
  const saleStart = now + 3600;
  const saleEnd = saleStart + 7 * 24 * 3600;
  const tokenTradeStart = saleEnd + 3600;

  const tokenPrice = hre.ethers.parseEther("0.001");
  const hardCap = hre.ethers.parseEther("100");
  const minInvestment = hre.ethers.parseEther("0.1");
  const maxInvestment = hre.ethers.parseEther("10");
  const founderAllocation = hre.ethers.parseEther("1000000");
  const tokensForSale = hre.ethers.parseEther("500000");

  const CryptosICO = await hre.ethers.getContractFactory("CryptosICO");
  const ico = await CryptosICO.deploy(
    deployer.address,
    depositWallet.address,
    tokenPrice,
    hardCap,
    saleStart,
    saleEnd,
    tokenTradeStart,
    minInvestment,
    maxInvestment,
    founderAllocation,
    tokensForSale
  );

  await ico.waitForDeployment();
  const address = await ico.getAddress();

  console.log("CryptosICO deployed to:", address);
  console.log("Admin:", deployer.address);
  console.log("Deposit wallet:", depositWallet.address);
  console.log("Sale start:", saleStart);
  console.log("Sale end:", saleEnd);
  console.log("Token trade start:", tokenTradeStart);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
