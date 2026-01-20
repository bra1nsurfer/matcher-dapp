import { create } from "@waves/node-api-js";
import { expect } from "expect";
import 'dotenv/config'
import Bottleneck from "bottleneck";

type Account = {
    address: string,
    publicKey?: string,
};

type EventConfig = {
    id: number,
    yesToken: string,
    noToken: string,
    mintedAmount: number,
}

type PredictionConfig = {
    address: string,
    lastEventId: number,
    lastGroupId: number,
    groupCreationFee: number,
    eventCreationFee: number,
    mintFeeRate: number,
    feeGetter: string,
    priceAsset: string,
    openEvent: EventConfig,
    closedEvent: EventConfig,
}

type StateData = {
    key: string,
    type: string,
    value: string | number,
}

type StateTransfer = {
    address: string,
    asset: string,
    amount: number,
}

type StateIssue = {
    assetId: string,
    name: string,
    description: string,
    quantity: number,
    decimals: number,
    isReissuable: boolean,
    compiledScript: string | null,
    nonce: number,
}

type StateChanges = {
    data: StateData[],
    transfers: StateTransfer[],
    issues: StateIssue[],
}

type ContractState = StateData[];

enum ResultType {
    SUCCESS,
    ERROR,
};

type EvaluateResult = {
    type: ResultType,
    result: string | StateChanges,
};

const e = process.env;
const NODE: string = e.NODE_URL ? e.NODE_URL : "https://nodes-testnet.wavesnodes.com";
const api = create(NODE);

const chainId: string = e.CHAIN_ID ? e.CHAIN_ID : "T";
const prediction: Account = {
    address: e.LEGACYPREDICTION_ADDRESS ? e.LEGACYPREDICTION_ADDRESS : "",
};

var totalTests = 0;
var failedTests = 0;

function evaluateTx(dapp: string, tx: string): Promise<EvaluateResult> {
    const headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
    };
    return fetch(NODE + "/utils/script/evaluate/" + dapp, { method: "POST", headers, body: tx })
        .then(resp => resp.json())
        .then(res => {
            if (res.error) {
                return {
                    type: ResultType.ERROR,
                    result: res.message.toString()
                }
            } else {
                return {
                    type: ResultType.SUCCESS,
                    result: res.stateChanges as StateChanges,
                }
            }
        })
}

function getFromState(state: ContractState, key: string) {
    for (const x of state) {
        if (x.key == key)
            return x.value
    }
    return ""
}

function getConfig(dapp: Account): Promise<PredictionConfig> {
    return api.addresses.data(dapp.address)
        .then(data => data as ContractState)
        .then(state => {
            const lastEventId = Number(getFromState(state, "%s__lastEventIndex"));
            const lastGroupId = Number(getFromState(state, "%s__lastGroupIndex"));
            const eventCreationFee = Number(getFromState(state, "%s__eventCreationFeeAmount"));
            const groupCreationFee = Number(getFromState(state, "%s__groupCreationFeeAmount"));
            const mintFeeRate = Number(getFromState(state, "%s__mintFeeRate")) / 10 ** 8;
            const feeGetter = getFromState(state, "%s__feeGetter").toString();
            const priceAsset = getFromState(state, "%s__predictionPriceAsset").toString();

            // Assume event with Id = 1 is Open
            const openEventYesToken = getFromState(state, "%s%s%d__event__yesAssetId__1").toString();
            const openEventNoToken = getFromState(state, "%s%s%d__event__noAssetId__1").toString();
            const openMintedAmount = Number(getFromState(state, "%s%s%d__event__tokensMinted__1"));

            // Assume event with Id = 2 is Open
            const closedEventYesToken = getFromState(state, "%s%s%d__event__yesAssetId__2").toString();
            const closedEventNoToken = getFromState(state, "%s%s%d__event__noAssetId__2").toString();

            return {
                address: dapp.address,
                lastEventId,
                lastGroupId,
                eventCreationFee,
                groupCreationFee,
                mintFeeRate,
                feeGetter,
                priceAsset,
                openEvent: {
                    id: 1,
                    yesToken: openEventYesToken,
                    noToken: openEventNoToken,
                    mintedAmount: openMintedAmount,
                },
                closedEvent: {
                    id: 2,
                    yesToken: closedEventYesToken,
                    noToken: closedEventNoToken,
                    mintedAmount: 0,
                },
            }
        })
        .catch(err => {
            console.error("getConfig:", err);
            process.exit(1);
        });
};


