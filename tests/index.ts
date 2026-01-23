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
};

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
    expiredEvent: EventConfig,
    stoppedEvent: EventConfig,
};

type StateData = {
    key: string,
    type: string,
    value?: string | number,
};

type StateTransfer = {
    address: string,
    asset: string,
    amount: number,
};

type StateIssue = {
    assetId?: string,
    name: string,
    description: string,
    quantity: number,
    decimals: number,
    isReissuable: boolean,
    compiledScript: string | null,
    nonce: number,
};

type StateChanges = {
    data: StateData[],
    transfers: StateTransfer[],
    issues: StateIssue[],
};

enum ResultType {
    SUCCESS,
    ERROR,
};

type EvaluateResult = {
    type: ResultType.SUCCESS,
    result: StateChanges,
} | {
    type: ResultType.ERROR,
    result: string,
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
                const msg: string = res.message.toString();
                const splitPoint = msg.indexOf('\n');
                return {
                    type: ResultType.ERROR,
                    result: msg.slice(0, splitPoint),
                }
            } else {
                return {
                    type: ResultType.SUCCESS,
                    result: res.stateChanges as StateChanges,
                }
            }
        })
}

function getFromState(state: StateData[], key: string) {
    for (const x of state) {
        if (x.key == key && x.value)
            return x.value
    }
    return ""
}

function getConfig(dapp: Account): Promise<PredictionConfig> {
    return api.addresses.data(dapp.address)
        .then(data => data as StateData[])
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

            // Assume event with Id = 2 is Closed with NO
            const closedEventYesToken = getFromState(state, "%s%s%d__event__yesAssetId__2").toString();
            const closedEventNoToken = getFromState(state, "%s%s%d__event__noAssetId__2").toString();

            // Assume event with Id = 3 is Expired
            const expiredEventYesToken = getFromState(state, "%s%s%d__event__yesAssetId__3").toString();
            const expiredEventNoToken = getFromState(state, "%s%s%d__event__noAssetId__3").toString();

            // Assume event with Id = 4 is Stopped
            const stoppedEventYesToken = getFromState(state, "%s%s%d__event__yesAssetId__4").toString();
            const stoppedEventNoToken = getFromState(state, "%s%s%d__event__noAssetId__4").toString();


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
                expiredEvent: {
                    id: 3,
                    yesToken: expiredEventYesToken,
                    noToken: expiredEventNoToken,
                    mintedAmount: 0,
                },
                stoppedEvent: {
                    id: 4,
                    yesToken: stoppedEventYesToken,
                    noToken: stoppedEventNoToken,
                    mintedAmount: 0,
                }
            }
        })
        .catch(err => {
            console.error("getConfig:", err);
            process.exit(1);
        });
};

