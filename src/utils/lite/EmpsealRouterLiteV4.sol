// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../interface/IEmpsealRouter.sol";
import "../interface/IAdapter.sol";
import "../interface/IERC20.sol";
import "../interface/IWETH.sol";
import "../lib/SafeERC20.sol";
import "../lib/Maintainable.sol";
import "../lib/EmpsealViewUtils.sol";
import "../lib/Recoverable.sol";
import "../interface/IEmpsealStructs.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EmpsealRouter
 * @notice Gas-optimized router with off-chain pathfinding
 * @dev Supports both Standard Split and Converge Split strategies.
 */
contract EmpsealRouter is Maintainable, Recoverable, ReentrancyGuard, IEmpsealRouter, IEmpsealStructs {
    using SafeERC20 for IERC20;
    using OfferUtils for Offer;

    // -- Constants & Immutables --
    address public immutable WNATIVE;
    address public constant NATIVE = address(0);
    uint256 public constant FEE_DENOMINATOR = 1e4;
    
    // -- State Variables --
    uint256 public MIN_FEE = 0;
    address public FEE_CLAIMER;

    // -- Storage --
    address[] public TRUSTED_TOKENS;
    address[] public ADAPTERS;
    
    // O(1) Lookup for security check during swaps
    mapping(address => bool) public isTrustedAdapter;

    // -- Structs --
    struct Hop {
        address adapter;
        uint256 proportion;
        bytes data;
    }

    struct ConvergeTrade {
        address tokenIn;
        address intermediate;
        address tokenOut;
        uint256 amountIn;
        Hop[] inputHops;
        Hop outputHop;
    }

    // -- Constructor --
    constructor(
        address[] memory _adapters,
        address[] memory _trustedTokens,
        address _feeClaimer,
        address _wrapped_native
    ) {
        setAllowanceForWrapping(_wrapped_native);
        setTrustedTokens(_trustedTokens);
        setFeeClaimer(_feeClaimer);
        setAdapters(_adapters);
        WNATIVE = _wrapped_native;
    }

    // -- Admin Functions --
    
    function setAllowanceForWrapping(address _wnative) public onlyMaintainer {
        IERC20(_wnative).safeApprove(_wnative, type(uint256).max);
    }

    function setTrustedTokens(address[] memory _trustedTokens) public override onlyMaintainer {
        TRUSTED_TOKENS = _trustedTokens;
    }

    function setAdapters(address[] memory _adapters) public override onlyMaintainer {
        // Clear old adapters
        for (uint256 i = 0; i < ADAPTERS.length; i++) {
            isTrustedAdapter[ADAPTERS[i]] = false;
        }

        ADAPTERS = _adapters;

        // Whitelist new adapters
        for (uint256 i = 0; i < _adapters.length; i++) {
            isTrustedAdapter[_adapters[i]] = true;
        }
    }

    function setMinFee(uint256 _fee) external override onlyMaintainer {
        MIN_FEE = _fee;
    }

    function setFeeClaimer(address _claimer) public override onlyMaintainer {
        FEE_CLAIMER = _claimer;
    }

    // -- Internal Helpers --
    
    receive() external payable {}

    function _applyFee(uint256 _amountIn, uint256 _fee) internal view returns (uint256) {
        require(_fee >= MIN_FEE, "Fee too low");
        return (_amountIn * (FEE_DENOMINATOR - _fee)) / FEE_DENOMINATOR;
    }

    function _wrap(uint256 _amount) internal {
        IWETH(WNATIVE).deposit{ value: _amount }();
    }

    function _unwrap(uint256 _amount) internal {
        IWETH(WNATIVE).withdraw(_amount);
    }

    function _transferFrom(address token, address _from, address _to, uint _amount) internal {
        if (_from != address(this)) IERC20(token).safeTransferFrom(_from, _to, _amount);
        else IERC20(token).safeTransfer(_to, _amount);
    }

    function _returnTokensTo(address _token, uint256 _amount, address _to) internal {
        if (address(this) != _to) {
            if (_token == NATIVE) {
                // Fix H-4: Use call instead of transfer
                (bool success, ) = payable(_to).call{value: _amount}("");
                require(success, "Native transfer failed");
            } else {
                IERC20(_token).safeTransfer(_to, _amount);
            }
        }
    }

    // =============================================================
    // STRATEGY 1: CONVERGE SWAP (Split -> Merge)
    // =============================================================

    function executeConvergeSwap(
        ConvergeTrade calldata _trade,
        uint256 _minAmountOut,
        address _to,
        uint256 _fee,
        uint256 _deadline // Fix H-3/M-3
    ) external payable nonReentrant returns (uint256) {
        require(block.timestamp <= _deadline, "Transaction expired");
        // Fix M-6: Basic input validation
        require(_trade.inputHops.length > 0, "No input hops");
        require(_trade.amountIn > 0, "Zero amount");

        uint256 amountIn = _trade.amountIn;
        address from = msg.sender;

        // 1. Handle native wrapping
        if (_trade.tokenIn == WNATIVE && msg.value > 0) {
            require(msg.value == amountIn, "Value mismatch");
            _wrap(amountIn);
            from = address(this);
        }

        // 2. Apply fee
        if (_fee > 0) {
            uint256 feeAmount = amountIn - _applyFee(amountIn, _fee);
            if (feeAmount > 0) {
                _transferFrom(_trade.tokenIn, from, FEE_CLAIMER, feeAmount);
                amountIn -= feeAmount;
            }
        }

        // 3. Move funds to router
        if (from != address(this)) {
            IERC20(_trade.tokenIn).safeTransferFrom(from, address(this), amountIn);
        }

        // 4. FIRST LEG: Input -> Intermediate (Split)
        uint256 midBalBefore = IERC20(_trade.intermediate).balanceOf(address(this));
        
        // Fix M-2: Handle dust by assigning remainder to last hop
        uint256 remainingAmount = amountIn;

        for (uint256 i = 0; i < _trade.inputHops.length; i++) {
            // Fix C-3/C-4: Trusted adapter check
            require(isTrustedAdapter[_trade.inputHops[i].adapter], "Untrusted Adapter");

            uint256 hopAmount;
            if (i == _trade.inputHops.length - 1) {
                hopAmount = remainingAmount; // Last hop takes all remaining dust
            } else {
                hopAmount = (amountIn * _trade.inputHops[i].proportion) / FEE_DENOMINATOR;
                remainingAmount -= hopAmount;
            }
            
            if (hopAmount == 0) continue;

            uint256 expectedOut = IAdapter(_trade.inputHops[i].adapter).query(
                hopAmount,
                _trade.tokenIn,
                _trade.intermediate
            );

            IERC20(_trade.tokenIn).safeTransfer(_trade.inputHops[i].adapter, hopAmount);
            IAdapter(_trade.inputHops[i].adapter).swap(
                hopAmount,
                expectedOut,
                _trade.tokenIn,
                _trade.intermediate,
                address(this)
            );
        }

        uint256 midBalAfter = IERC20(_trade.intermediate).balanceOf(address(this));
        uint256 collectedIntermediate = midBalAfter - midBalBefore;
        require(collectedIntermediate > 0, "No intermediate tokens");

        // 5. SECOND LEG: Intermediate -> Output (Merge)
        require(isTrustedAdapter[_trade.outputHop.adapter], "Untrusted Adapter");

        uint256 expectedFinalOut = IAdapter(_trade.outputHop.adapter).query(
            collectedIntermediate,
            _trade.intermediate,
            _trade.tokenOut
        );

        uint256 balBefore = IERC20(_trade.tokenOut).balanceOf(_to);
        
        IERC20(_trade.intermediate).safeTransfer(_trade.outputHop.adapter, collectedIntermediate);
        IAdapter(_trade.outputHop.adapter).swap(
            collectedIntermediate,
            expectedFinalOut,
            _trade.intermediate,
            _trade.tokenOut,
            _to
        );

        uint256 balAfter = IERC20(_trade.tokenOut).balanceOf(_to);
        uint256 finalAmount = balAfter - balBefore;

        require(finalAmount >= _minAmountOut, "Slippage exceeded");

        // Fix M-5: Event uses amountIn (after fee logic applied above, amountIn variable holds actual swapped amt)
        emit EmpXswap(_trade.tokenIn, _trade.tokenOut, amountIn, finalAmount);
        return finalAmount;
    }

    // =============================================================
    // STRATEGY 2: STANDARD SPLIT (Parallel Paths)
    // =============================================================

    function executeSplitSwap(
        SplitPath[] calldata _paths,
        uint256 _amountIn,
        uint256 _minAmountOut,
        address _to,
        uint256 _fee,
        uint256 _deadline // Fix H-3/M-3
    ) external payable nonReentrant returns (uint256 totalOut) {
        require(block.timestamp <= _deadline, "Transaction expired");
        require(_paths.length > 0, "Empty paths"); // Fix M-6

        address tokenIn = _paths[0].path[0];
        address tokenOut = _paths[0].path[_paths[0].path.length - 1];
        address from = msg.sender;

        // 1. Handle wrapping
        if (tokenIn == WNATIVE && msg.value > 0) {
            require(msg.value == _amountIn, "Value mismatch");
            _wrap(msg.value);
            from = address(this);
        }

        // 2. Apply Fee
        uint256 amountAfterFee = _amountIn;
        if (_fee > 0) {
            uint256 feeAmount = _amountIn - _applyFee(_amountIn, _fee);
            if (feeAmount > 0) {
                _transferFrom(tokenIn, from, FEE_CLAIMER, feeAmount);
                amountAfterFee = _amountIn - feeAmount;
            }
        }

        if (from != address(this)) {
            IERC20(tokenIn).safeTransferFrom(from, address(this), amountAfterFee);
        }

        // 3. Execute Paths
        uint256 remainingAmount = amountAfterFee;

        for (uint256 i = 0; i < _paths.length; i++) {
            // Fix M-2: Handle dust
            uint256 pathAmount;
            if (i == _paths.length - 1) {
                pathAmount = remainingAmount;
            } else {
                pathAmount = (amountAfterFee * _paths[i].proportion) / FEE_DENOMINATOR;
                remainingAmount -= pathAmount;
            }

            if (pathAmount == 0) continue;

            uint256[] memory amounts = new uint256[](_paths[i].path.length);
            amounts[0] = pathAmount;

            for (uint256 j = 0; j < _paths[i].adapters.length; j++) {
                // Fix C-3/C-4: Trusted adapter check
                require(isTrustedAdapter[_paths[i].adapters[j]], "Untrusted Adapter");
                
                amounts[j + 1] = IAdapter(_paths[i].adapters[j]).query(
                    amounts[j],
                    _paths[i].path[j],
                    _paths[i].path[j + 1]
                );
            }

            IERC20(tokenIn).safeTransfer(_paths[i].adapters[0], amounts[0]);

            for (uint256 j = 0; j < _paths[i].adapters.length; j++) {
                address target = (j < _paths[i].adapters.length - 1) 
                    ? _paths[i].adapters[j + 1] 
                    : _to;

                IAdapter(_paths[i].adapters[j]).swap(
                    amounts[j],
                    amounts[j + 1],
                    _paths[i].path[j],
                    _paths[i].path[j + 1],
                    target
                );
            }

            totalOut += amounts[amounts.length - 1];
        }

        require(totalOut >= _minAmountOut, "Slippage exceeded");
        // Fix M-5: Emit amountAfterFee
        emit EmpXswap(tokenIn, tokenOut, amountAfterFee, totalOut);
    }

    // =============================================================
    // V1 COMPATIBILITY
    // =============================================================

    function _swapNoSplit(
        Trade calldata _trade,
        address _from,
        address _to,
        uint256 _fee
    ) internal returns (uint256) {
        // Fix M-6: Input validation
        require(_trade.adapters.length > 0, "No adapters");
        
        uint256[] memory amounts = new uint256[](_trade.path.length);
        
        if (_fee > 0 || MIN_FEE > 0) {
            amounts[0] = _applyFee(_trade.amountIn, _fee);
            _transferFrom(_trade.path[0], _from, FEE_CLAIMER, _trade.amountIn - amounts[0]);
        } else {
            amounts[0] = _trade.amountIn;
        }

        // Fix C-3/C-4: Validate all adapters
        for(uint256 i=0; i < _trade.adapters.length; i++) {
            require(isTrustedAdapter[_trade.adapters[i]], "Untrusted Adapter");
        }

        _transferFrom(_trade.path[0], _from, _trade.adapters[0], amounts[0]);

        for (uint256 i = 0; i < _trade.adapters.length; i++) {
            amounts[i + 1] = IAdapter(_trade.adapters[i]).query(
                amounts[i],
                _trade.path[i],
                _trade.path[i + 1]
            );
        }

        require(amounts[amounts.length - 1] >= _trade.amountOut, "Insufficient output");

        for (uint256 i = 0; i < _trade.adapters.length; i++) {
            address targetAddress = (i < _trade.adapters.length - 1) 
                ? _trade.adapters[i + 1] 
                : _to;
            
            IAdapter(_trade.adapters[i]).swap(
                amounts[i],
                amounts[i + 1],
                _trade.path[i],
                _trade.path[i + 1],
                targetAddress
            );
        }

        emit EmpXswap(_trade.path[0], _trade.path[_trade.path.length - 1], _trade.amountIn, amounts[amounts.length - 1]);
        return amounts[amounts.length - 1];
    }

    function swapNoSplit(Trade calldata t, address to, uint256 f) public override nonReentrant {
        _swapNoSplit(t, msg.sender, to, f);
    }

    function swapNoSplitFromPLS(Trade calldata t, address to, uint256 f) external payable override nonReentrant {
        require(t.path[0] == WNATIVE, "Not WPLS");
        _wrap(t.amountIn);
        _swapNoSplit(t, address(this), to, f);
    }

    function swapNoSplitToPLS(Trade calldata t, address to, uint256 f) public override nonReentrant {
        require(t.path[t.path.length - 1] == WNATIVE, "Not WPLS");
        uint256 ret = _swapNoSplit(t, msg.sender, address(this), f);
        _unwrap(ret);
        _returnTokensTo(NATIVE, ret, to);
    }

    function swapNoSplitWithPermit(
        Trade calldata t,
        address to,
        uint256 f,
        uint256 d,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override nonReentrant {
        IERC20(t.path[0]).permit(msg.sender, address(this), t.amountIn, d, v, r, s);
        swapNoSplit(t, to, f);
    }

    function swapNoSplitToPLSWithPermit(
        Trade calldata t,
        address to,
        uint256 f,
        uint256 d,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override nonReentrant {
        IERC20(t.path[0]).permit(msg.sender, address(this), t.amountIn, d, v, r, s);
        swapNoSplitToPLS(t, to, f);
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function trustedTokensCount() external view override returns (uint256) {
        return TRUSTED_TOKENS.length;
    }

    function adaptersCount() external view override returns (uint256) {
        return ADAPTERS.length;
    }

    function queryAdapter(uint256 a, address b, address c, uint8 d) external view override returns (uint256) {
        return IAdapter(ADAPTERS[d]).query(a, b, c);
    }

    function queryNoSplit(uint256 _amountIn, address _tokenIn, address _tokenOut) 
        public view override returns (Query memory) 
    {
        Query memory bestQuery;
        for (uint8 i; i < ADAPTERS.length; i++) {
            try IAdapter(ADAPTERS[i]).query(_amountIn, _tokenIn, _tokenOut) returns (uint256 val) {
                if (val > bestQuery.amountOut) {
                    bestQuery = Query(ADAPTERS[i], _tokenIn, _tokenOut, val);
                }
            } catch {}
        }
        return bestQuery;
    }

    function queryNoSplit(uint256 a, address b, address c, uint8[] calldata d) 
        public view override returns (Query memory) 
    {
        Query memory bestQuery;
        for (uint8 i; i < d.length; i++) {
            try IAdapter(ADAPTERS[d[i]]).query(a, b, c) returns (uint256 val) {
                if (val > bestQuery.amountOut) {
                    bestQuery = Query(ADAPTERS[d[i]], b, c, val);
                }
            } catch {}
        }
        return bestQuery;
    }

    function findBestPath(uint256 a, address b, address c, uint256 d) 
        public view override returns (FormattedOffer memory) 
    {
        Offer memory o = OfferUtils.newOffer(a, b);
        return o.format();
    }

    function findBestPathWithGas(uint256 a, address b, address c, uint256 d, uint256 e) 
        external view override returns (FormattedOffer memory) 
    {
        return findBestPath(a, b, c, d);
    }
}