const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptosICO", function () {
  const TOKEN_PRICE = ethers.parseEther("0.001"); // 0.001 ETH per 1 CRPT
  const HARD_CAP = ethers.parseEther("100");
  const MIN_INVESTMENT = ethers.parseEther("0.1");
  const MAX_INVESTMENT = ethers.parseEther("10");
  const FOUNDER_ALLOCATION = ethers.parseEther("1000000");
  const TOKENS_FOR_SALE = ethers.parseEther("500000");

  let admin;
  let depositWallet;
  let investor1;
  let investor2;
  let other;
  let ico;
  let saleStart;
  let saleEnd;
  let tokenTradeStart;

  async function deployICO(overrides = {}) {
    const now = await time.latest();
    saleStart = overrides.saleStart ?? now + 3600;
    saleEnd = overrides.saleEnd ?? saleStart + 86400 * 7;
    tokenTradeStart = overrides.tokenTradeStart ?? saleEnd + 3600;

    const CryptosICO = await ethers.getContractFactory("CryptosICO");
    return CryptosICO.deploy(
      overrides.admin ?? admin.address,
      overrides.depositWallet ?? depositWallet.address,
      overrides.tokenPrice ?? TOKEN_PRICE,
      overrides.hardCap ?? HARD_CAP,
      saleStart,
      saleEnd,
      tokenTradeStart,
      overrides.minInvestment ?? MIN_INVESTMENT,
      overrides.maxInvestment ?? MAX_INVESTMENT,
      overrides.founderAllocation ?? FOUNDER_ALLOCATION,
      overrides.tokensForSale ?? TOKENS_FOR_SALE
    );
  }

  beforeEach(async function () {
    [admin, depositWallet, investor1, investor2, other] =
      await ethers.getSigners();
    ico = await deployICO();
    await ico.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets admin and deposit wallet", async function () {
      expect(await ico.admin()).to.equal(admin.address);
      expect(await ico.depositWallet()).to.equal(depositWallet.address);
    });

    it("sets ICO parameters", async function () {
      expect(await ico.tokenPrice()).to.equal(TOKEN_PRICE);
      expect(await ico.hardCap()).to.equal(HARD_CAP);
      expect(await ico.minInvestment()).to.equal(MIN_INVESTMENT);
      expect(await ico.maxInvestment()).to.equal(MAX_INVESTMENT);
      expect(await ico.tokensForSale()).to.equal(TOKENS_FOR_SALE);
      expect(await ico.raisedAmount()).to.equal(0n);
      expect(await ico.halted()).to.equal(false);
    });
  });

  describe("Token metadata", function () {
    it("returns correct ERC20 metadata", async function () {
      expect(await ico.name()).to.equal("Cryptos");
      expect(await ico.symbol()).to.equal("CRPT");
      expect(await ico.decimals()).to.equal(18);
      expect(await ico.totalSupply()).to.equal(
        FOUNDER_ALLOCATION + TOKENS_FOR_SALE
      );
    });
  });

  describe("Initial supply", function () {
    it("assigns founder allocation to admin", async function () {
      expect(await ico.balanceOf(admin.address)).to.equal(FOUNDER_ALLOCATION);
    });

    it("holds tokens for sale on the contract", async function () {
      expect(await ico.balanceOf(await ico.getAddress())).to.equal(
        TOKENS_FOR_SALE
      );
    });
  });

  describe("Investment", function () {
    beforeEach(async function () {
      await time.increaseTo(saleStart + 1);
    });

    it("accepts successful investment and forwards ETH", async function () {
      const amount = ethers.parseEther("1");
      const expectedTokens = (amount * 10n ** 18n) / TOKEN_PRICE;
      const walletBefore = await ethers.provider.getBalance(
        depositWallet.address
      );

      await expect(ico.connect(investor1).invest({ value: amount }))
        .to.emit(ico, "Invested")
        .withArgs(investor1.address, amount, expectedTokens)
        .and.to.emit(ico, "Transfer")
        .withArgs(await ico.getAddress(), investor1.address, expectedTokens);

      expect(await ico.balanceOf(investor1.address)).to.equal(expectedTokens);
      expect(await ico.raisedAmount()).to.equal(amount);
      expect(await ico.tokensSold()).to.equal(expectedTokens);
      expect(await ico.investedAmount(investor1.address)).to.equal(amount);

      const walletAfter = await ethers.provider.getBalance(
        depositWallet.address
      );
      expect(walletAfter - walletBefore).to.equal(amount);
    });

    it("accepts investment via receive()", async function () {
      const amount = MIN_INVESTMENT;
      const expectedTokens = (amount * 10n ** 18n) / TOKEN_PRICE;

      await expect(
        investor1.sendTransaction({
          to: await ico.getAddress(),
          value: amount,
        })
      ).to.emit(ico, "Invested");

      expect(await ico.balanceOf(investor1.address)).to.equal(expectedTokens);
    });

    it("rejects investment below minimum", async function () {
      const belowMin = MIN_INVESTMENT - 1n;
      await expect(
        ico.connect(investor1).invest({ value: belowMin })
      ).to.be.revertedWithCustomError(ico, "BelowMinInvestment");
    });

    it("rejects investment above maximum per investor", async function () {
      await ico.connect(investor1).invest({ value: MAX_INVESTMENT });
      await expect(
        ico.connect(investor1).invest({ value: MIN_INVESTMENT })
      ).to.be.revertedWithCustomError(ico, "AboveMaxInvestment");
    });

    it("rejects investment after hard cap", async function () {
      const smallCap = ethers.parseEther("15");
      const cappedIco = await deployICO({ hardCap: smallCap });
      await cappedIco.waitForDeployment();
      await time.increaseTo(saleStart + 1);

      await cappedIco.connect(investor1).invest({ value: MAX_INVESTMENT });
      await cappedIco
        .connect(investor2)
        .invest({ value: smallCap - MAX_INVESTMENT });
      await expect(
        cappedIco.connect(investor2).invest({ value: MIN_INVESTMENT })
      ).to.be.revertedWithCustomError(cappedIco, "HardCapExceeded");
    });

    it("rejects investment after sale end", async function () {
      await time.increaseTo(saleEnd + 1);
      await expect(
        ico.connect(investor1).invest({ value: MIN_INVESTMENT })
      ).to.be.revertedWithCustomError(ico, "SaleNotActive");
    });
  });

  describe("Investment timing", function () {
    it("rejects investment before sale start", async function () {
      const now = await time.latest();
      const preStart = now + 7200;
      const preEnd = preStart + 86400;
      const fresh = await deployICO({
        saleStart: preStart,
        saleEnd: preEnd,
        tokenTradeStart: preEnd + 3600,
      });
      await fresh.waitForDeployment();
      await expect(
        fresh.connect(investor1).invest({ value: MIN_INVESTMENT })
      ).to.be.revertedWithCustomError(fresh, "SaleNotActive");
    });
  });

  describe("Halt and resume", function () {
    beforeEach(async function () {
      await time.increaseTo(saleStart + 1);
    });

    it("halts and resumes the sale", async function () {
      await expect(ico.connect(admin).halt())
        .to.emit(ico, "Halted")
        .withArgs(admin.address);
      expect(await ico.halted()).to.equal(true);
      expect(await ico.getCurrentState()).to.equal(3n); // Halted

      await expect(
        ico.connect(investor1).invest({ value: MIN_INVESTMENT })
      ).to.be.revertedWithCustomError(ico, "ICOHalted");

      await expect(ico.connect(admin).resume())
        .to.emit(ico, "Resumed")
        .withArgs(admin.address);
      expect(await ico.halted()).to.equal(false);

      await expect(
        ico.connect(investor1).invest({ value: MIN_INVESTMENT })
      ).to.emit(ico, "Invested");
    });

    it("only admin can halt", async function () {
      await expect(ico.connect(other).halt()).to.be.revertedWithCustomError(
        ico,
        "NotAdmin"
      );
    });

    it("only admin can resume", async function () {
      await ico.connect(admin).halt();
      await expect(ico.connect(other).resume()).to.be.revertedWithCustomError(
        ico,
        "NotAdmin"
      );
    });

    it("only admin can change deposit address", async function () {
      await expect(
        ico.connect(other).changeDepositAddress(other.address)
      ).to.be.revertedWithCustomError(ico, "NotAdmin");

      await expect(ico.connect(admin).changeDepositAddress(other.address))
        .to.emit(ico, "DepositAddressChanged")
        .withArgs(depositWallet.address, other.address);
      expect(await ico.depositWallet()).to.equal(other.address);
    });

    it("rejects zero address for deposit change", async function () {
      await expect(
        ico.connect(admin).changeDepositAddress(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(ico, "ZeroAddress");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await time.increaseTo(saleStart + 1);
      await ico.connect(investor1).invest({ value: MIN_INVESTMENT });
    });

    it("blocks transfers before tokenTradeStart", async function () {
      const balance = await ico.balanceOf(investor1.address);
      await expect(
        ico.connect(investor1).transfer(investor2.address, balance)
      ).to.be.revertedWithCustomError(ico, "TradingNotStarted");
    });

    it("allows transfers after tokenTradeStart", async function () {
      await time.increaseTo(tokenTradeStart + 1);
      const amount = ethers.parseEther("10");
      await expect(ico.connect(investor1).transfer(investor2.address, amount))
        .to.emit(ico, "Transfer")
        .withArgs(investor1.address, investor2.address, amount);
      expect(await ico.balanceOf(investor2.address)).to.equal(amount);
    });
  });

  describe("Approve and transferFrom", function () {
    beforeEach(async function () {
      await time.increaseTo(saleStart + 1);
      await ico.connect(investor1).invest({ value: MIN_INVESTMENT });
      await time.increaseTo(tokenTradeStart + 1);
    });

    it("approve and transferFrom work correctly", async function () {
      const amount = ethers.parseEther("5");
      await expect(ico.connect(investor1).approve(investor2.address, amount))
        .to.emit(ico, "Approval")
        .withArgs(investor1.address, investor2.address, amount);

      expect(await ico.allowance(investor1.address, investor2.address)).to.equal(
        amount
      );

      await expect(
        ico
          .connect(investor2)
          .transferFrom(investor1.address, other.address, amount)
      )
        .to.emit(ico, "Transfer")
        .withArgs(investor1.address, other.address, amount);

      expect(await ico.balanceOf(other.address)).to.equal(amount);
      expect(await ico.allowance(investor1.address, investor2.address)).to.equal(
        0n
      );
    });

    it("rejects approve to zero address", async function () {
      await expect(
        ico.connect(investor1).approve(ethers.ZeroAddress, 1n)
      ).to.be.revertedWithCustomError(ico, "ZeroAddress");
    });
  });

  describe("Burn unsold tokens", function () {
    beforeEach(async function () {
      await time.increaseTo(saleStart + 1);
      await ico.connect(investor1).invest({ value: MIN_INVESTMENT });
    });

    it("burns unsold tokens after sale ends", async function () {
      await time.increaseTo(saleEnd + 1);

      const contractAddr = await ico.getAddress();
      const unsoldBefore = await ico.balanceOf(contractAddr);
      const sold = await ico.tokensSold();
      expect(unsoldBefore).to.equal(TOKENS_FOR_SALE - sold);

      const supplyBefore = await ico.totalSupply();
      await expect(ico.connect(admin).burnUnsoldTokens())
        .to.emit(ico, "UnsoldTokensBurned")
        .withArgs(unsoldBefore);

      expect(await ico.balanceOf(contractAddr)).to.equal(0n);
      expect(await ico.totalSupply()).to.equal(supplyBefore - unsoldBefore);
    });

    it("rejects burn while sale is active", async function () {
      await expect(
        ico.connect(admin).burnUnsoldTokens()
      ).to.be.revertedWithCustomError(ico, "SaleStillActive");
    });

    it("only admin can burn", async function () {
      await time.increaseTo(saleEnd + 1);
      await expect(
        ico.connect(other).burnUnsoldTokens()
      ).to.be.revertedWithCustomError(ico, "NotAdmin");
    });
  });

  describe("getCurrentState", function () {
    it("returns PreSale before start", async function () {
      expect(await ico.getCurrentState()).to.equal(0n);
    });

    it("returns Running during sale", async function () {
      await time.increaseTo(saleStart + 1);
      expect(await ico.getCurrentState()).to.equal(1n);
    });

    it("returns PostSale after end when not halted", async function () {
      await time.increaseTo(saleEnd + 1);
      expect(await ico.getCurrentState()).to.equal(2n);
    });
  });
});
