// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CryptosICO
 * @notice Manual ERC20-style token with integrated ICO crowdsale (no OpenZeppelin).
 */
contract CryptosICO {
    // ——— ERC20 metadata ———
    string public constant name = "Cryptos";
    string public constant symbol = "CRPT";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ——— ICO configuration ———
    address public admin;
    address payable public depositWallet;
    uint256 public tokenPrice;
    uint256 public hardCap;
    uint256 public raisedAmount;
    uint256 public saleStartTime;
    uint256 public saleEndTime;
    uint256 public tokenTradeStartTime;
    uint256 public minInvestment;
    uint256 public maxInvestment;

    uint256 public tokensForSale;
    uint256 public tokensSold;
    bool public halted;

    mapping(address => uint256) public investedAmount;

    bool private _investLocked;

    enum State {
        PreSale,
        Running,
        PostSale,
        Halted
    }

    // ——— Events ———
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Invested(address indexed investor, uint256 ethAmount, uint256 tokens);
    event Halted(address indexed admin);
    event Resumed(address indexed admin);
    event DepositAddressChanged(
        address indexed oldWallet,
        address indexed newWallet
    );
    event UnsoldTokensBurned(uint256 amount);

    // ——— Errors ———
    error ZeroAddress();
    error NotAdmin();
    error ICOHalted();
    error SaleNotActive();
    error BelowMinInvestment();
    error AboveMaxInvestment();
    error HardCapExceeded();
    error InsufficientTokensForSale();
    error TradingNotStarted();
    error InvalidAmount();
    error InsufficientBalance();
    error InsufficientAllowance();
    error SaleStillActive();
    error NothingToBurn();
    error TransferFailed();
    error ReentrancyGuard();
    error InvalidSaleEconomics();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(
        address _admin,
        address payable _depositWallet,
        uint256 _tokenPrice,
        uint256 _hardCap,
        uint256 _saleStartTime,
        uint256 _saleEndTime,
        uint256 _tokenTradeStartTime,
        uint256 _minInvestment,
        uint256 _maxInvestment,
        uint256 _founderAllocation,
        uint256 _tokensForSale
    ) {
        if (_admin == address(0) || _depositWallet == address(0)) {
            revert ZeroAddress();
        }
        if (_tokenPrice == 0) revert InvalidAmount();
        if (_hardCap == 0 || _tokensForSale == 0) revert InvalidAmount();
        if (_minInvestment > _maxInvestment) revert InvalidAmount();
        if (_saleStartTime >= _saleEndTime) revert InvalidAmount();
        if (_tokenTradeStartTime < _saleEndTime) revert InvalidAmount();

        uint256 maxRaiseForSale = (_tokensForSale * _tokenPrice) /
            (10 ** decimals);
        if (_hardCap > maxRaiseForSale) revert InvalidSaleEconomics();

        admin = _admin;
        depositWallet = _depositWallet;
        tokenPrice = _tokenPrice;
        hardCap = _hardCap;
        saleStartTime = _saleStartTime;
        saleEndTime = _saleEndTime;
        tokenTradeStartTime = _tokenTradeStartTime;
        minInvestment = _minInvestment;
        maxInvestment = _maxInvestment;
        tokensForSale = _tokensForSale;

        uint256 supply = _founderAllocation + _tokensForSale;
        _totalSupply = supply;
        _balances[_admin] = _founderAllocation;
        _balances[address(this)] = _tokensForSale;

        emit Transfer(address(0), _admin, _founderAllocation);
        emit Transfer(address(0), address(this), _tokensForSale);
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        if (from == address(0) || to == address(0)) revert ZeroAddress();

        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();

        unchecked {
            _allowances[from][msg.sender] = currentAllowance - amount;
        }

        _transfer(from, to, amount);
        return true;
    }

    function invest() public payable {
        if (_investLocked) revert ReentrancyGuard();
        _investLocked = true;

        if (halted) revert ICOHalted();
        if (
            block.timestamp < saleStartTime || block.timestamp > saleEndTime
        ) {
            revert SaleNotActive();
        }
        if (msg.value < minInvestment) revert BelowMinInvestment();

        uint256 newInvested = investedAmount[msg.sender] + msg.value;
        if (newInvested > maxInvestment) revert AboveMaxInvestment();
        if (raisedAmount + msg.value > hardCap) revert HardCapExceeded();

        uint256 tokenAmount = (msg.value * 10 ** decimals) / tokenPrice;
        if (tokenAmount == 0) revert InvalidAmount();
        if (tokensSold + tokenAmount > tokensForSale) {
            revert InsufficientTokensForSale();
        }

        investedAmount[msg.sender] = newInvested;
        raisedAmount += msg.value;
        tokensSold += tokenAmount;

        _balances[address(this)] -= tokenAmount;
        _balances[msg.sender] += tokenAmount;

        emit Transfer(address(this), msg.sender, tokenAmount);
        emit Invested(msg.sender, msg.value, tokenAmount);

        (bool sent, ) = depositWallet.call{value: msg.value}("");
        if (!sent) revert TransferFailed();

        _investLocked = false;
    }

    receive() external payable {
        invest();
    }

    function halt() external onlyAdmin {
        halted = true;
        emit Halted(msg.sender);
    }

    function resume() external onlyAdmin {
        halted = false;
        emit Resumed(msg.sender);
    }

    function changeDepositAddress(
        address payable newDepositWallet
    ) external onlyAdmin {
        if (newDepositWallet == address(0)) revert ZeroAddress();
        address old = depositWallet;
        depositWallet = newDepositWallet;
        emit DepositAddressChanged(old, newDepositWallet);
    }

    function getCurrentState() external view returns (State) {
        if (halted) return State.Halted;
        if (block.timestamp < saleStartTime) return State.PreSale;
        if (block.timestamp <= saleEndTime) return State.Running;
        return State.PostSale;
    }

    function burnUnsoldTokens() external onlyAdmin {
        if (block.timestamp <= saleEndTime) revert SaleStillActive();

        uint256 unsoldAmount = tokensForSale - tokensSold;
        if (unsoldAmount == 0) revert NothingToBurn();

        uint256 contractBalance = _balances[address(this)];
        if (contractBalance < unsoldAmount) revert InsufficientBalance();

        _balances[address(this)] = contractBalance - unsoldAmount;
        _totalSupply -= unsoldAmount;

        emit Transfer(address(this), address(0), unsoldAmount);
        emit UnsoldTokensBurned(unsoldAmount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (block.timestamp < tokenTradeStartTime) revert TradingNotStarted();
        if (_balances[from] < amount) revert InsufficientBalance();

        unchecked {
            _balances[from] -= amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }
}
