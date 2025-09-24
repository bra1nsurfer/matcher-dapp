# Matching Dapp

## Demo

<https://bra1nsurfer.github.io/matcher-dapp/>

## Order Structure V1

| #  | Bytes Length | Value Description                                                                               |
|----|-------------:|-------------------------------------------------------------------------------------------------|
| 1  |            1 | version (must be -> 1)                                                                          |
| 2  |            1 | network byte                                                                                    |
| 3  |            1 | sender flag (0 -> waves public key, 1 -> EIP-712 signature)                                     |
| 4  |     32 or 26 | sender public key OR waves address (32 bytes if Waves signature, 26 bytes if EIP-712 signature) |
| 5  |           32 | matcher public key                                                                              |
| 6  |            1 | amount asset flag                                                                               |
| 7  |      0 or 32 | if amount asset flag is 1 -> 0 bytes (WAVES) else 32 bytes                                      |
| 8  |            1 | price asset flag                                                                                |
| 9  |      0 or 32 | if price asset flag is 1 -> 0 bytes (WAVES) else 32 bytes                                       |
| 10 |            1 | order type (0 -> spot, 1 -> leverage, 2 -> margin)                                              |
| 11 |            1 | order direction 0 -> buying, 1 -> selling                                                       |
| 12 |            8 | amount                                                                                          |
| 13 |            8 | price (fixed decimals 10^8)                                                                     |
| 14 |            8 | nonce (timestamp)                                                                               |
| 15 |            8 | expiration (0 -> indefinite)                                                                    |
| 16 |            8 | custom flags                                                                                    |

## Proof Order V1

1. Calculate sh256 hash from `orderBytes` -> `sha256(orderBytes)`
1. Convert hash to base58 string -> `sha256(orderBytes).toBase58String()`
1. Sign string as custom message with [`signMessage(data: string | number)`](https://docs.waves.tech/en/building-apps/waves-api-and-sdk/client-libraries/signer#signmessage) ([Signer library](https://github.com/wavesplatform/signer))

### Waves Account

#### Signing data for Waves Account

1. `orderIdString = sha256(orderBytes).toBase58String()`
1. Add prefix bytes (`[255, 255, 255, 1]`)
1. Bytes to sign = `[255, 255, 255, 1, ...stringToBytes(orderIdString)]`

#### Verify Waves signature

1. We can recover sender public key from `orderBytes` (sender flag (byte #3) must be `0`)
1. (Verify waves signature)(<https://docs.waves.tech/en/blockchain/waves-protocol/cryptographic-practical-details>)

```js
const crypto = require('@waves/ts-lib-crypto');

return crypto.verifySignature(userPublicKey, [255, 255, 255, 1, ...crypto.stringToBytes(orderIdString)], signature);
```

### EIP-712 (Metamask)

#### Signing data with EIP-712 (Metamask)

<https://eips.ethereum.org/EIPS/eip-712>

<https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_signtypeddata_v4/>

ProviderMetamask uses EIP-712 and `signTypedData` version 4 function of MetaMask API. The following structure is passed as an argument:

`orderIdString = sha256(orderBytes).toBase58String()`

```js
[
   {
      "types": {
         "EIP712Domain": [
            {
               "name": "chainId",
               "type" :"uint256"
            },
         ],
         "Message": [
            {
               "name": "text",
               "type": "string"
            }
         ]
      },
      "domain": {
         "chainId": 84 // 'T' = 84 Testnet; 'W' = 87 for Mainnet
      },
      "primaryType": "Message",
      "message": {
         "text": "<orderIdString>"
      }
   }
]
```

#### EIP-712 (Metamask) signature verification

1. Extract waves address from `orderBytes` (sender flag (byte #3) must be `1`)
1. Using signature and message we can recover user eth-address
1. Convert eth-address to waves address
1. Compare resulting addresses

<https://metamask.github.io/eth-sig-util/latest/functions/recoverTypedSignature.html>

<https://docs.waves.tech/en/keep-in-touch/metamask>

```js
const { recoverTypedSignature } = require('@metamask/eth-sig-util');
const { wavesAddress2eth } = require('@waves/node-api-js');

const orderIdString = sha256(orderBytes).toBase58String();

const msg =  {
   "types": {
      "EIP712Domain": [
         {
            "name": "chainId",
            "type" :"uint256"
         },
      ],
      "Message": [
         {
            "name": "text",
            "type": "string"
         }
      ]
   },
   "domain": {
      "chainId": 84 // 'T' = 84 Testnet; 'W' = 87 for Mainnet
   },
   "primaryType": "Message",
   "message": {
      "text": orderIdString
   }
};

const recoveredEthAddress = recoverTypedSignature({
   data: msg,
   signature: signature,
   version: 'V4'
});

const recoveredWavesAddress = wavesAddress2eth(recoveredEthAddress);

return (userAddress == recoveredWavesAddress);
```
