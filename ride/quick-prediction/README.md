# Quick prediction

Testnet dApp: `3N2UNrC7Ae53vhaSbVhWqg9yK6318G9HzzZ`

## Table of Content

- [Quick prediction](#quick-prediction)
  - [Table of Content](#table-of-content)
  - [Config](#config)
  - [Period keys](#period-keys)
  - [User keys](#user-keys)
  - [Index/Timestamp calculations](#indextimestamp-calculations)
    - [Index from Timestamp](#index-from-timestamp)
    - [Timestamp from Index](#timestamp-from-index)
  - [Functions](#functions)
    - [Bet function](#bet-function)
    - [Claim function](#claim-function)
    - [Submit price](#submit-price)
    - [Force stop](#force-stop)
  - [Readonly functions](#readonly-functions)
    - [Current index](#current-index)
    - [Claim preview](#claim-preview)

## Config

Keys:

| Key                  |    Type | Example                  | Value Description                                                  |
|:---------------------|--------:|--------------------------|--------------------------------------------------------------------|
| `%s__genesisTime`    | Integer | `1781685300000`          | Genesis timestamp in Milliseconds                                  |
| `%s__intervalMs`     | Integer | `300000`                 | Period interval in Milliseconds                                    |
| `%s__lastPriceIndex` | Integer | `0`                      | Last period index with set Price                                   |
| `%s__eventAdminList` |  String | `{Address1}__{Address2}` | Only admin can set Period prices                                   |
| `%s__minBetAmount`   | Integer | `12345`                  | Minimum bet amount (default: 1 wavelet)                            |
| `%s__feeRate`        | Integer | `0`                      | Fee rate in dec8 (Example: 1.0 == `1_0000_0000`, 0.5 = `500_0000`) |

## Period keys

| Key                        |    Type | Value Description                                             |
|:---------------------------|--------:|---------------------------------------------------------------|
| `%s%d__price__{index}`     | Integer | Period price                                                  |
| `%s%d__totalUp__{index}`   | Integer | Total amount of Waves voted for UP                            |
| `%s%d__totalDown__{index}` | Integer | Total amount of Waves voted for DOWN                          |
| `%s%d__closedDir__{index}` |  String | Price direction for Closed period (Value: `"UP"` or `"DOWN"`) |
| `%s%d__votedUp__{index}`   | Integer | Amount of unique voted UP users                               |
| `%s%d__votedDown__{index}` | Integer | Amount of unique voted DOWN users                             |

## User keys

| Key                                            |    Type | Value Description                                                           |
|:-----------------------------------------------|--------:|-----------------------------------------------------------------------------|
| `%s%s%d__userUp__{address}__{index}`           | Integer | User amount of Waves voted for UP                                           |
| `%s%s%d__userDown__{address}__{index}`         | Integer | User amount of Waves voted for DOWN                                         |
| `%s%s%d__userClaimHistory__{address}__{index}` | Integer | User claim history. Format: `{userUp}__{userDown}__{UP\|DOWN}__{winAmount}` |

Example

```json
{
    "%s%s%d__userClaimHistory__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB__55": "10000001__20000002__UP__30000003"
}
```

## Index/Timestamp calculations

### Index from Timestamp

`((timestamp - genesisTime) / interval)`

Examples:

```txt
Genesis Time: 1781685300000
Interval: 300000 (5 min)
===
Timestamp: 1781685300001 -> Index: 0
Timestamp: 1781685600001 -> Index: 1
Timestamp: 1781692499999 -> Index: 23
Timestamp: 1781692500000 -> Index: 24
```

### Timestamp from Index

`(index * interval + genesisTime)`

- Calculated timestamp equal _Period Start Time_

Examples:

```txt
Genesis Time: 1781685300000
Interval: 300000 (5 min)
===
Index: 33 -> Timestamp: 1781695200000
Index: 34 -> Timestamp: 1781695500000 
```

## Functions

### Bet function

```js
@Callable(i)
func bet(up: Boolean)
```

- Can be called by anyone
- All arguments is required
- Must be with 1 payment
- Payment must be in Waves
- All previous period must be settled

Example:

```json
{
    "type": 16,
    "version": 2,
    "sender": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB",
    "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
    "dApp": "3N2UNrC7Ae53vhaSbVhWqg9yK6318G9HzzZ",
    "payment": [
        {
            "amount": 100000000,
            "assetId": null
        }
    ],
    "call": {
        "function": "bet",
        "args": [
            {
                "type": "boolean",
                "value": true
            }
        ]
    }
}
```

### Claim function

```js
@Callable(i)
func claim(index: Int)
```

- Can be called by anyone
- All arguments is required
- Index must be less than `%s__lastPriceIndex`
- When price is equal it is treated as `DOWN`

Example:

```json
{
    "type": 16,
    "version": 2,
    "sender": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB",
    "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
    "dApp": "3N2UNrC7Ae53vhaSbVhWqg9yK6318G9HzzZ",
    "payment": [],
    "call": {
        "function": "claim",
        "args": [
            {
                "type": "integer",
                "value": 2
            }
        ]
    }
}
```

### Submit price

```js
@Callable(i)
func submitPrice(index: Int, price: Int)
```

- Can be called only by Admin
- `index` must be less than _current index_ (`((current_timestamp - genesisTime) / interval)`)
- `price` must be positive

### Force stop

```js
@Callable(i)
func forceStop(val: Boolean)
```

- Can be called only by Admin

## Readonly functions

### Current index

```js
@Callable(i)
func currentIndexREADONLY()
```

Response:

- `_2` - current index

```json
{
  "result": {
    "type": "Tuple",
    "value": {
      "_1": {
        "type": "Array",
        "value": []
      },
      "_2": {
        "type": "Int",
        "value": 2059
      }
    }
  },
  ...
```

### Claim preview

```js
@Callable(i)
func claimREADONLY(address: String, indexes: String)
```

- `indexes` - List of indexes, separated by `"__"` up to 100 values

Response:

- `_2` - Array of Tuples with claim preview data `List[(Int, Int, Int, Int, String)]`
  - `_1` - win amount
  - `_2` - fee amount
  - `_3` - user up votes
  - `_4` - user down votes
  - `_5` - period closed direction (`"UP"` or `"DOWN"`)

Example:

```json
{
  "expr": "claimREADONLY(\"3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB\", \"2061__2060\")"
}
```

```json
{
  "result": {
    "type": "Tuple",
    "value": {
      "_1": {
        "type": "Array",
        "value": []
      },
      "_2": {
        "type": "Array",
        "value": [
          {
            "type": "Tuple",
            "value": {
              "_1": {
                "type": "Int",
                "value": 308456789
              },
              "_2": {
                "type": "Int",
                "value": 16234567
              },
              "_3": {
                "type": "Int",
                "value": 0
              },
              "_4": {
                "type": "Int",
                "value": 212345678
              },
              "_5": {
                "type": "String",
                "value": "DOWN"
              }
            }
          },
          {
            "type": "Tuple",
            "value": {
              "_1": {
                "type": "Int",
                "value": 0
              },
              "_2": {
                "type": "Int",
                "value": 0
              },
              "_3": {
                "type": "Int",
                "value": 0
              },
              "_4": {
                "type": "Int",
                "value": 0
              },
              "_5": {
                "type": "String",
                "value": "UP"
              }
            }
          }
        ]
      }
    }
  }
}
```
