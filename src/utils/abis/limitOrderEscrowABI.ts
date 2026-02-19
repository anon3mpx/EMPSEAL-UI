export const LIMIT_ORDER_ABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"internalType": "address[]",
				"name": "path",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "adapters",
				"type": "address[]"
			},
			{
				"internalType": "uint256",
				"name": "requestedFillAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "gasStart",
				"type": "uint256"
			}
		],
		"name": "_executeOrderInternalWrapper",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "amountOut",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "tokens",
				"type": "address[]"
			}
		],
		"name": "addStableTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "addToWhitelist",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "bot",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "authorizeBot",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "cancelOrder",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "orderIds",
				"type": "uint256[]"
			}
		],
		"name": "cancelOrders",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "entryTokenIn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "entryTokenOut",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "entryAmountIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "entryMinAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "entryLimitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "entryDeadline",
				"type": "uint256"
			},
			{
				"internalType": "enum LimitOrderEscrow.OrderType",
				"name": "entryOrderType",
				"type": "uint8"
			},
			{
				"internalType": "address",
				"name": "exitToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "stopLossLimitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossMinAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossDeadline",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitLimitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitMinAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitDeadline",
				"type": "uint256"
			}
		],
		"name": "createBracketOrder",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "entryOrderId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossOrderId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitOrderId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "tokenIn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "exitToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amountIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossLimitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossMinAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossDeadline",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitLimitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitMinAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitDeadline",
				"type": "uint256"
			}
		],
		"name": "createPositionBracket",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossOrderId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitOrderId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "tokenIn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "tokenOut",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amountIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "minAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "limitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			},
			{
				"internalType": "enum LimitOrderEscrow.PartialFillMode",
				"name": "fillMode",
				"type": "uint8"
			},
			{
				"internalType": "enum LimitOrderEscrow.OrderType",
				"name": "orderType",
				"type": "uint8"
			}
		],
		"name": "createOrder",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "orderIds",
				"type": "uint256[]"
			},
			{
				"internalType": "address[][]",
				"name": "paths",
				"type": "address[][]"
			},
			{
				"internalType": "address[][]",
				"name": "adapterPaths",
				"type": "address[][]"
			},
			{
				"internalType": "uint256[]",
				"name": "fillAmounts",
				"type": "uint256[]"
			}
		],
		"name": "executeBatch",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "amountsOut",
				"type": "uint256[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"internalType": "address[]",
				"name": "path",
				"type": "address[]"
			},
			{
				"internalType": "address[]",
				"name": "adapters",
				"type": "address[]"
			},
			{
				"internalType": "uint256",
				"name": "requestedFillAmount",
				"type": "uint256"
			}
		],
		"name": "executeOrder",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "amountOut",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "removeFromWhitelist",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "tokens",
				"type": "address[]"
			}
		],
		"name": "removeStableTokens",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_empsealRouter",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_wnative",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_feeCollector",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_botCollector",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_protocolFeeRate",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_botFeeRate",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_volatileRouterFee",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_stableRouterFee",
				"type": "uint256"
			},
			{
				"internalType": "address[]",
				"name": "_whitelist",
				"type": "address[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "EnforcedPause",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ExcessiveFillAmount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ExpectedPause",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "FundsNotDeposited",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "GroupNotActive",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InsufficientOutput",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidAmount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidGroupConfiguration",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidPartialFillMode",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidTokenDecimals",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidTokenPair",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OrderExpiredError",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OrderNotActive",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OrderNotFound",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "SafeERC20FailedOperation",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "TokenNotWhitelisted",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "TooManySplits",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Unauthorized",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ZeroAddress",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "bot",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "BotAuthorized",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "EmergencyUnpaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Emergencypaused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "collector",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "feeType",
				"type": "string"
			}
		],
		"name": "FeeCollected",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "cancelledOrderId",
				"type": "uint256"
			}
		],
		"name": "GroupOrdersCancelled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			}
		],
		"name": "OrderActivated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountReturned",
				"type": "uint256"
			}
		],
		"name": "OrderCancelled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "enum LimitOrderEscrow.OrderType",
				"name": "orderType",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "tokenIn",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "tokenOut",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountIn",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "minAmountOut",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "limitPrice",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum LimitOrderEscrow.PartialFillMode",
				"name": "fillMode",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "maxSplits",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "filledAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "fillCount",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "enum LimitOrderEscrow.OrderStatus",
				"name": "status",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "fundsDeposited",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum LimitOrderEscrow.GroupType",
				"name": "groupRole",
				"type": "uint8"
			}
		],
		"name": "OrderCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountReturned",
				"type": "uint256"
			}
		],
		"name": "OrderExpired",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "totalFills",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalAmountIn",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "totalAmountOut",
				"type": "uint256"
			}
		],
		"name": "OrderFullyFilled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "entryOrderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "stopLossOrderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "takeProfitOrderId",
				"type": "uint256"
			}
		],
		"name": "OrderGroupCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "fillNumber",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint8",
				"name": "totalSplits",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountFilled",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amountOut",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "remainingAmount",
				"type": "uint256"
			}
		],
		"name": "OrderPartiallyFilled",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Paused",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address[]",
				"name": "tokens",
				"type": "address[]"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "StableTokensUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "status",
				"type": "bool"
			}
		],
		"name": "TokenWhitelisted",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "unpause",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "Unpaused",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_botCollector",
				"type": "address"
			}
		],
		"name": "updateBotCollector",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_feeCollector",
				"type": "address"
			}
		],
		"name": "updateFeeCollector",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_protocolFee",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_botFee",
				"type": "uint256"
			}
		],
		"name": "updateFeeRates",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_volatileRouterFee",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_stableRouterFee",
				"type": "uint256"
			}
		],
		"name": "updateRouterFees",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "authorizedBots",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "botCollector",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "botFeeRate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "empsealRouter",
		"outputs": [
			{
				"internalType": "contract IEmpsealRouter",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "feeCollector",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "tokenIn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "tokenOut",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "priceThreshold",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "limit",
				"type": "uint256"
			},
			{
				"internalType": "enum LimitOrderEscrow.OrderType",
				"name": "orderType",
				"type": "uint8"
			}
		],
		"name": "getActiveOrdersForPair",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "orderIds",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "getOrder",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "id",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenIn",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenOut",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amountIn",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "minAmountOut",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "limitPrice",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "deadline",
						"type": "uint256"
					},
					{
						"internalType": "enum LimitOrderEscrow.OrderType",
						"name": "orderType",
						"type": "uint8"
					},
					{
						"internalType": "enum LimitOrderEscrow.PartialFillMode",
						"name": "fillMode",
						"type": "uint8"
					},
					{
						"internalType": "uint8",
						"name": "maxSplits",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "filledAmount",
						"type": "uint256"
					},
					{
						"internalType": "uint8",
						"name": "fillCount",
						"type": "uint8"
					},
					{
						"internalType": "enum LimitOrderEscrow.OrderStatus",
						"name": "status",
						"type": "uint8"
					},
					{
						"internalType": "bool",
						"name": "fundsDeposited",
						"type": "bool"
					},
					{
						"internalType": "uint256",
						"name": "groupId",
						"type": "uint256"
					},
					{
						"internalType": "enum LimitOrderEscrow.GroupType",
						"name": "groupRole",
						"type": "uint8"
					}
				],
				"internalType": "struct LimitOrderEscrow.Order",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			}
		],
		"name": "getOrderGroup",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "id",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "entryOrderId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "stopLossOrderId",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "takeProfitOrderId",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "isActive",
						"type": "bool"
					},
					{
						"internalType": "bool",
						"name": "entryFilled",
						"type": "bool"
					},
					{
						"internalType": "address",
						"name": "escrowToken",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "escrowAmount",
						"type": "uint256"
					}
				],
				"internalType": "struct LimitOrderEscrow.OrderGroup",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "orderId",
				"type": "uint256"
			}
		],
		"name": "getOrderProgress",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "filled",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "total",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "fills",
				"type": "uint8"
			},
			{
				"internalType": "uint8",
				"name": "maxFills",
				"type": "uint8"
			},
			{
				"internalType": "uint8",
				"name": "percentComplete",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256[]",
				"name": "orderIds",
				"type": "uint256[]"
			}
		],
		"name": "getOrders",
		"outputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "id",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "user",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenIn",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "tokenOut",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amountIn",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "minAmountOut",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "limitPrice",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "deadline",
						"type": "uint256"
					},
					{
						"internalType": "enum LimitOrderEscrow.OrderType",
						"name": "orderType",
						"type": "uint8"
					},
					{
						"internalType": "enum LimitOrderEscrow.PartialFillMode",
						"name": "fillMode",
						"type": "uint8"
					},
					{
						"internalType": "uint8",
						"name": "maxSplits",
						"type": "uint8"
					},
					{
						"internalType": "uint256",
						"name": "filledAmount",
						"type": "uint256"
					},
					{
						"internalType": "uint8",
						"name": "fillCount",
						"type": "uint8"
					},
					{
						"internalType": "enum LimitOrderEscrow.OrderStatus",
						"name": "status",
						"type": "uint8"
					},
					{
						"internalType": "bool",
						"name": "fundsDeposited",
						"type": "bool"
					},
					{
						"internalType": "uint256",
						"name": "groupId",
						"type": "uint256"
					},
					{
						"internalType": "enum LimitOrderEscrow.GroupType",
						"name": "groupRole",
						"type": "uint8"
					}
				],
				"internalType": "struct LimitOrderEscrow.Order[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "getTokenAccounting",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "contractBalance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "trackedDeposits",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "unaccounted",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserActiveOrders",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getUserGroups",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getWhitelistedTokens",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isStableToken",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextGroupId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "nextOrderId",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "orderGroups",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "entryOrderId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "stopLossOrderId",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "takeProfitOrderId",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "isActive",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "entryFilled",
				"type": "bool"
			},
			{
				"internalType": "address",
				"name": "escrowToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "escrowAmount",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "orders",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "tokenIn",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "tokenOut",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amountIn",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "minAmountOut",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "limitPrice",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "deadline",
				"type": "uint256"
			},
			{
				"internalType": "enum LimitOrderEscrow.OrderType",
				"name": "orderType",
				"type": "uint8"
			},
			{
				"internalType": "enum LimitOrderEscrow.PartialFillMode",
				"name": "fillMode",
				"type": "uint8"
			},
			{
				"internalType": "uint8",
				"name": "maxSplits",
				"type": "uint8"
			},
			{
				"internalType": "uint256",
				"name": "filledAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint8",
				"name": "fillCount",
				"type": "uint8"
			},
			{
				"internalType": "enum LimitOrderEscrow.OrderStatus",
				"name": "status",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "fundsDeposited",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "groupId",
				"type": "uint256"
			},
			{
				"internalType": "enum LimitOrderEscrow.GroupType",
				"name": "groupRole",
				"type": "uint8"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "pairOrderIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "pairOrders",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "protocolFeeRate",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "stableRouterFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "totalDeposited",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userGroups",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userOrders",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "volatileRouterFee",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "whitelistedTokens",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "WNATIVE",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] as const;

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
] as const;