// New event for existing group
function test01(config: PredictionConfig) {
    const testEval = {
        "type": 16,
        "fee": 200500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": config.eventCreationFee * 1.0,
                "assetId": config.priceAsset
            }
        ],
        "call": {
            "function": "newEvents",
            "args": [
                {
                    "type": "integer",
                    "value": 1
                },
                {
                    "type": "string",
                    "value": "EVENT 01"
                },
                {
                    "type": "string",
                    "value": "1893456000000"
                }
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000"
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData = [
        {
            key: '%s%s%d__group__events__1',
            type: 'string',
            value: `2__10__1__${config.lastEventId + 1}`
        },
        {
            key: `%s%s%d__event__name__${config.lastEventId + 1}`,
            type: 'string',
            value: 'EVENT 01'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 1}`,
            type: 'integer',
            value: 1893456000000
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 1}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 1}`,
            type: 'string',
            value: '1'
        },
        {
            key: `%s%s%d__event__yesAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__noAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__tokensMinted__${config.lastEventId + 1}`,
            type: 'integer',
            value: 0
        },
        {
            key: '%s__lastEventIndex',
            type: 'integer',
            value: config.lastEventId + 1
        }
    ]

    const expectedTransfers = [
        {
            address: config.feeGetter,
            asset: config.priceAsset,
            amount: 1000000
        }
    ];

    const expectedIssues = [
        {
            name: `EV_${config.lastEventId + 1}_Y`,
            description: `EventId: ${config.lastEventId + 1} YES token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 1}_N`,
            description: `EventId: ${config.lastEventId + 1} NO token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        }
    ]

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: new event for existing group");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject(expectedData);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.issues).toMatchObject(expectedIssues);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

            } else {
                totalTests++;
                failedTests++;
                console.error("Expected result, got error");
                console.error(val.result);
            }
        });
}


// New group and single event
function test02(config: PredictionConfig) {
    const totalFeeAmount = config.eventCreationFee * 1.0 + config.groupCreationFee;

    const testEval = {
        "type": 16,
        "fee": 200500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": totalFeeAmount,
                "assetId": config.priceAsset
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
                    "value": "EVENT 01"
                },
                {
                    "type": "string",
                    "value": "1893456000000"
                }
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000"
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData = [
        {
            key: `%s%s%d__group__name__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'NEW GROUP!'
        },
        {
            key: `%s%s%d__group__description__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'Lorem ipsum'
        },
        {
            key: `%s%s%d__group__imgSrc__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp'
        },
        {
            key: `%s%s%d__group__source__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'https://google.com'
        },
        {
            key: `%s%s%d__group__creator__${config.lastGroupId + 1}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: '%s__lastGroupIndex',
            type: 'integer',
            value: config.lastGroupId + 1
        },
        {
            key: `%s%s%d__group__events__${config.lastGroupId + 1}`,
            type: 'string',
            value: `${config.lastEventId + 1}`
        },
        {
            key: `%s%s%d__event__name__${config.lastEventId + 1}`,
            type: 'string',
            value: 'EVENT 01'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 1}`,
            type: 'integer',
            value: 1893456000000
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 1}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 1}`,
            type: 'string',
            value: `${config.lastGroupId + 1}`
        },
        {
            key: `%s%s%d__event__yesAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__noAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__tokensMinted__${config.lastEventId + 1}`,
            type: 'integer',
            value: 0
        },
        {
            key: '%s__lastEventIndex',
            type: 'integer',
            value: config.lastEventId + 1
        }
    ]

    const expectedTransfers = [
        {
            address: config.feeGetter,
            asset: config.priceAsset,
            amount: totalFeeAmount
        }
    ];

    const expectedIssues = [
        {
            name: `EV_${config.lastEventId + 1}_Y`,
            description: `EventId: ${config.lastEventId + 1} YES token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 1}_N`,
            description: `EventId: ${config.lastEventId + 1} NO token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        }
    ]

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: new group and one event");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject(expectedData);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.issues).toMatchObject(expectedIssues);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

            } else {
                totalTests++;
                failedTests++;
                console.error("Expected result, got error");
                console.error(val.result);
            }
        });
}

// New group and multiple events
function test03(config: PredictionConfig) {
    const totalFeeAmount = config.eventCreationFee * 3.0 + config.groupCreationFee;

    const testEval = {
        "type": 16,
        "fee": 600500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": totalFeeAmount,
                "assetId": config.priceAsset
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
                    "value": "EVENT 01__EVENT 02__EVENT 03"
                },
                {
                    "type": "string",
                    "value": "1893456000000__1893456000000__1893456000000"
                }
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000"
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData = [
        {
            key: `%s%s%d__group__name__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'NEW GROUP!'
        },
        {
            key: `%s%s%d__group__description__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'Lorem ipsum'
        },
        {
            key: `%s%s%d__group__imgSrc__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp'
        },
        {
            key: `%s%s%d__group__source__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'https://google.com'
        },
        {
            key: `%s%s%d__group__creator__${config.lastGroupId + 1}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: '%s__lastGroupIndex',
            type: 'integer',
            value: config.lastGroupId + 1
        },
        {
            key: `%s%s%d__group__events__${config.lastGroupId + 1}`,
            type: 'string',
            value: `${config.lastEventId + 1}__${config.lastEventId + 2}__${config.lastEventId + 3}`
        },
        {
            key: `%s%s%d__event__name__${config.lastEventId + 1}`,
            type: 'string',
            value: 'EVENT 01'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 1}`,
            type: 'integer',
            value: 1893456000000
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 1}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 1}`,
            type: 'string',
            value: `${config.lastGroupId + 1}`
        },
        {
            key: `%s%s%d__event__yesAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__noAssetId__${config.lastEventId + 1}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__tokensMinted__${config.lastEventId + 1}`,
            type: 'integer',
            value: 0
        },
        {
            key: `%s%s%d__event__name__${config.lastEventId + 2}`,
            type: 'string',
            value: 'EVENT 02'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 2}`,
            type: 'integer',
            value: 1893456000000
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 2}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 2}`,
            type: 'string',
            value: `${config.lastGroupId + 1}`
        },
        {
            key: `%s%s%d__event__yesAssetId__${config.lastEventId + 2}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__noAssetId__${config.lastEventId + 2}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__tokensMinted__${config.lastEventId + 2}`,
            type: 'integer',
            value: 0
        },
        {
            key: `%s%s%d__event__name__${config.lastEventId + 3}`,
            type: 'string',
            value: 'EVENT 03'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 3}`,
            type: 'integer',
            value: 1893456000000
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 3}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 3}`,
            type: 'string',
            value: `${config.lastGroupId + 1}`
        },
        {
            key: `%s%s%d__event__yesAssetId__${config.lastEventId + 3}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__noAssetId__${config.lastEventId + 3}`,
            type: 'string',
        },
        {
            key: `%s%s%d__event__tokensMinted__${config.lastEventId + 3}`,
            type: 'integer',
            value: 0
        },
        {
            key: '%s__lastEventIndex',
            type: 'integer',
            value: config.lastEventId + 3
        }
    ]

    const expectedTransfers = [
        {
            address: config.feeGetter,
            asset: config.priceAsset,
            amount: totalFeeAmount
        }
    ];

    const expectedIssues = [
        {
            name: `EV_${config.lastEventId + 1}_Y`,
            description: `EventId: ${config.lastEventId + 1} YES token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 1}_N`,
            description: `EventId: ${config.lastEventId + 1} NO token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 2}_Y`,
            description: `EventId: ${config.lastEventId + 2} YES token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 2}_N`,
            description: `EventId: ${config.lastEventId + 2} NO token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 3}_Y`,
            description: `EventId: ${config.lastEventId + 3} YES token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
        {
            name: `EV_${config.lastEventId + 3}_N`,
            description: `EventId: ${config.lastEventId + 3} NO token`,
            quantity: 0,
            decimals: 0,
            isReissuable: true,
            compiledScript: null,
            nonce: 0
        },
    ]

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: new group and multiple events");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject(expectedData);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.issues).toMatchObject(expectedIssues);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

            } else {
                totalTests++;
                failedTests++;
                console.error(" Expected result, got error");
                console.error(" " + val.result);
            }
        });
}


// Mint tokens
function test04(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(config.mintFeeRate * mintSendAmount)
    const expectedTokensAmount = 3;

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": mintSendAmount,
                "assetId": config.priceAsset
            },
            {
                "amount": mintFee,
                "assetId": config.priceAsset
            }
        ],
        "call": {
            "function": "mintTokens",
            "args": [
                {
                    "type": "integer",
                    "value": 1
                },
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000",
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData = [
        {
            key: `%s%s%d__event__tokensMinted__${config.openEvent.id}`,
            type: 'integer',
            value: config.openEvent.mintedAmount + expectedTokensAmount
        },
    ]

    const expectedTransfers = [
        {
            address: "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
            asset: config.openEvent.yesToken,
            amount: expectedTokensAmount
        },
        {
            address: "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
            asset: config.openEvent.noToken,
            amount: expectedTokensAmount
        },
        {
            address: config.feeGetter,
            asset: config.priceAsset,
            amount: mintFee
        }
    ];

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: mint tokens");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject(expectedData);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }
            } else {
                totalTests++;
                failedTests++;
                console.error(" Expected result, got error");
                console.error(" " + val.result);
            }
        });
}

// Merge tokens
function test05(config: PredictionConfig) {
    const sendTokenAmount = 3;
    const expectedReceiveAmount = 3000000;

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": sendTokenAmount,
                "assetId": config.openEvent.yesToken
            },
            {
                "amount": sendTokenAmount,
                "assetId": config.openEvent.noToken
            }
        ],
        "call": {
            "function": "mergeTokens",
            "args": [
                {
                    "type": "integer",
                    "value": 1
                },
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000",
                        [config.openEvent.yesToken]: 10,
                        [config.openEvent.noToken]: 10,
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData = [
        {
            key: `%s%s%d__event__tokensMinted__${config.openEvent.id}`,
            type: 'integer',
            value: config.openEvent.mintedAmount - sendTokenAmount
        },
    ]

    const expectedTransfers = [
        {
            address: "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
            asset: config.priceAsset,
            amount: expectedReceiveAmount
        }
    ];

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: merge tokens");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject(expectedData);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }
            } else {
                totalTests++;
                failedTests++;
                console.error(" Expected result, got error");
                console.error(" " + val.result);
            }
        });
}

// Withdraw tokens (CLOSED_NO)
function test06(config: PredictionConfig) {
    const sendTokenAmount = 3;
    const expectedReceiveAmount = 3000000;

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": sendTokenAmount,
                "assetId": config.closedEvent.noToken
            }
        ],
        "call": {
            "function": "withdrawTokens",
            "args": [
                {
                    "type": "integer",
                    "value": 2
                },
            ]
        },
        "state": {
            "accounts": {
                "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx": {
                    "assetBalances": {
                        [config.priceAsset]: "1000000000000",
                        [config.closedEvent.yesToken]: 10,
                        [config.closedEvent.noToken]: 10,
                    },
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedTransfers = [
        {
            address: "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
            asset: config.priceAsset,
            amount: expectedReceiveAmount
        }
    ];

    return evaluateTx(prediction.address, JSON.stringify(testEval))
        .then(val => {
            console.log("testing: withdraw tokens");
            return val;
        })
        .then(val => {
            if (typeof val.result != "string") {
                try {
                    totalTests++;
                    expect(val.result.data).toMatchObject([]);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }

                try {
                    totalTests++;
                    expect(val.result.transfers).toMatchObject(expectedTransfers);
                } catch (err) {
                    failedTests++;
                    console.error(err);
                }
            } else {
                totalTests++;
                failedTests++;
                console.error(" Expected result, got error");
                console.error(" " + val.result);
            }
        });
}

function main() {
    getConfig(prediction).then(config => {
        console.log(config);

        const testPromises = [
            test01(config),
            test02(config),
            test03(config),
            test04(config),
            test05(config),
            test06(config),
        ]
        const limiter = new Bottleneck({ maxConcurrent: 3, minTime: 100 });
        const testTasks = testPromises.map(p => limiter.schedule(() => p));

        Promise.all(testTasks)
            .then(() => {
                console.log(`Total tests: ${totalTests}, Passed: ${totalTests - failedTests}, Failed: ${failedTests}`);
            });
    });
};

main();