export const TASK_MANAGER_ABI = [
  { type: "function", name: "getTasksCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "tasks", stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { type: "address", name: "creator" }, { type: "string", name: "url" }, { type: "uint8", name: "actionMask" },
      { type: "uint96", name: "rewardPerFollow" }, { type: "uint96", name: "rewardPerLike" }, { type: "uint96", name: "rewardPerRecast" },
      { type: "uint32", name: "quotaFollow" }, { type: "uint32", name: "quotaLike" }, { type: "uint32", name: "quotaRecast" },
      { type: "uint32", name: "spentFollow" }, { type: "uint32", name: "spentLike" }, { type: "uint32", name: "spentRecast" },
      { type: "address", name: "token" }, { type: "uint256", name: "budget" }, { type: "uint64", name: "endTime" }, { type: "bool", name: "paused" }
    ]
  },
  {
    type: "function", name: "createTask", stateMutability: "nonpayable",
    inputs: [
      { type: "string", name: "url" }, { type: "uint8", name: "actionMask" },
      { type: "uint96", name: "rewardPerFollow" }, { type: "uint96", name: "rewardPerLike" }, { type: "uint96", name: "rewardPerRecast" },
      { type: "uint32", name: "quotaFollow" }, { type: "uint32", name: "quotaLike" }, { type: "uint32", name: "quotaRecast" },
      { type: "address", name: "token" }, { type: "uint64", name: "endTime" }, { type: "uint256", name: "initialBudget" }
    ],
    outputs: [{ type: "uint256", name: "taskId" }]
  },
  {
    type: "function", name: "claimWithSig", stateMutability: "nonpayable",
    inputs: [
      {
        type: "tuple", name: "v", components: [
          { type: "uint256", name: "taskId" }, { type: "address", name: "user" }, { type: "uint8", name: "action" },
          { type: "uint96", name: "amount" }, { type: "uint256", name: "nonce" }, { type: "uint256", name: "deadline" }
        ]
      },
      { type: "bytes", name: "sig" }
    ],
    outputs: []
  },
  // 🔽 yönetim fonksiyonları (creator)
  {
    type: "function", name: "pauseTask", stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "taskId" }, { type: "bool", name: "p" }], outputs: []
  },
  {
    type: "function", name: "fund", stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "taskId" }, { type: "uint256", name: "amount" }], outputs: []
  },
  {
    type: "function", name: "refundRemainder", stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "taskId" }, { type: "address", name: "to" }, { type: "uint256", name: "amount" }],
    outputs: []
  },
] as const;
