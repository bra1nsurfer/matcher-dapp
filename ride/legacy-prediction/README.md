# Legacy prediction

Testnet dApp: `3Mt472nizh8hsEWBzuiGJSmtbHUinHEA6Kh`

## Config

Keys:

|                          Key |    Type | Example                                                                   | Value Description                                                                                         |
|-----------------------------:|--------:|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
|   `%s__predictionPriceAsset` |  String | `"25FEqEjRkqK6yCkiT7Lz6SAYz7gUFCtxfCChnrVFD5AT"`                          | Base price asset id                                                                                       |
| `%s__eventCreationFeeAmount` | Integer | `1000000`                                                                 | Event creation fee (example: 1.0 USDT)                                                                    |
| `%s__groupCreationFeeAmount` | Integer | `500000`                                                                  | Group creation fee (example: 0.5 USDT)                                                                    |
|            `%s__mintFeeRate` | Integer | `1000000`                                                                 | Yes/No token mint fee rate (example: 1% or 0.01 * 10^8. If user mint for 2.0 USDT fee is equal 0.02 USDT) |
|         `%s__eventAdminList` |  String | `N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG__3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB` | Event admin list. Admin can set event status, edit event/group info                                       |

## Group keys

| Key                                     |   Type | Value Description       |
|:----------------------------------------|-------:|-------------------------|
| `%s%s%d__group__name__{groupId}`        | String | Group name              |
| `%s%s%d__group__description__{groupId}` | String | Group description       |
| `%s%s%d__group__imgSrc__{groupId}`      | String | Group image source      |
| `%s%s%d__group__creator__{groupId}`     | String | Group creator           |
| `%s%s%d__group__source__{groupId}`      | String | Group settlement source |
| `%s%s%d__group__events__{groupId}`      | String | Group events list       |

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
    "value": "1__3"
  }
]
```

## Event Keys

| Key                                      |    Type | Value Description         |
|:-----------------------------------------|--------:|---------------------------|
| `%s%s%d__event__name__{eventId}`         |  String | Event name                |
| `%s%s%d__event__groupId__{eventId}`      |  String | Event group Id            |
| `%s%s%d__event__description__{eventId}`  |  String | Event description         |
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
```

Example:

```json
[
  {
    "key": "%s%s%d__event__description__2",
    "type": "string",
    "value": "Event 2 description"
  },
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

## Functions

### New Group

```js
@Callable(i)
func newGroup(name: String, description: String, imgSrc: String, source: String)

if (groupCreationFeeAmount > 0) then include payment
```

- Can be called by anyone
- All arguments is required
- If `%s__groupCreationFeeAmount` is NOT zero, must include payment with fee
- Fee assetId is `%s__predictionPriceAsset`

### New Event

```js
@Callable(i)
func newEvent(groupId: String, name: String, description: String, endDatetime: Int)

txFee must include 2.0 Waves for YES/NO token issue

if (eventCreationFeeAmount > 0) then include payment
```

- Can be called by anyone
- All arguments is required
- TX Fee must include 2.0 WAVES for YES/NO Token Issue
- If `%s__eventCreationFeeAmount` is NOT zero, must include payment with fee
- Fee assetId is `%s__predictionPriceAsset`

### Mint Tokens

```js
@Callable(i)
func mintTokens(eventId: String)

Payment 1: Prices asset amount
Payment 2: Mint fee in price asset
```

- Only if event status `E_OPEN` (`0`)
- Buying rate is `1.0 Price token == (1 YES + 1 NO)`
- YES and NO decimals is 0
- Amount is rounded DOWN
- Mint fee is equal `Price amount * mint fee rate`

Example 1:

- `%s__mintFeeRate` == `1000000` (1% or 0.01 * 10^8)
- Give Payment1 == 2.0 USDT
- Give Payment2 == 0.02 USDT
- Get: 2 YES token
- Get: 2 NO token

Example 2:

- `%s__mintFeeRate` == `1000000` (1% or 0.01 * 10^8)
- Give Payment1 == 2.0 USDT
- Get: Error

Example 3:

- `%s__mintFeeRate` == `1000000` (1% or 0.01 * 10^8)
- Give Payment1 == 2.0 USDT
- Give Payment2 == 0.01 USDT
- Get: Error

Example 4:

- `%s__mintFeeRate` == `1000000` (1% or 0.01 * 10^8)
- Give Payment1 == 2.99 USDT
- Give Payment2 == 0.0299 USDT
- Get: 2 YES token
- Get: 2 NO token

### Merge Tokens

```js
@Callable(i)
func mergeTokens(eventId: String)

Payment 1: YES/NO token
Payment 2: NO/YES token
```

- Can be called by anyone
- YES and NO token amount should be equal
- Merge rate `(1 YES + 1 NO) == 1.0 Price token`

Example 1:

- Give Payment 1: 3 YES token
- Give Payment 2: 3 NO token
- Get: 3.0 USDT

Example 2:

- Give Payment 1: 3 NO token
- Give Payment 2: 3 YES token
- Get: 3.0 USDT

Example 3:

- Give Payment 1: 3 NO token
- Give Payment 2: 2 YES token
- Get: Error

Example 4:

- Give Payment 1: 3 YES token
- Get: Error

### Withdraw Tokens

```js
@Callable(i)
func withdrawTokens(eventId: String)

Payment 1: YES/NO token
```

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

- `%s%s%d__event__status__{eventId}`: `1` (`E_CLOSED_YES`)
- Give: 4 NO token
- Get: Error

Example 4:

- `%s%s%d__event__status__{eventId}`: `0` (`E_OPEN`)
- Give: 4 NO token
- Get: Error

Example 5:

- `%s%s%d__event__status__{eventId}`: `3` (`E_STOPPED`)
- Give: 4 YES token
- Get: Error

### Set Event Status

```js
@Callable(i)
func setEventStatus(eventId: String, status: Int)
```

```txt
# EVENT STATUS
E_NOT_FOUND  = -1
E_OPEN       = 0
E_CLOSED_YES = 1
E_CLOSED_NO  = 2
E_STOPPED    = 3
E_EXPIRED    = 4
```

- Can be called only by event admin
