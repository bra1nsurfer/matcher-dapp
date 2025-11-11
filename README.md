# Matching Dapp

## Demo

<https://bra1nsurfer.github.io/matcher-dapp/>

## Table of Content

- [Matching Dapp](#matching-dapp)
  - [Demo](#demo)
  - [Table of Content](#table-of-content)
  - [Matcher Exchange](#matcher-exchange)
  - [Order Bytes Structure](#order-bytes-structure)
  - [Proof Order V1](#proof-order-v1)
    - [Waves Account Order V1](#waves-account-order-v1)
      - [Signing Order V1 for Waves Account](#signing-order-v1-for-waves-account)
      - [Verify Order V1 for Waves Account](#verify-order-v1-for-waves-account)
    - [EIP-712 (Metamask) Order V1](#eip-712-metamask-order-v1)
      - [Signing Order V1 for EIP-712 (Metamask)](#signing-order-v1-for-eip-712-metamask)
      - [Verify Order for V1 EIP-712 (Metamask)](#verify-order-for-v1-eip-712-metamask)
  - [Proof Order V2](#proof-order-v2)
    - [Waves Account Order V2](#waves-account-order-v2)
      - [Signing Order V2 for Waves Account](#signing-order-v2-for-waves-account)
      - [Verify Order V2 for Waves Account](#verify-order-v2-for-waves-account)
    - [EIP-712 (Metamask) Order V2](#eip-712-metamask-order-v2)
      - [Signing Order V2 for EIP-712 (Metamask)](#signing-order-v2-for-eip-712-metamask)
      - [Verify Order for V2 EIP-712 (Metamask)](#verify-order-for-v2-eip-712-metamask)
  - [User Balance](#user-balance)
  - [Delayed Withdraw](#delayed-withdraw)
    - [User Withdraw Request](#user-withdraw-request)
    - [User Withdraw Unlock](#user-withdraw-unlock)
    - [Cancel Withdraw Request](#cancel-withdraw-request)
  - [Fast Withdraw](#fast-withdraw)
    - [User Invoke (fast withdraw)](#user-invoke-fast-withdraw)
    - [Matcher approval](#matcher-approval)
      - [Withdraw Request Bytes](#withdraw-request-bytes)
  - [Deposit](#deposit)
  - [Prediction Market](#prediction-market)
    - [Prediction Order Bytes](#prediction-order-bytes)

## Matcher Exchange

After matching two orders, matcher should invoke `validateAndExchange()` function to Validator contract

```js
# o1 - Maker
# o2 - Taker
@Callable(i)
func validateAndExchange(
  o1bytes      : ByteVector,
  o1proof      : ByteVector,
  o2bytes      : ByteVector,
  o2proof      : ByteVector,
  matchAmount  : Int,
  matchPrice   : Int,
  makerFeeAsset: String,
  makerFee     : Int,
  takerFeeAsset: String,
  takerFee     : Int
  )
```

## Order Bytes Structure

|  # | Bytes Length | Value Description                                                                               |
|---:|-------------:|-------------------------------------------------------------------------------------------------|
|  1 |            1 | version                                                                                         |
|  2 |            1 | network byte                                                                                    |
|  3 |            1 | sender flag (`0` -> waves public key, `1` -> EIP-712 signature)                                 |
|  4 |     32 or 26 | sender public key OR waves address (32 bytes if Waves signature, 26 bytes if EIP-712 signature) |
|  5 |           32 | matcher public key                                                                              |
|  6 |            1 | amount asset flag                                                                               |
|  7 |      0 or 32 | if amount asset flag is `0` -> 0 bytes (WAVES) else 32 bytes                                    |
|  8 |            1 | price asset flag                                                                                |
|  9 |      0 or 32 | if price asset flag is `0` -> 0 bytes (WAVES) else 32 bytes                                     |
| 10 |            1 | order type (`0` -> spot, `1` -> leverage, `2` -> margin, `3` -> prediction)                     |
| 11 |            1 | order direction `0` -> buying, `1` -> selling                                                   |
| 12 |            8 | amount                                                                                          |
| 13 |            8 | price (fixed decimals 10^8)                                                                     |
| 14 |            8 | nonce (timestamp)                                                                               |
| 15 |            8 | expiration (`0` -> indefinite)                                                                  |
| 16 |            8 | custom flags                                                                                    |

## Proof Order V1

1. Calculate sh256 hash from `orderBytes` -> `sha256(orderBytes)`
1. Convert hash to base58 string -> `sha256(orderBytes).toBase58String()`
1. Sign string as custom message with [`signMessage(data: string | number)`](https://docs.waves.tech/en/building-apps/waves-api-and-sdk/client-libraries/signer#signmessage) ([Signer library](https://github.com/wavesplatform/signer))

### Waves Account Order V1

#### Signing Order V1 for Waves Account

1. `orderIdString = sha256(orderBytes).toBase58String()`
1. Add prefix bytes (`[255, 255, 255, 1]`)
1. Bytes to sign = `[255, 255, 255, 1, ...stringToBytes(orderIdString)]`

#### Verify Order V1 for Waves Account

1. We can recover sender public key from `orderBytes` (sender flag (byte #3) must be `0`)
1. [Verify waves signature](<https://docs.waves.tech/en/blockchain/waves-protocol/cryptographic-practical-details>)

```js
const crypto = require('@waves/ts-lib-crypto');

return crypto.verifySignature(userPublicKey, [255, 255, 255, 1, ...crypto.stringToBytes(orderIdString)], signature);
```

### EIP-712 (Metamask) Order V1

#### Signing Order V1 for EIP-712 (Metamask)

<https://eips.ethereum.org/EIPS/eip-712>

<https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_signtypeddata_v4/>

ProviderMetamask uses EIP-712 and `signTypedData` version 4 function of MetaMask API. The following structure is passed as an argument:

`orderIdString = sha256(orderBytes).toBase58String()`

```js
{
    "types": {
        "EIP712Domain": [
            {
                "name": "chainId",
                "type": "uint256"
            }
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
```

#### Verify Order for V1 EIP-712 (Metamask)

1. Extract waves address from `orderBytes` (sender flag (byte #3) must be `1`)
1. Using signature and message we can recover user eth-address
1. Convert eth-address to waves address
1. Compare resulting addresses

<https://metamask.github.io/eth-sig-util/latest/functions/recoverTypedSignature.html>

<https://docs.waves.tech/en/keep-in-touch/metamask>

```js
const { recoverTypedSignature } = require('@metamask/eth-sig-util');
const { ethAddress2waves } = require("@waves/node-api-js");

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

const recoveredWavesAddress = ethAddress2waves(recoveredEthAddress);

return (userAddress == recoveredWavesAddress);
```

## Proof Order V2

1. Set version to `2` in `orderBytes`
1. Use [Signer](https://github.com/wavesplatform/signer#readme) `signTypedData(data: OrderTypedData): Promise<string>;` function

Order Typed Data for Signer:

```ts
type OrderTypedData = [
    {
        key: "version",
        type: "integer",
        value: number, // Must be 2
    },
    {
        key: "network",
        type: "string",
        value: string, // "T" for testnet, "W" for mainnet
    },
    {
        key: "sender",
        type: "string",
        value: string, // Base58 string. PublicKey for Waves account, Waves Address for EIP-712 (Metamask)
    },
    {
        key: "matcherPublicKey",
        type: "string",
        value: string, // Base58 string
    },
    {
        key: "amountAssetId",
        type: "string",
        value: "WAVES" | string, // Base58 string
    },
    {
        key: "priceAssetId",
        type: "string",
        value: "WAVES" | string, // Base58 string
    },
    {
        key: "orderType",
        type: "integer",
        value: number, // 0 -> spot, 1 -> leverage, 2 -> margin, 3 -> prediction
    },
    {
        key: "orderDirection",
        type: "string",
        value: "buy" | "sell",
    },
    {
        key: "amount",
        type: "integer",
        value: number,
    },
    {
        key: "price",
        type: "integer",
        value: number,
    },
    {
        key: "timestamp",
        type: "integer",
        value: number,
    },
    {
        key: "expiration",
        type: "integer",
        value: number,
    },
    {
        key: "flags",
        type: "integer",
        value: number,
    },
]
```

### Waves Account Order V2

#### Signing Order V2 for Waves Account

Data can be serialized with `@waves/waves-transaction` [library](https://github.com/wavesplatform/waves-transactions/blob/df16cb37c6e5167aa2918bf067096168843cab73/src/requests/custom-data.ts#L63)

```ts
import { serializeCustomData } from "@waves/waves-transactions";

const serializedBytes = serializeCustomData(data: OrderTypedData);
```

1. Use DataTX serialization [Scheme](https://docs.waves.tech/en/blockchain/binary-format/transaction-binary-format/data-transaction-binary-format#version-1) for Typed Data
1. Add prefix bytes (`[255, 255, 255, 2]`)
1. Bytes to sign = `[255, 255, 255, 2, ...serializedBytes]`

|    # | Field                         | Field type | Field size in bytes | Value                      | Comment                                                                          |
|-----:|:------------------------------|------------|---------------------|----------------------------|----------------------------------------------------------------------------------|
|    0 | length of data array          | Short      | 2                   | `13`                       | 13 fields in TypedOrder                                                          |
|  1.1 | version key length            | Short      | 2                   | `7`                        |                                                                                  |
|  1.2 | version key value             | String     | 7                   | `"version"`                |                                                                                  |
|  1.3 | version value type            | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
|  1.4 | version value                 | Long       | 8                   | `2`                        | `2` for order version 2<br> 8 bytes for Long type                                |
|  2.1 | network key length            | Short      | 2                   | `7`                        |                                                                                  |
|  2.2 | network key value             | String     | 7                   | `"network"`                |                                                                                  |
|  2.3 | network value type            | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  2.4 | network value length          | Short      | 2                   | `1`                        |                                                                                  |
|  2.5 | network value                 | String     | 1                   | `"T"`or `"W"`              | `T` for testnet<br> `W` for mainnet                                              |
|  3.1 | sender key length             | Short      | 2                   | `6`                        |                                                                                  |
|  3.2 | sender key value              | String     | 6                   | `"sender"`                 |                                                                                  |
|  3.3 | sender value type             | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  3.4 | sender value length           | Short      | 2                   | T                          | Length of Base58 encoded string of Sender                                        |
|  3.5 | sender value                  | String     | T                   | `base58(sender)`           | Base58 string. PublicKey for Waves account, Waves Address for EIP-712 (Metamask) |
|  4.1 | matcherPublicKey key length   | Short      | 2                   | `16`                       |                                                                                  |
|  4.2 | matcherPublicKey key value    | String     | 16                  | `"matcherPublicKey"`       |                                                                                  |
|  4.3 | matcherPublicKey value type   | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  4.4 | matcherPublicKey value length | Short      | 2                   | T                          | Length of Base58 encoded string of Matcher Public Key                            |
|  4.5 | matcherPublicKey value        | String     | 1                   | `base58(matcherPublicKey)` | Base58 encoded string of Matcher Public Key                                      |
|  5.1 | amountAssetId key length      | Short      | 2                   | `13`                       |                                                                                  |
|  5.2 | amountAssetId key value       | String     | 13                  | `"amountAssetId"`          |                                                                                  |
|  5.3 | amountAssetId value type      | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  5.4 | amountAssetId value length    | Short      | 2                   | T                          | Length of Base58 encoded assetId string                                          |
|  5.5 | amountAssetId value           | String     | 1                   | `base58(amountAssetId)`    | Base58 encoded assetId string                                                    |
|  6.1 | priceAssetId key length       | Short      | 2                   | `13`                       |                                                                                  |
|  6.2 | priceAssetId key value        | String     | 13                  | `"amountAssetId"`          |                                                                                  |
|  6.3 | priceAssetId value type       | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  6.4 | priceAssetId value length     | Short      | 2                   | T                          | Length of Base58 encoded assetId string                                          |
|  6.5 | priceAssetId value            | String     | 1                   | `base58(amountAssetId)`    | Base58 encoded assetId string                                                    |
|  7.1 | orderType key length          | Short      | 2                   | `9`                        |                                                                                  |
|  7.2 | orderType key value           | String     | 9                   | `"orderType"`              |                                                                                  |
|  7.3 | orderType value type          | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
|  7.4 | orderType value               | Long       | 8                   | `0` or `1` or `2`          | `0` - spot<br> `1` - leverage<br> `2` - margin<br> `3` - prediction              |
|  8.1 | orderDirection key length     | Short      | 2                   | `14`                       |                                                                                  |
|  8.2 | orderDirection key value      | String     | 14                  | `"orderDirection"`         |                                                                                  |
|  8.3 | orderDirection value type     | Byte       | 1                   | `3`                        | `3` for String type                                                              |
|  8.4 | orderDirection value length   | Short      | 2                   | T                          | `3` for `"buy"`<br> `4` for `"sell"`                                             |
|  8.5 | orderDirection value          | String     | T                   | `"buy"` or `"sell"`        |                                                                                  |
|  9.1 | amount key length             | Short      | 2                   | `6`                        |                                                                                  |
|  9.2 | amount key value              | String     | 6                   | `"amount"`                 |                                                                                  |
|  9.3 | amount value type             | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
|  9.4 | amount value                  | Long       | 8                   | `<amount>`                 |                                                                                  |
| 10.1 | price key length              | Short      | 2                   | `5`                        |                                                                                  |
| 10.2 | price key value               | String     | 5                   | `"price"`                  |                                                                                  |
| 10.3 | price value type              | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
| 10.4 | price value                   | Long       | 8                   | `<price>`                  |                                                                                  |
| 11.1 | timestamp key length          | Short      | 2                   | `9`                        |                                                                                  |
| 11.2 | timestamp key value           | String     | 9                   | `"timestamp"`              |                                                                                  |
| 11.3 | timestamp value type          | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
| 11.4 | timestamp value               | Long       | 8                   | `<timestamp>`              |                                                                                  |
| 12.1 | expiration key length         | Short      | 2                   | `10`                       |                                                                                  |
| 12.2 | expiration key value          | String     | 10                  | `"expiration"`             |                                                                                  |
| 12.3 | expiration value type         | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
| 12.4 | expiration value              | Long       | 8                   | `<expiration>`             |                                                                                  |
| 13.1 | flags key length              | Short      | 2                   | `5`                        |                                                                                  |
| 13.2 | flags key value               | String     | 5                   | `"flags"`                  |                                                                                  |
| 13.3 | flags value type              | Byte       | 1                   | `0`                        | `0` for Long type                                                                |
| 13.4 | flags value                   | Long       | 8                   | `<flags>`                  |                                                                                  |

#### Verify Order V2 for Waves Account

1. We can recover sender public key from `orderBytes` (sender flag (byte #3) must be `0`)
1. Construct typed data serialized bytes
1. [Verify waves signature](<https://docs.waves.tech/en/blockchain/waves-protocol/cryptographic-practical-details>)

```js
const crypto = require('@waves/ts-lib-crypto');

const serializedBytes = serializeCustomData(data: OrderTypedData);
return crypto.verifySignature(userPublicKey, ...serializedBytes, signature);
```

### EIP-712 (Metamask) Order V2

#### Signing Order V2 for EIP-712 (Metamask)

<https://eips.ethereum.org/EIPS/eip-712>

<https://docs.metamask.io/wallet/reference/json-rpc-methods/eth_signtypeddata_v4/>

ProviderMetamask uses EIP-712 and `signTypedData` version 4 function of MetaMask API. The following structure is passed as an argument:

```ts
type EipOrderTypedData = {
    "types": {
        "EIP712Domain": [
            {
                "name": "chainId",
                "type": "uint256"
            }
        ],
        "TypedData": [
            {
                "name": "version",
                "type": "int64"
            },
            {
                "name": "network",
                "type": "string"
            },
            {
                "name": "sender",
                "type": "string"
            },
            {
                "name": "matcherPublicKey",
                "type": "string"
            },
            {
                "name": "amountAssetId",
                "type": "string"
            },
            {
                "name": "priceAssetId",
                "type": "string"
            },
            {
                "name": "orderType",
                "type": "int64"
            },
            {
                "name": "orderDirection",
                "type": "string"
            },
            {
                "name": "amount",
                "type": "int64"
            },
            {
                "name": "price",
                "type": "int64"
            },
            {
                "name": "timestamp",
                "type": "int64"
            },
            {
                "name": "expiration",
                "type": "int64"
            },
            {
                "name": "flags",
                "type": "int64"
            }
        ]
    },
    "domain": {
        "chainId": 84 // 'T' = 84 Testnet; 'W' = 87 for Mainnet
    },
    "primaryType": "TypedData",
    "message": {
        "version"         : number,             // Must be 2
        "network"         : string,             // "T" for testnet, "W" for mainnet
        "sender"          : string,             // Base58 Waves Address for EIP-712 (Metamask)
        "matcherPublicKey": string,             // Base58 string
        "amountAssetId"   : "WAVES" | string,   // Base58 string
        "priceAssetId"    : "WAVES" | string,   // Base58 string
        "orderType"       : number,             // 0 -> spot, 1 -> leverage, 2 -> margin, 3 -> prediction
        "orderDirection"  : "buy" | "sell",
        "amount"          : number,
        "price"           : number,
        "timestamp"       : number,
        "expiration"      : number,
        "flags"           : number
    }
}
```

#### Verify Order for V2 EIP-712 (Metamask)

1. Extract waves address from `orderBytes` (sender flag (byte #3) must be `1`)
1. Using signature and message we can recover user eth-address
1. Convert eth-address to waves address
1. Compare resulting addresses

<https://metamask.github.io/eth-sig-util/latest/functions/recoverTypedSignature.html>

<https://docs.waves.tech/en/keep-in-touch/metamask>

```js
const { recoverTypedSignature } = require('@metamask/eth-sig-util');
const { ethAddress2waves } = require("@waves/node-api-js");

const msg: eipOrderTypedData =  {
   ...
};

const recoveredEthAddress = recoverTypedSignature({
   data: msg,
   signature: signature,
   version: 'V4'
});

const recoveredWavesAddress = ethAddress2waves(recoveredEthAddress);

return (userAddress == recoveredWavesAddress);
```

## User Balance

1. Get Treasury address from Factory state
    - key: `%s__treasuryAddress`
1. User balance is stored in the Treasury state

Key format:

- `%s%s%s__balance__{userAddress}__{asset}`

Possible `asset` values:

- `{assetId}` | `WAVES` | `{EventId}-yes` | `{EventId}-no`

Value type is `Integer`.

User Balance Example:

```txt
%s%s%s__balance__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB__25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT
%s%s%s__balance__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB__WAVES
%s%s%s__balance__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB__11111111111111111111111111111112-yes
%s%s%s__balance__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB__11111111111111111111111111111112-no
```

## Delayed Withdraw

Withdraw have two steps

1. Withdraw request
1. Unlock withdraw request

Delay length (in blocks) is stored in Factory state or zero (0)
    - key: `%s__withdrawDelay`

### User Withdraw Request

1. Get Treasury address from Factory state
    - key: `%s__treasuryAddress`
1. Construct `userWithdraw` Invoke TX to Treasury

```js
@Callable(i) 
func userWithdraw(assetId: String, amount: Int)
```

Result: Created withdraw request, assets removed from user balance

Result in Treasury state:

- key: `%s%s%s__withdraw__{user}__{txId}`
- value: `%s%d%d__{assetId}__{amount}__{unlockHeight}`

### User Withdraw Unlock

1. Get Treasury address from Factory
    - key: `%s__treasuryAddress`
1. Get withdraw request data
    - key: `%s%s%s__withdraw__{user}__{txId}`
1. Get `txId` from key
1. Parse values:
    - value: `%s%d%d__{assetId}__{amount}__{unlockHeight}`
1. Compare `{unlockHeight}` with current `height`
1. Construct `userUnlockWithdraw` or `userUnlockWithdrawFor` Invoke TX to Treasury

```js
@Callable(i) 
func userUnlockWithdraw(txId: String)
```

```js
@Callable(i) 
func userUnlockWithdrawFor(userAddress: String, txId: String)
```

Result: Assets is transferred to user address

### Cancel Withdraw Request

1. Get Treasury address from Factory
    - key: `%s__treasuryAddress`
1. Get withdraw request data
    - key: `%s%s%s__withdraw__{user}__{txId}`
1. Get `txId` from key
1. Construct `cancelWithdraw` or `matcherCancelWithdraw` Invoke TX to Treasury

```js
@Callable(i)
func cancelWithdraw(txId: String)
```

or

```js
@Callable(i)
func matcherCancelWithdraw(user: String, txId: String)
```

Result: Withdraw request is removed, assets is returned to user balance

## Fast Withdraw

Withdraw in one step can be performed with Matcher approval

### User Invoke (fast withdraw)

1. Get Treasury address from Factory
    - key: `%s__treasuryAddress`
1. Get last fast withdraw invoke TXID from Treasury state
    - key: `%s%s__lastFastWithdrawTx__{userAddress}`
1. Send new withdraw data and last fast withdraw TXID to Matcher for approval
    - `Last TXID` or empty string (first withdraw)
    - `User address`
    - `Asset ID` or `"WAVES"`
    - `Amount`
1. Get approval Signature from Matcher
1. Construct `fastWithdraw` Invoke TX to Treasury

```js
@Callable(i)
func fastWithdraw(assetId: String, amount: Int, matcherSignature: String)
```

Result: Assets is transferred to user address

### Matcher approval

#### Withdraw Request Bytes

| # | Bytes Length | Value Description                                             |
|--:|-------------:|---------------------------------------------------------------|
| 1 |            4 | prefix (always `[255, 255, 255, 1]`)                          |
| 2 |      0 or 32 | last withdraw transaction id (0 bytes for the first withdraw) |
| 3 |           26 | user address                                                  |
| 4 |            1 | asset flag (value: `0` or `1`)                                |
| 5 |      0 or 32 | if asset flag is `0` -> 0 bytes (WAVES) else 32 bytes         |
| 6 |            8 | amount                                                        |

1. Matcher sign withdraw request
1. Matcher return signature as approval

## Deposit

1. Get Treasury address from Factory
    - key: `%s__treasuryAddress`
1. Get allowed assets list from Treasury state
    - key: `%s__allowedAssets`
1. Parse allowed assets list:
    - value: `{asset1}__WAVES__{asset2}__{asset3}`
1. Construct `deposit` or `depositFor` Invoke TX to Treasury
1. Include up to 10 payments
1. Send Invoke TX to Treasury

```js
@Callable(i)
func deposit()
```

or

```js
@Callable(i)
func depositFor(userAddress: String)
```

Result: Assets is transferred to Treasury, user balance is updated

## Prediction Market

### Prediction Order Bytes

Prediction order bytes structure follows the same structure as [ordinary order](#order-bytes-structure).

1. Order type -> `3`
1. Event Id is 32 bytes
1. Event Id is written into Amount asset Id field
1. Prediction direction is written into Flags last byte
    - `YES` -> `[xx, xx, xx, xx, xx, xx, xx, 0x00]`
    - `NO` -> `[xx, xx, xx, xx, xx, xx, xx, 0x01]`