function evaluateTest(evalText: string, testDescription: string, expectedResult: EvaluateResult) {
    return evaluateTx(prediction.address, evalText)
        .then(val => {
            console.log(testDescription);
            return val;
        })
        .then(val => {
            if (expectedResult.type == ResultType.SUCCESS) {
                if (val.type == ResultType.SUCCESS) {
                    try {
                        totalTests++;
                        expect(val.result).toMatchObject(expectedResult.result);
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
            }
            else {
                if (val.type == ResultType.ERROR) {
                    try {
                        totalTests++;
                        expect(val.result).toContain(expectedResult.result);
                    } catch (err) {
                        failedTests++;
                        console.error(err);
                    }
                } else {
                    totalTests++;
                    failedTests++;
                    console.error(" Expected error, got result");
                }
            }
        });
}

// New event to existing group
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: new event to existing group",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: expectedIssues,
                transfers: expectedTransfers,
            }
        })
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
                    "value": "Category1__Category2"
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
            key: `%s%s%d__group__category__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'Category1__Category2'
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: new group and one event",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: expectedIssues,
                transfers: expectedTransfers,
            }
        })
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
                    "value": "Category1__Category2"
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
            key: `%s%s%d__group__category__${config.lastGroupId + 1}`,
            type: 'string',
            value: 'Category1__Category2'
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: new group and multiple events",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: expectedIssues,
                transfers: expectedTransfers,
            }
        })
}

// Mint tokens
function test04(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(config.mintFeeRate * mintSendAmount);
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
                    "value": config.openEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: [],
                transfers: expectedTransfers,
            }
        })
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
                    "value": config.openEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: merge tokens",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: [],
                transfers: expectedTransfers,
            }
        })
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
                    "value": config.closedEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: withdraw tokens",
        {
            type: ResultType.SUCCESS,
            result: {
                data: [],
                issues: [],
                transfers: expectedTransfers,
            }
        })
}

// Withdraw tokens (CLOSED_NO), wrong token
function test07(config: PredictionConfig) {
    const sendTokenAmount = 3;
    const expectedErrorMsg = "invalid asset in payment";

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
                "assetId": config.closedEvent.yesToken
            }
        ],
        "call": {
            "function": "withdrawTokens",
            "args": [
                {
                    "type": "integer",
                    "value": config.closedEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: withdraw wrong tokens, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Mint tokens, event closed, expect error
function test08(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(config.mintFeeRate * mintSendAmount);
    const expectedErrorMsg = "event is closed";

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
                    "value": config.closedEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens on closed event, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Mint tokens with not enough fee, expect error
function test09(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = 1;
    const expectedErrorMsg = "mint fee amount is not enough";

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
                    "value": config.openEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens with not enough fee, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Merge different amount of YES and NO tokens
function test10(config: PredictionConfig) {
    const expectedErrorMsg = "payment amounts must be equal";
    const sendTokenAmount = 3;

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
                "amount": sendTokenAmount + 1,
                "assetId": config.openEvent.noToken
            }
        ],
        "call": {
            "function": "mergeTokens",
            "args": [
                {
                    "type": "integer",
                    "value": config.openEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: merge different amount of YES and NO tokens, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Mint tokens for the expired Event, expect error
function test11(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(mintSendAmount * config.mintFeeRate);
    const expectedErrorMsg = "event is expired";

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
                    "value": config.expiredEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens for the expired event, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Mint tokens for the stopped Event, expect error
function test12(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(mintSendAmount * config.mintFeeRate);
    const expectedErrorMsg = "event is stopped";

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
                    "value": config.stoppedEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens for the stopped event, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Mint tokens for the closed Event, expect error
function test13(config: PredictionConfig) {
    const mintSendAmount = 3000000;
    const mintFee = Math.round(mintSendAmount * config.mintFeeRate);
    const expectedErrorMsg = "event is closed";

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
                    "value": config.closedEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: mint tokens for the closed event, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Merge YES and NO tokens from different event, expect error
function test14(config: PredictionConfig) {
    const expectedErrorMsg = "assets and event mismatch";
    const sendTokenAmount = 3;

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
                "assetId": config.closedEvent.yesToken
            },
            {
                "amount": sendTokenAmount,
                "assetId": config.closedEvent.noToken
            }
        ],
        "call": {
            "function": "mergeTokens",
            "args": [
                {
                    "type": "integer",
                    "value": config.openEvent.id
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: merge YES and NO tokens from different event, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Set status by not an admin, expect error
function test15(config: PredictionConfig) {
    const expectedErrorMsg = "setEventStatus: permission denied";

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG",
        "senderPublicKey": "3aqUacmd2bha76PwRqnuJNDQzTyS8KZvEX5mxCaX6656",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "setEventStatus",
            "args": [
                {
                    "type": "integer",
                    "value": config.openEvent.id
                },
                {
                    "type": "integer",
                    "value": 0
                },
            ]
        },
        "state": {
            "accounts": {
                "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG": {
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: not an admin set event status",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Set status by admin
function test16(config: PredictionConfig) {
    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB",
        "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "setEventStatus",
            "args": [
                {
                    "type": "integer",
                    "value": config.stoppedEvent.id
                },
                {
                    "type": "integer",
                    "value": 1
                },
            ]
        },
        "state": {
            "accounts": {
                "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB": {
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData: StateData[] = [
        {
            key: `%s%s%d__event__status__${config.stoppedEvent.id}`,
            type: "integer",
            value: 1,
        }
    ]

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: set status by admin",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                transfers: [],
                issues: [],
            }
        }
    )
}

// Edit group info by admin
function test17(config: PredictionConfig) {
    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB",
        "senderPublicKey": "FB5ErjREo817duEBBQUqUdkgoPctQJEYuG3mU7w3AYjc",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "editGroup",
            "args": [
                {
                    "type": "integer",
                    "value": config.stoppedEvent.id
                },
                {
                    "type": "string",
                    "value": "Group name change"
                },
                {
                    "type": "string",
                    "value": "Lorem ipsum"
                },
                {
                    "type": "string",
                    "value": "Category3__Category4"
                },
                {
                    "type": "string",
                    "value": "https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp?new"
                },
                {
                    "type": "string",
                    "value": "https://google.com?new"
                },
                {
                    "type": "string",
                    "value": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB"
                },
            ]
        },
        "state": {
            "accounts": {
                "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB": {
                    "regularBalance": "300000000000"
                }
            }
        }
    };

    const expectedData: StateData[] = [
        {
            key: `%s%s%d__group__name__${config.stoppedEvent.id}`,
            type: "string",
            value: "Group name change",
        },
        {
            key: `%s%s%d__group__description__${config.stoppedEvent.id}`,
            type: "string",
            value: "Lorem ipsum",
        },
        {
            key: `%s%s%d__group__category__${config.stoppedEvent.id}`,
            type: "string",
            value: "Category3__Category4",
        },
        {
            key: `%s%s%d__group__imgSrc__${config.stoppedEvent.id}`,
            type: "string",
            value: "https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp?new",
        },
        {
            key: `%s%s%d__group__source__${config.stoppedEvent.id}`,
            type: "string",
            value: "https://google.com?new",
        },
        {
            key: `%s%s%d__group__creator__${config.stoppedEvent.id}`,
            type: "string",
            value: "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB",
        },
    ]

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: edit group info by admin",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                transfers: [],
                issues: [],
            }
        }
    )
}

// Edit group info without permission, expect error
function test18(config: PredictionConfig) {
    const expectedErrorMsg = "editGroup: permission denied";

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG",
        "senderPublicKey": "3aqUacmd2bha76PwRqnuJNDQzTyS8KZvEX5mxCaX6656",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "editGroup",
            "args": [
                {
                    "type": "integer",
                    "value": config.stoppedEvent.id
                },
                {
                    "type": "string",
                    "value": "Group name change"
                },
                {
                    "type": "string",
                    "value": "Lorem ipsum"
                },
                {
                    "type": "string",
                    "value": "Category3__Category4"
                },
                {
                    "type": "string",
                    "value": "https://www.gstatic.com/marketing-cms/assets/images/ef/8c/be724dfe44f88ea9f229c060dd0d/chrome-dino.webp?new"
                },
                {
                    "type": "string",
                    "value": "https://google.com?new"
                },
                {
                    "type": "string",
                    "value": "3Mps7CZqB9nUbEirYyCMMoA7VbqrxLvJFSB"
                },
            ]
        },
        "state": {
            "accounts": {
                "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG": {
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: edit group info without permission",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// 2 new events to the existing group
function test19(config: PredictionConfig) {
    const testEval = {
        "type": 16,
        "fee": 400500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": config.eventCreationFee * 2.0,
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
                    "value": "EVENT 01__EVENT 02"
                },
                {
                    "type": "string",
                    "value": "1893456000000__1893456000001"
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
            value: `2__10__1__${config.lastEventId + 1}__${config.lastEventId + 2}`
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
            key: `%s%s%d__event__name__${config.lastEventId + 2}`,
            type: 'string',
            value: 'EVENT 02'
        },
        {
            key: `%s%s%d__event__endDatetime__${config.lastEventId + 2}`,
            type: 'integer',
            value: 1893456000001
        },
        {
            key: `%s%s%d__event__creator__${config.lastEventId + 2}`,
            type: 'string',
            value: '3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx'
        },
        {
            key: `%s%s%d__event__groupId__${config.lastEventId + 2}`,
            type: 'string',
            value: '1'
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
            key: '%s__lastEventIndex',
            type: 'integer',
            value: config.lastEventId + 2
        }
    ]

    const expectedTransfers = [
        {
            address: config.feeGetter,
            asset: config.priceAsset,
            amount: 2000000
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
    ]

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: 2 new events to the existing group",
        {
            type: ResultType.SUCCESS,
            result: {
                data: expectedData,
                issues: expectedIssues,
                transfers: expectedTransfers,
            }
        })
}

// Trying to create event with empty name
function test20(config: PredictionConfig) {
    const expectedErrorMsg = "event cannot be empty";

    const testEval = {
        "type": 16,
        "fee": 400500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [
            {
                "amount": config.eventCreationFee * 2.0,
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
                    "value": ""
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: new events with empty name, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Add event admin without permission, expect error
function test21(config: PredictionConfig) {
    const expectedErrorMsg = "addEventAdmin: permission denied";

    const testEval = {
        "type": 16,
        "fee": 400500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "addEventAdmin",
            "args": [
                {
                    "type": "string",
                    "value": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx"
                },
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: add event admin without permission, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Remove event admin without permission, expect error
function test22(config: PredictionConfig) {
    const expectedErrorMsg = "removeEventAdmin: permission denied";

    const testEval = {
        "type": 16,
        "fee": 400500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx",
        "senderPublicKey": "9QvMuwXsxpVmjirwEvpYyG93BL5uW54RVv5SozrwP9wv",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "removeEventAdmin",
            "args": [
                {
                    "type": "string",
                    "value": "3MwwN6bPUCm2Tbi9YxJwiu21zbRbERroHyx"
                },
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: remove event admin without permission, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Edit event info without permission, expect error
function test23(config: PredictionConfig) {
    const expectedErrorMsg = "editEvent: permission denied";

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG",
        "senderPublicKey": "3aqUacmd2bha76PwRqnuJNDQzTyS8KZvEX5mxCaX6656",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "editEvent",
            "args": [
                {
                    "type": "integer",
                    "value": config.stoppedEvent.id
                },
                {
                    "type": "integer",
                    "value": 1
                },
                {
                    "type": "string",
                    "value": "New event name"
                },
                {
                    "type": "integer",
                    "value": 1893456000000
                },
                {
                    "type": "string",
                    "value": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG"
                },
            ]
        },
        "state": {
            "accounts": {
                "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG": {
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: edit event info without permission",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

// Init function without permission, expect error
function test24(config: PredictionConfig) {
    const expectedErrorMsg = "init: permission denied";

    const testEval = {
        "type": 16,
        "fee": 500000,
        "feeAssetId": null,
        "version": 2,
        "sender": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG",
        "senderPublicKey": "3aqUacmd2bha76PwRqnuJNDQzTyS8KZvEX5mxCaX6656",
        "dApp": config.address,
        "payment": [],
        "call": {
            "function": "init",
            "args": [
                {
                    "type": "integer",
                    "value": config.stoppedEvent.id
                },
                {
                    "type": "integer",
                    "value": 1
                },
                {
                    "type": "string",
                    "value": "New event name"
                },
                {
                    "type": "integer",
                    "value": 1893456000000
                },
                {
                    "type": "string",
                    "value": "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG"
                },
            ]
        },
        "state": {
            "accounts": {
                "3N8xY1SPSrts3MSVQZRZPEc8JuuDYhALRCG": {
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

    return evaluateTest(
        JSON.stringify(testEval),
        "testing: init function without permission, expect error",
        {
            type: ResultType.ERROR,
            result: expectedErrorMsg
        }
    )
}

function main() {
    getConfig(prediction).then(config => {
        console.log("======dApp config======");
        console.log(config);
        console.log("=======================");

        const testPromises = [
            test01(config),
            test02(config),
            test03(config),
            test04(config),
            test05(config),
            test06(config),
            test07(config),
            test08(config),
            test09(config),
            test10(config),
            test11(config),
            test12(config),
            test13(config),
            test14(config),
            test15(config),
            test16(config),
            test17(config),
            test18(config),
            test19(config),
            test20(config),
            test21(config),
            test22(config),
            test23(config),
            test24(config),
        ]
        const limiter = new Bottleneck({ maxConcurrent: 3, minTime: 100 });
        const testTasks = testPromises.map(p => limiter.schedule(() => p));

        Promise.all(testTasks)
            .then(() => {
                console.log("===========================");
                console.log(`Total tests: ${totalTests}, Passed: ${totalTests - failedTests}, Failed: ${failedTests}`);
                console.log("===========================");

                if (failedTests != 0) process.exit(1);
            });
    });
};

main();