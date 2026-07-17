# Matching Dapp

## Demo

<https://bra1nsurfer.github.io/matcher-dapp/>

## Table of Content

- [Matching Dapp](#matching-dapp)
  - [Demo](#demo)
  - [Table of Content](#table-of-content)
  - [Matcher Exchange](#matcher-exchange)
    - [Spot/Leverage/Margin/Prediction Validator](#spotleveragemarginprediction-validator)
    - [Exchange invoke tx](#exchange-invoke-tx)
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
  - [Treasury contract](#treasury-contract)
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
    - [Event Id](#event-id)
    - [Prediction market contract config](#prediction-market-contract-config)
    - [Group keys](#group-keys)
    - [Event Keys](#event-keys)
    - [Functions](#functions)
      - [New Group with Events](#new-group-with-events)
      - [Add new Events to existing Group](#add-new-events-to-existing-group)
      - [Mint Tokens from Event](#mint-tokens-from-event)
      - [Merge Tokens from Event](#merge-tokens-from-event)
      - [Withdraw Tokens from Event](#withdraw-tokens-from-event)
    - [Set Event Status](#set-event-status)
      - [Edit group info](#edit-group-info)
      - [Edit event info](#edit-event-info)

## Matcher Exchange

### Spot/Leverage/Margin/Prediction Validator

Spot/Leverage/Margin Validator address is stored in the Factory state.

- key: `%s__validatorAddress`

### Exchange invoke tx

After matching two orders, matcher should invoke `validateAndExchange()` function to Validator contract

1. Get Validator address from Factory state
    - key: `%s__validatorAddress`
1. Matcher prepares exchange InvokeTx
1. Matcher broadcast exchange InvokeTx

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
|  7 |      0 or 32 | if amount asset flag is `0` then 0 bytes (WAVES) else 32 bytes                                  |
|  8 |            1 | price asset flag                                                                                |
|  9 |      0 or 32 | if price asset flag is `0` then 0 bytes (WAVES) else 32 bytes                                   |
| 10 |            1 | order type (`0` -> spot, `1` -> leverage, `2` -> margin, `3` -> prediction)                     |
| 11 |            1 | order direction (`0` -> buying, `1` -> selling)                                                 |
| 12 |            8 | amount                                                                                          |
| 13 |            8 | price                                                                                           |
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

## Treasury contract

### User Balance

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

### Delayed Withdraw

Withdraw have two steps

1. Withdraw request
1. Unlock withdraw request

Delay length (in blocks) is stored in Factory state or zero (0)
    - key: `%s__withdrawDelay`

#### User Withdraw Request

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

#### User Withdraw Unlock

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

#### Cancel Withdraw Request

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

### Fast Withdraw

Withdraw in one step can be performed with Matcher approval

#### User Invoke (fast withdraw)

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

#### Matcher approval

##### Withdraw Request Bytes

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

### Deposit

1. Get allowed assets list from Factory state
    - key: `%s__allowedAssets`
1. Parse allowed assets list:
    - value: `{asset1}__WAVES__{asset2}__{asset3}`
1. Get Treasury address from Factory state
    - key: `%s__treasuryAddress`
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

### Event Id

`EventID` represented as 32 bytes, like asset id

Last 8 byte contains eventId

Example

```text
EventId 1                   -> Base58'11111111111111111111111111111112'
EventId 6                   -> Base58'11111111111111111111111111111117'
EventId 1000001             -> Base58'1111111111111111111111111111168GQ'
EventId 9223372036854775807 -> Base58'111111111111111111111111NQm6nKp8qFC'
```

Base58 conversion:

```js
const eventId: number;
const dataView = new DataView(new ArrayBuffer(32), 0);
// EventId is long max in Ride (8 bytes)
dataView.setBigInt64(24, BigInt(eventId));
const fullEventIdBytes = new Uint8Array(dataView.buffer);
const fullEventId = binary_to_base58(fullEventIdBytes);
```

### Prediction market contract config

Keys:

|                          Key |    Type | Example                                                                     | Value Description                                                                                         |
|-----------------------------:|--------:|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
|            `%s__mintFeeRate` | Integer | `1000000`                                                                   | Yes/No token mint fee rate (example: 1% or 0.01 * 10^8. If user mint for 2.0 USDT fee is equal 0.02 USDT) |
| `%s__groupCreationFeeAmount` | Integer | `500000`                                                                    | Group creation fee (example: 0.5 USDT)                                                                    |
| `%s__eventCreationFeeAmount` | Integer | `1000000`                                                                   | Event creation fee (example: 1.0 USDT)                                                                    |
|         `%s__eventAdminList` |  String | `"N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB"` | Event admin list. Admin can set event status, edit event/group info                                       |
|   `%s__predictionPriceAsset` |  String | `"25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"`                            | Base price asset id                                                                                       |

### Group keys

| Key                                       |    Type | Value Description           |
|:------------------------------------------|--------:|-----------------------------|
| `%s%s%d__group__name__{groupId}`          |  String | Group name                  |
| `%s%s%d__group__description__{groupId}`   |  String | Group description           |
| `%s%s%d__group__category__{groupId}`      |  String | Group category list         |
| `%s%s%d__group__imgSrc__{groupId}`        |  String | Group image source          |
| `%s%s%d__group__creator__{groupId}`       |  String | Group creator               |
| `%s%s%d__group__source__{groupId}`        |  String | Group settlement source     |
| `%s%s%d__group__events__{groupId}`        |  String | Group events list           |
| `%s%s%d__group__rejectedCount__{groupId}` | Integer | Group rejected events count |

Example:

```json
[
  {
    "key": "%s%s%d__group__name__1",
    "type": "string",
    "value": "Group 1"
  },
  {
    "key": "%s%s%d__group__description__1",
    "type": "string",
    "value": "Group description 1"
  },
  {
    "key": "%s%s%d__group__imgSrc__1",
    "type": "string",
    "value": "https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp"
  },
  {
    "key": "%s%s%d__group__creator__1",
    "type": "string",
    "value": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG"
  },
  {
    "key": "%s%s%d__group__source__1",
    "type": "string",
    "value": "https://google.com"
  },
  {
    "key": "%s%s%d__group__events__1",
    "type": "string",
    "value": "1__3__5"
  },
  {
      "key": "%s%s%d__group__category__1",
      "type": "string",
      "value": "Category 1__Category 2",
  },
  {
    "key": "%s%s%d__group__rejectedCount__1",
    "type": "integer",
    "value": 1
  },
]
```

### Event Keys

| Key                                      |    Type | Value Description         |
|:-----------------------------------------|--------:|---------------------------|
| `%s%s%d__event__name__{eventId}`         |  String | Event name                |
| `%s%s%d__event__groupId__{eventId}`      |  String | Event group Id            |
| `%s%s%d__event__yesAssetId__{eventId}`   |  String | Event YES token asset id  |
| `%s%s%d__event__noAssetId__{eventId}`    |  String | Event NO token asset id   |
| `%s%s%d__event__creator__{eventId}`      |  String | Event creator             |
| `%s%s%d__event__status__{eventId}`       | Integer | Event status              |
| `%s%s%d__event__endDatetime__{eventId}`  | Integer | Event end timestamp       |
| `%s%s%d__event__tokensMinted__{eventId}` | Integer | Event total tokens minted |

```txt
# EVENT STATUS
E_NOT_FOUND  = -1
E_OPEN       = 0
E_CLOSED_YES = 1
E_CLOSED_NO  = 2
E_STOPPED    = 3
E_EXPIRED    = 4
E_REJECTED   = 5
```

Example:

```json
[
  {
    "key": "%s%s%d__event__endDatetime__2",
    "type": "integer",
    "value": 1767225600000
  },
  {
    "key": "%s%s%d__event__groupId__2",
    "type": "string",
    "value": "2"
  },
  {
    "key": "%s%s%d__event__creator__2",
    "type": "string",
    "value": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB"
  },
  {
    "key": "%s%s%d__event__name__2",
    "type": "string",
    "value": "Event 2"
  },
  {
    "key": "%s%s%d__event__noAssetId__2",
    "type": "string",
    "value": "CsirBazpjKvQZ3xH6FAerZ9DgQfMFoNvv4rVjMASuxg9"
  },
  {
    "key": "%s%s%d__event__status__2",
    "type": "integer",
    "value": 0
  },
  {
    "key": "%s%s%d__event__tokensMinted__2",
    "type": "integer",
    "value": 0
  },
  {
    "key": "%s%s%d__event__yesAssetId__2",
    "type": "string",
    "value": "2a9CQ9nyKJjJiRik82PTLBjg4Fpsiq9cUpEhgborcowi"
  }
]
```

### Functions

#### New Group with Events

```js
@Callable(i)
func newGroupAndEvents(
  gName        : String,
  gDescription : String,
  gImgSrc      : String,
  gSource      : String,
  eNames       : String,
  eEndDatetimes: String
)
```

- Can be called by anyone
- All arguments is required
- `eNames` is a list of Event names separated with `__`
- `eEndDatetimes` is a list of Event end timestamps separated with `__`
- Amount of elements in `eNames` and `eEndDatetimes` lists must be equal
- Up to 10 events can be created with single invoke
- If `%s__groupCreationFeeAmount` is NOT zero, must include payment with fee
- If `%s__eventCreationFeeAmount` is NOT zero, must include payment with fee for every event
- Fee assetId is `%s__predictionPriceAsset`

Example:

```json
{
    "type": 16,
    "fee": 500000,
    "feeAssetId": null,
    "version": 2,
    "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
    "dApp": "3Mt472nizh8hsEWBzuiGJSmtbHUinHEA6Kh",
    "payment": [
        {
            "amount": 10500000,
            "assetId": "25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"
        }
    ],
    "call": {
        "function": "newGroupAndEvents",
        "args": [
            {
                "type": "string",
                "value": "NEW GROUP!"
            },
            {
                "type": "string",
                "value": "Lorem ipsum"
            },
            {
                "type": "string",
                "value": "https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp"
            },
            {
                "type": "string",
                "value": "https://google.com"
            },
            {
                "type": "string",
                "value": "Event 01 from group__Event 02 from group__Event 03 from group__Event 04 from group__Event 05 from group__Event 06 from group__Event 07 from group__Event 08 from group__Event 09 from group__Event 10 from group"
            },
            {
                "type": "string",
                "value": "1772323200000__1772496000000__1773100800000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000"
            }
        ]
    }
}
```

#### Add new Events to existing Group

```js
@Callable(i)
func newEvents(
  groupId      : Int,
  eNames       : String,
  eEndDatetimes: String
)
```

- Can be called by anyone
- All arguments is required
- Up to 10 events can be created with single invoke
- If `%s__eventCreationFeeAmount` is NOT zero, must include payment with fee
- Fee assetId is `%s__predictionPriceAsset`

Example:

```json
{
    "type": 16,
    "fee": 500000,
    "feeAssetId": null,
    "version": 2,
    "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
    "dApp": "3Mt472nizh8hsEWBzuiGJSmtbHUinHEA6Kh",
    "payment": [
        {
            "amount": 10000000,
            "assetId": "25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"
        }
    ],
    "call": {
        "function": "newEvents",
        "args": [
            {
                "type": "integer",
                "value": 4
            },
            {
                "type": "string",
                "value": "Event 01 from group__Event 02 from group__Event 03 from group__Event 04 from group__Event 05 from group__Event 06 from group__Event 07 from group__Event 08 from group__Event 09 from group__Event 10 from group"
            },
            {
                "type": "string",
                "value": "1772323200000__1772496000000__1773100800000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000__1772496000000"
            }
        ]
    }
}
```

#### Mint Tokens from Event

```js
@Callable(i)
func mintTokens(eventId: Int, amount: Int)
```

- `amount` is in event tokens
- Only if event status `E_OPEN` (`0`)
- Buying rate is `1.0 Price token == (1 YES + 1 NO)`
- YES and NO decimals is 0
- Mint fee is equal `Price amount * mint fee rate`
- Mint fee is deducted from Treasury balance

Example 1:

- `%s__mintFeeRate` == `1000000` (1% or 0.01 * 10^8)
- `amount` == 2
- Payment for mint == 2.0 USDT
- Mint fee == 0.02 USDT
- Get: 2 YES token
- Get: 2 NO token

#### Merge Tokens from Event

```js
@Callable(i)
func mergeTokens(eventId: Int, amount: Int)
```

- `amount` is in event tokens
- Can be called by anyone
- YES and NO token amount should be equal
- Merge rate `(1 YES + 1 NO) == 1.0 Price token`

Example 1:

- `amount` == 3
- Get: 3.0 USDT

Example 2:
Tokens amount is not equal

- NO  token balance: 3 NO token
- YES token balance: 2 YES token
- `amount` == 3
- Get: Error

#### Withdraw Tokens from Event

```js
@Callable(i)
func withdrawTokens(eventId: Int, amount: Int)
```

- `amount` is in event tokens
- Can be called by anyone
- Only if event status `E_CLOSED_YES` (`1`) or `E_CLOSED_NO` (`2`)
- Withdraw rate `1 YES/NO token == 1.0 Price token`

Example 1:

- `%s%s%d__event__status__{eventId}`: `1` (`E_CLOSED_YES`)
- Give: 4 YES token
- Get: 4.0 USDT

Example 2:

- `%s%s%d__event__status__{eventId}`: `2` (`E_CLOSED_NO`)
- Give: 4 NO token
- Get: 4.0 USDT

Example 3:
Wrong token direction

- `%s%s%d__event__status__{eventId}`: `1` (`E_CLOSED_YES`)
- Give: 4 NO token
- Get: Error

Example 4:
Event is not closed

- `%s%s%d__event__status__{eventId}`: `0` (`E_OPEN`)
- Give: 4 NO token
- Get: Error

Example 5:
Event is stopped without resolution

- `%s%s%d__event__status__{eventId}`: `3` (`E_STOPPED`)
- Give: 4 YES token
- Get: Error

### Set Event Status

```js
@Callable(i)
func setEventStatus(eventId: Int, status: Int, category: String)
```

```txt
# EVENT STATUS
E_NOT_FOUND  = -1
E_OPEN       = 0
E_CLOSED_YES = 1
E_CLOSED_NO  = 2
E_STOPPED    = 3
E_EXPIRED    = 4
E_REJECTED   = 5
```

- Can be called only by event admin

#### Edit group info

```js
@Callable(i)
func editGroup(
  groupId    : Int,
  name       : String,
  description: String,
  category   : String,
  imgSrc     : String,
  source     : String,
  creator    : String
)
```

- Can be called only by event admin

#### Edit event info

```js
@Callable(i)
func editEvent(
  eventId    : Int,
  groupId    : Int,
  name       : String,
  endDatetime: Int,
  creator    : String
)
```

- Can be called only by event admin
