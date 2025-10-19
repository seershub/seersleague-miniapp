// SeersLeague Contract ABI (Refactored Version)
export const SEERSLEAGUE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "matchIds",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "predictionsCount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "freeUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feePaid",
        "type": "uint256"
      }
    ],
    "name": "PredictionsSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "matchId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      }
    ],
    "name": "MatchRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "matchId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "correct",
        "type": "bool"
      }
    ],
    "name": "ResultRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "winners",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "recipientCount",
        "type": "uint256"
      }
    ],
    "name": "PrizesDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "newTreasury",
        "type": "address"
      }
    ],
    "name": "TreasuryUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "matchIds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint8[]",
        "name": "outcomes",
        "type": "uint8[]"
      }
    ],
    "name": "submitPredictions",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "matchIds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "startTimes",
        "type": "uint256[]"
      }
    ],
    "name": "registerMatches",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "matchId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "correct",
        "type": "bool"
      }
    ],
    "name": "recordResult",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "users",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "matchIds",
        "type": "uint256[]"
      },
      {
        "internalType": "bool[]",
        "name": "corrects",
        "type": "bool[]"
      }
    ],
    "name": "batchRecordResults",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "winners",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "distributePrizes",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "getUserStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "correctPredictions",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalPredictions",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "freePredictionsUsed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "currentStreak",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "longestStreak",
            "type": "uint256"
          }
        ],
        "internalType": "struct SeersLeague.UserStats",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "matchId",
        "type": "uint256"
      }
    ],
    "name": "getUserPrediction",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "matchId",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "outcome",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SeersLeague.Prediction",
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
        "name": "matchId",
        "type": "uint256"
      }
    ],
    "name": "getMatch",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "homeScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "awayScore",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isRecorded",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct SeersLeague.Match",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserAccuracy",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getRemainingFreePredictions",
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
        "name": "_treasury",
        "type": "address"
      }
    ],
    "name": "setTreasury",
    "outputs": [],
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
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
