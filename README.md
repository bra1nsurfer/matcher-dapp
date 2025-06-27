# Matching Dapp

## Demo

<https://localhost>

## Order Structure V1

| #  | Bytes Length | Value Description                                                               |
|----|-------------:|---------------------------------------------------------------------------------|
| 1  |            1 | version (must be -> 1)                                                          |
| 2  |            1 | network byte                                                                    |
| 3  |            1 | sender flag (0 -> waves public key, 1 -> ECDSA signature)                       |
| 4  |     32 or 26 | sender public key OR address (32 bytes if Waves, 26 bytes if ECDSA for address) |
| 5  |           32 | matcher public key                                                              |
| 6  |            1 | amount asset flag                                                               |
| 7  |      0 or 32 | if amount asset flag is 1 -> 0 bytes (WAVES) else 32 bytes                      |
| 8  |            1 | price asset flag                                                                |
| 9  |      0 or 32 | if price asset flag is 1 -> 0 bytes (WAVES) else 32 bytes                       |
| 10 |            1 | order type (0 -> spot, 1 -> leverage, 2 -> margin)                              |
| 11 |            1 | order direction 0 -> buying, 1 -> selling                                       |
| 12 |            8 | amount                                                                          |
| 13 |            8 | price (fixed decimals 10^8)                                                     |
| 14 |            8 | nonce (timestamp)                                                               |
| 15 |            8 | expiration (0 -> indefinite)                                                    |

## Proof

1. Calculate sh256 hash from `orderBytes` -> `sha256(orderBytes)`
1. Convert hash to base58 string -> `sha256(orderBytes).toBase58String()`
1. Sign string as custom message with [`signMessage(data: string | number)`](https://docs.waves.tech/en/building-apps/waves-api-and-sdk/client-libraries/signer#signmessage) ([Signer library](https://github.com/wavesplatform/signer))

### Signing data for Waves Account

1. `orderIdString = sha256(orderBytes).toBase58String()`
1. Add prefix bytes (`[255, 255, 255, 1]`)
1. Bytes to sign = `[255, 255, 255, 1, ...stringToBytes(orderIdString)]`

### Signing data for ECDSA (Metamask)

ProviderMetamask uses EIP-712 and signTypedData version 4 function of MetaMask API. The following structure is passed as an argument:

`orderIdString = sha256(orderBytes).toBase58String()`

```json
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
         "chainId": <87|84|83>
      },
      "primaryType": "Message",
      "message": {
         "text": "<orderIdString>"
      }
   }
]
```
