import { base58_to_binary, binary_to_base58 } from "base58-js";
import { fromByteArray } from "base64-js";
import { Provider, Signer } from "@waves/signer";
import { ProviderKeeper } from "@waves/provider-keeper";
import { ProviderMetamask } from "@waves/provider-metamask";
import { ProviderWeb } from "@waves.exchange/provider-web";
import { ProviderCloud } from "@waves.exchange/provider-cloud";

type StateValue = {
    key: string,
    type: string,
    value: string | number,
}

type ContractState = StateValue[];

type EvalResult = {
    result: {
        value: [any]
    }
}

type SignerType = "keeper" | "metamask" | "web" | (string & {})

type OrderTypedData = [
    {
        key: "version",
        type: "integer",
        value: number,
    },
    {
        key: "network",
        type: "string",
        value: string,
    },
    {
        key: "sender",
        type: "string",
        value: string,
    },
    {
        key: "matcherPublicKey",
        type: "string",
        value: string,
    },
    {
        key: "amountAssetId",
        type: "string",
        value: "WAVES" | string,
    },
    {
        key: "priceAssetId",
        type: "string",
        value: "WAVES" | string,
    },
    {
        key: "orderType",
        type: "integer",
        value: number,
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

type Order = {
    signer: Signer,
    signerType: SignerType,
    versionElement: HTMLInputElement,
    networkElement: HTMLInputElement,
    senderElement: HTMLInputElement,
    matcherElement: HTMLInputElement,
    amountElement: HTMLInputElement,
    amountAssetIdElement: HTMLInputElement,
    priceElement: HTMLInputElement,
    priceElementAssetId: HTMLInputElement,
    orderTypeElement: HTMLInputElement,
    buyingElement: HTMLInputElement,
    timestampElement: HTMLInputElement,
    expirationElement: HTMLInputElement,
    flagsElement: HTMLInputElement,

    balanceBlock: HTMLDivElement,
    balanceUpdateButton: HTMLButtonElement,
    orderBytesElement: HTMLDivElement,
    orderIdb58Element: HTMLDivElement,
    orderIdb64Element: HTMLDivElement,
    proofElement: HTMLDivElement,
    addressElement: HTMLDivElement,
    publicKeyElement: HTMLDivElement,

    signButton: HTMLButtonElement,
    loginKeeperButton: HTMLButtonElement,
    loginMetamaskButton: HTMLButtonElement,
    loginWebButton: HTMLButtonElement,
    loginEmailButton: HTMLButtonElement,

    predictionStatusElement: HTMLHeadingElement;
}

const FACTORY_ADDRESS = "3My9nqNjUMmVzeybGf1nmVW2ZAGTUihShWm";
const NODE_URL = "https://nodes-testnet.wavesnodes.com";
const WX_PROVIDER_URL = "https://testnet.wx.network/signer";
const ADDRESS_DATA_END = "/addresses/data/";
const EVAL_END = "/utils/script/evaluate/";

var PREDICTION_MODE = false;

const EVENT_STATUS = [
    "OPEN",
    "CLOSED_YES",
    "CLOSED_NO",
    "STOPPED",
]

const maker = {
    signer: new Signer({ NODE_URL }),
    signerType: {},
    versionElement: document.getElementById("maker-version") as HTMLInputElement,
    networkElement: document.getElementById("maker-network") as HTMLInputElement,
    senderElement: document.getElementById("maker-senderPublicKey") as HTMLInputElement,
    matcherElement: document.getElementById("maker-matcherPublicKey") as HTMLInputElement,
    amountElement: document.getElementById("maker-amount") as HTMLInputElement,
    amountAssetIdElement: document.getElementById("maker-amountAssetId") as HTMLInputElement,
    priceElement: document.getElementById("maker-price") as HTMLInputElement,
    priceElementAssetId: document.getElementById("maker-priceAssetId") as HTMLInputElement,
    orderTypeElement: document.getElementById("maker-orderType") as HTMLInputElement,
    buyingElement: document.getElementById("maker-buying") as HTMLInputElement,
    timestampElement: document.getElementById("maker-timestamp") as HTMLInputElement,
    expirationElement: document.getElementById("maker-expiration") as HTMLInputElement,
    flagsElement: document.getElementById("maker-flags") as HTMLInputElement,
    balanceBlock: document.getElementById("maker-balance") as HTMLDivElement,
    balanceUpdateButton: document.getElementById("maker-balance-update") as HTMLButtonElement,
    orderBytesElement: document.getElementById("maker-orderBytes") as HTMLDivElement,
    orderIdb58Element: document.getElementById("maker-orderId-b58") as HTMLDivElement,
    orderIdb64Element: document.getElementById("maker-orderId-b64") as HTMLDivElement,
    proofElement: document.getElementById("maker-proof") as HTMLDivElement,
    signButton: document.getElementById("maker-signWithKeeper") as HTMLButtonElement,
    addressElement: document.getElementById("maker-address") as HTMLDivElement,
    publicKeyElement: document.getElementById("maker-publicKey") as HTMLDivElement,
    loginKeeperButton: document.getElementById("maker-loginKeeperButton") as HTMLButtonElement,
    loginMetamaskButton: document.getElementById("maker-loginMetamaskButton") as HTMLButtonElement,
    loginWebButton: document.getElementById("maker-loginWebButton") as HTMLButtonElement,
    loginEmailButton: document.getElementById("maker-loginEmailButton") as HTMLButtonElement,
    predictionStatusElement: document.getElementById("maker-prediction-status") as HTMLHeadingElement,
} as Order;

const taker = {
    signer: new Signer({ NODE_URL }),
    signerType: {},
    versionElement: document.getElementById("taker-version") as HTMLInputElement,
    networkElement: document.getElementById("taker-network") as HTMLInputElement,
    senderElement: document.getElementById("taker-senderPublicKey") as HTMLInputElement,
    matcherElement: document.getElementById("taker-matcherPublicKey") as HTMLInputElement,
    amountElement: document.getElementById("taker-amount") as HTMLInputElement,
    amountAssetIdElement: document.getElementById("taker-amountAssetId") as HTMLInputElement,
    priceElement: document.getElementById("taker-price") as HTMLInputElement,
    priceElementAssetId: document.getElementById("taker-priceAssetId") as HTMLInputElement,
    orderTypeElement: document.getElementById("taker-orderType") as HTMLInputElement,
    buyingElement: document.getElementById("taker-buying") as HTMLInputElement,
    timestampElement: document.getElementById("taker-timestamp") as HTMLInputElement,
    expirationElement: document.getElementById("taker-expiration") as HTMLInputElement,
    flagsElement: document.getElementById("taker-flags") as HTMLInputElement,
    balanceBlock: document.getElementById("taker-balance") as HTMLDivElement,
    balanceUpdateButton: document.getElementById("taker-balance-update") as HTMLButtonElement,
    orderBytesElement: document.getElementById("taker-orderBytes") as HTMLDivElement,
    orderIdb58Element: document.getElementById("taker-orderId-b58") as HTMLDivElement,
    orderIdb64Element: document.getElementById("taker-orderId-b64") as HTMLDivElement,
    proofElement: document.getElementById("taker-proof") as HTMLDivElement,
    signButton: document.getElementById("taker-signWithKeeper") as HTMLButtonElement,
    addressElement: document.getElementById("taker-address") as HTMLDivElement,
    publicKeyElement: document.getElementById("taker-publicKey") as HTMLDivElement,
    loginKeeperButton: document.getElementById("taker-loginKeeperButton") as HTMLButtonElement,
    loginMetamaskButton: document.getElementById("taker-loginMetamaskButton") as HTMLButtonElement,
    loginWebButton: document.getElementById("taker-loginWebButton") as HTMLButtonElement,
    loginEmailButton: document.getElementById("taker-loginEmailButton") as HTMLButtonElement,
    predictionStatusElement: document.getElementById("taker-prediction-status") as HTMLHeadingElement,
} as Order;

const factoryAddressElement = document.getElementById("factoryAddress") as HTMLSpanElement;
const factoryMatcherPubKeyElement = document.getElementById("factoryMatcherPubKey") as HTMLSpanElement;
const validatorAddressElement = document.getElementById("validatorAddress") as HTMLSpanElement;
const predictionValidatorAddressElement = document.getElementById("predictionValidatorAddress") as HTMLSpanElement;
const spotAddressElement = document.getElementById("spotAddress") as HTMLSpanElement;
const leverageAddressElement = document.getElementById("leverageAddress") as HTMLSpanElement;
const predictionAddressElement = document.getElementById("predictionAddress") as HTMLSpanElement;
const treasuryAddressElement = document.getElementById("treasuryAddress") as HTMLSpanElement;
const poolAddressElement = document.getElementById("poolAddress") as HTMLSpanElement;
const depositBlockElement = document.getElementById("depositBlock") as HTMLDivElement;
const eventStatusesBlockElement = document.getElementById("event-statuses") as HTMLDivElement;

const matchingAmountElement = document.getElementById("matchingAmount") as HTMLInputElement;
const matchingPriceElement = document.getElementById("matchingPrice") as HTMLInputElement;
const matchingMakerFeeElement = document.getElementById("matchingMakerFee") as HTMLInputElement;
const matchingMakerFeeAssetElement = document.getElementById("matchingMakerFeeAsset") as HTMLInputElement;
const matchingTakerFeeElement = document.getElementById("matchingTakerFee") as HTMLInputElement;
const matchingTakerFeeAssetElement = document.getElementById("matchingTakerFeeAsset") as HTMLInputElement;
const signExchangeElement = document.getElementById("signExchangeButton") as HTMLButtonElement;
const exchangeOutputElement = document.getElementById("exchangeOutput") as HTMLDivElement;

const withdrawLastTxElement = document.getElementById("withdraw-lastWithdrawTx") as HTMLInputElement;
const withdrawUserElement = document.getElementById("withdraw-userAddress") as HTMLInputElement;
const withdrawAssetIdElement = document.getElementById("withdraw-assetId") as HTMLInputElement;
const withdrawSignData = document.getElementById("withdraw-signData") as HTMLInputElement;
const withdrawAmountElement = document.getElementById("withdraw-amount") as HTMLInputElement;
const signWithdrawButton = document.getElementById("signFastWithdraw") as HTMLButtonElement;

const poolUserElement = document.getElementById("poolUserAddress") as HTMLDivElement;
const poolLoginButton = document.getElementById("poolLogin") as HTMLButtonElement;
const poolBalanceElement = document.getElementById("poolBalance") as HTMLDivElement;
const poolSigner = new Signer({ NODE_URL });

function numberToBytes(x: number): Uint8Array {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(x));
    return new Uint8Array(buffer);
}

function convertAssetAndPush(oBlobParts: Uint8Array[], assetId: string,) {
    if (assetId == "WAVES") {
        oBlobParts.push(new Uint8Array(1).fill(0));
    } else {
        const assetPrefix = new Uint8Array(1).fill(1);
        oBlobParts.push(assetPrefix);
        oBlobParts.push(base58_to_binary(assetId));
    }
}

function encodeOrder(
    signerType: SignerType,
    version: number,
    network: string,
    sender: string,
    matcher: string,
    amount: number,
    amountAsset: string,
    price: number,
    priceAsset: string,
    orderType: number,
    buying: boolean,
    timestamp: number,
    expiration: number,
    flags: number,
): ArrayBuffer {
    const oArrayBufferParts: Uint8Array[] = [];

    const versionBytes = new Uint8Array(1).fill(version);
    oArrayBufferParts.push(versionBytes);

    const networkBytes = new Uint8Array(1).fill(network.charCodeAt(0));
    oArrayBufferParts.push(networkBytes);

    const senderPrefix = (signerType == "metamask") ? 1 : 0
    const senderPrefixBytes = new Uint8Array(1).fill(senderPrefix);
    const senderBytes = base58_to_binary(sender);
    oArrayBufferParts.push(senderPrefixBytes);
    oArrayBufferParts.push(senderBytes);

    const matcherBytes = base58_to_binary(matcher);
    oArrayBufferParts.push(matcherBytes);

    convertAssetAndPush(oArrayBufferParts, amountAsset);
    convertAssetAndPush(oArrayBufferParts, priceAsset);

    const orderTypeByte = new Uint8Array(1).fill(orderType);
    oArrayBufferParts.push(orderTypeByte);

    if (buying) {
        oArrayBufferParts.push(new Uint8Array(1).fill(0));
    } else {
        oArrayBufferParts.push(new Uint8Array(1).fill(1));
    }

    oArrayBufferParts.push(numberToBytes(amount));
    oArrayBufferParts.push(numberToBytes(price));
    oArrayBufferParts.push(numberToBytes(timestamp));
    oArrayBufferParts.push(numberToBytes(expiration));
    oArrayBufferParts.push(numberToBytes(flags));

    const arrayBuffer = flattenBytes(oArrayBufferParts);
    return arrayBuffer;
}

function flattenBytes(data: Uint8Array[]): ArrayBuffer {
    const totalLen = data.reduce((sum: number, val) => sum + val.byteLength, 0)
    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);
    let pos = 0;
    for (const arr of data) {
        arr.forEach((val, i) => view.setUint8(pos + i, val));
        pos += arr.byteLength;
    }
    return buffer;
}

function getWithdrawMatcherSignData(txId: string, userAddress: string, assetId: string, amount: number) {
    const oArrayBufferParts: Uint8Array[] = [];

    // Prefix: [255, 255, 255, 1]
    const prefix = base58_to_binary("7YXq4t");

    oArrayBufferParts.push(prefix);

    if (txId) {
        oArrayBufferParts.push(base58_to_binary(txId));
    }
    oArrayBufferParts.push(base58_to_binary(userAddress));
    convertAssetAndPush(oArrayBufferParts, assetId);
    oArrayBufferParts.push(numberToBytes(amount))

    return flattenBytes(oArrayBufferParts);
}

function updateOrder(order: Order) {
    if (order.orderTypeElement.value == "3") {
        PREDICTION_MODE = true;
        order.predictionStatusElement.hidden = false;
        const flags = Number(order.flagsElement.value)
        order.predictionStatusElement.innerText = `Prediction: ${(flags & 0xFF) == 1 ? "NO" : "YES"}`;
    } else {
        PREDICTION_MODE = false;
        order.predictionStatusElement.hidden = true;
    }

    if (Number(order.timestampElement.value) == 0) {
        order.timestampElement.value = `${Math.floor(new Date().getTime() / 1000)}`;
    }

    if (!order.matcherElement.value && factoryMatcherPubKeyElement.innerText) {
        order.matcherElement.value = factoryMatcherPubKeyElement.innerText;
    }

    const buffer = encodeOrder(
        order.signerType,
        Number(order.versionElement.value),
        order.networkElement.value,
        order.senderElement.value,
        order.matcherElement.value,
        Number(order.amountElement.value),
        order.amountAssetIdElement.value,
        Number(order.priceElement.value),
        order.priceElementAssetId.value,
        Number(order.orderTypeElement.value),
        order.buyingElement.checked,
        Number(order.timestampElement.value),
        Number(order.expirationElement.value),
        Number(order.flagsElement.value),
    );

    const bytesString = fromByteArray(new Uint8Array(buffer));

    window.crypto.subtle.digest("SHA-256", buffer)
        .then(hash => {
            const uintHash = new Uint8Array(hash);
            order.orderIdb58Element.innerText = binary_to_base58(uintHash);
            order.orderIdb64Element.innerText = window.btoa(order.orderIdb58Element.innerText);
            return uintHash;
        })

    order.orderBytesElement.innerText = bytesString;
    order.proofElement.innerText = "";
};

function getFromState(state: ContractState, key: string) {
    for (const x of state) {
        if (x.key == key)
            return x.value
    }
    return ""
}

function getEventsFromState(state: ContractState) {
    let allEvents: { eventId: string, status: string }[] = [];
    const events = state.filter((val) => val.key.includes("eventStatus"));
    for (const ev of events) {
        const eventId = ev.key.split("__")[2];
        var status = "INVALID";
        if (typeof (ev.value) == "number") {
            status = EVENT_STATUS[ev.value]
        }

        allEvents.push({ eventId, status });
    }

    return allEvents;
}

function getContracts() {
    factoryAddressElement.innerText = FACTORY_ADDRESS;

    const kMatcherPubKey = "%s__matcherPublicKey";
    const kValidatorAddress = "%s__validatorAddress";
    const kPredictionValidatorAddress = "%s__predictionValidatorAddress";
    const kTreasuryAddress = "%s__treasuryAddress";
    const kPoolAddress = "%s__poolAddress";
    const kSpotAddress = "%s__spotAddress";
    const kLeverageAddress = "%s__leverageAddress";
    const kPredictionAddress = "%s__predictionAddress";

    factoryMatcherPubKeyElement.innerText = "LOADING...";
    validatorAddressElement.innerText = "LOADING...";
    predictionValidatorAddressElement.innerText = "LOADING...";
    treasuryAddressElement.innerText = "LOADING...";
    poolAddressElement.innerText = "LOADING...";
    spotAddressElement.innerText = "LOADING...";
    leverageAddressElement.innerText = "LOADING...";
    predictionAddressElement.innerText = "LOADING...";

    fetch(NODE_URL + ADDRESS_DATA_END + FACTORY_ADDRESS)
        .then(res => res.json() as Promise<ContractState>)
        .then(state => {
            factoryMatcherPubKeyElement.innerText = getFromState(state, kMatcherPubKey).toString();
            validatorAddressElement.innerText = getFromState(state, kValidatorAddress).toString();
            predictionValidatorAddressElement.innerText = getFromState(state, kPredictionValidatorAddress).toString();
            treasuryAddressElement.innerText = getFromState(state, kTreasuryAddress).toString();
            poolAddressElement.innerText = getFromState(state, kPoolAddress).toString();
            spotAddressElement.innerText = getFromState(state, kSpotAddress).toString();
            leverageAddressElement.innerText = getFromState(state, kLeverageAddress).toString();
            predictionAddressElement.innerText = getFromState(state, kPredictionAddress).toString();

            for (const ev of getEventsFromState(state)) {
                const eventElement = document.createElement("div");
                eventElement.innerText = `${ev.eventId} -> ${ev.status}`;
                eventStatusesBlockElement.appendChild(eventElement);
            }

            const depositLinkElement = document.createElement("a");
            const depositUrl = `https://waves-dapp.com/${getFromState(state, kTreasuryAddress).toString()}#deposit`;
            depositLinkElement.href = depositUrl;
            depositLinkElement.innerText = depositUrl;
            depositLinkElement.target = "_blank";
            depositLinkElement.rel = "noopener noreferrer";
            depositBlockElement.appendChild(depositLinkElement);
        })
}

function getUserLastWithdrawTx(treasuryAddress: string, userAddress: string) {
    const headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
    };

    const userKey = `%s%s__lastFastWithdrawTx__${userAddress}`;
    const postData = { "keys": [userKey] };

    return fetch(NODE_URL + ADDRESS_DATA_END + treasuryAddress, { method: "POST", body: JSON.stringify(postData), headers })
        .then(res => res.json() as Promise<[any]>)
        .then(data => data[0] ? data[0].value as string : "");
}

function getUserBalance(treasuryAddress: string, userAddress: string) {
    const headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
    };

    const userKey = `?matches=%s%s%s__(balance|loan)__${userAddress}__.*`;
    const uri = NODE_URL + ADDRESS_DATA_END + treasuryAddress + userKey

    return fetch(encodeURI(uri), { method: "GET", headers })
        .then(res => res.json() as Promise<[any]>)
        .then(data => {
            let balanceMap: Record<string, number> = {};
            let loanMap: Record<string, number> = {};
            for (const r of data) {
                const assetId = r.key.split("__")[3] as string
                if ((r.key as string).includes("balance")) {
                    balanceMap[assetId] = r.value
                } else {
                    loanMap[assetId] = r.value
                }
            }

            return { balanceMap, loanMap };
        });
}

function drawTreasuryBalance(userAddress: string, balanceBlock: HTMLDivElement) {
    const treasuryAddress = treasuryAddressElement.innerText;

    if (treasuryAddress != "" && userAddress != "") {
        balanceBlock.replaceChildren();

        getUserBalance(treasuryAddress, userAddress)
            .then(data => {
                const newChildren: HTMLElement[] = [];
                for (const assetId of Object.keys(data.balanceMap)) {
                    const balance = data.balanceMap[assetId]
                    const loan = data.loanMap[assetId] | 0
                    const assetBalanceElement = document.createElement("div");

                    assetBalanceElement.innerText = `${assetId} -> ${balance} (${loan})`;
                    newChildren.push(assetBalanceElement);
                }

                balanceBlock.replaceChildren(...newChildren);
                getUserLastWithdrawTx(treasuryAddress, userAddress).then(txId => {
                    const lastTxIdElement = document.createElement("div");
                    lastTxIdElement.innerText = `Last Withdraw TXID: ${txId}`

                    balanceBlock.appendChild(lastTxIdElement);

                    withdrawLastTxElement.value = txId;
                });
                withdrawUserElement.value = userAddress;
            })
    }
}

function getPoolBalance(userAddress: string, balanceBlock: HTMLDivElement) {
    const poolAddress = poolAddressElement.innerText;

    if (poolAddress != "" && userAddress != "") {
        balanceBlock.replaceChildren();

        const getInfoEval = { "expr": `getAllUserInfo("${userAddress}")` };
        const headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
        }

        fetch(NODE_URL + EVAL_END + poolAddress, { method: "POST", body: JSON.stringify(getInfoEval), headers })
            .then(res => res.json() as Promise<EvalResult>)
            .then(state => {
                const newChildren: HTMLElement[] = [];
                for (const el of state.result.value) {
                    const assetId = el.value._1.value;
                    const amount = el.value._2.value;
                    const assetBalanceElement = document.createElement("div");

                    assetBalanceElement.innerText = `${assetId} -> ${amount}`;
                    newChildren.push(assetBalanceElement);
                }

                balanceBlock.replaceChildren(...newChildren);
            })
    }
}

function setupEvents(order: Order) {
    const orderElement = [
        order.versionElement,
        order.networkElement,
        order.senderElement,
        order.matcherElement,
        order.amountElement,
        order.amountAssetIdElement,
        order.priceElement,
        order.priceElementAssetId,
        order.orderTypeElement,
        order.buyingElement,
        order.timestampElement,
        order.expirationElement,
        order.flagsElement,
    ]

    for (const el of orderElement) {
        el.addEventListener("change", () => { updateOrder(order) });
    }

    function getProofPromise(order: Order): Promise<string> {
        if (order.versionElement.value == "1") {
            return order.signer.signMessage(order.orderIdb58Element.innerText.trim());
        }

        if (order.versionElement.value == "2") {
            const orderData: OrderTypedData = [
                {
                    key: "version",
                    type: "integer",
                    value: Number(order.versionElement.value),
                },
                {
                    key: "network",
                    type: "string",
                    value: order.networkElement.value,
                },
                {
                    key: "sender",
                    type: "string",
                    value: order.senderElement.value,
                },
                {
                    key: "matcherPublicKey",
                    type: "string",
                    value: order.matcherElement.value,
                },
                {
                    key: "amountAssetId",
                    type: "string",
                    value: order.amountAssetIdElement.value,
                },
                {
                    key: "priceAssetId",
                    type: "string",
                    value: order.priceElementAssetId.value,
                },
                {
                    key: "orderType",
                    type: "integer",
                    value: Number(order.orderTypeElement.value),
                },
                {
                    key: "orderDirection",
                    type: "string",
                    value: order.buyingElement.checked ? "buy" : "sell",
                },
                {
                    key: "amount",
                    type: "integer",
                    value: Number(order.amountElement.value),
                },
                {
                    key: "price",
                    type: "integer",
                    value: Number(order.priceElement.value),
                },
                {
                    key: "timestamp",
                    type: "integer",
                    value: Number(order.timestampElement.value),
                },
                {
                    key: "expiration",
                    type: "integer",
                    value: Number(order.expirationElement.value),
                },
                {
                    key: "flags",
                    type: "integer",
                    value: Number(order.flagsElement.value),
                },
            ];
            return order.signer.signTypedData(orderData);
        }


        return Promise.reject("unsupported version");
    }

    function setProviderAndUpdateOrder(order: Order, provider: Provider) {
        order.signer.setProvider(provider);
        order.signer.login().then(user => {
            order.addressElement.innerText = user.address;
            if (order.signerType == "metamask") {
                order.publicKeyElement.innerText = "METAMASK USER (NO PUBKEY)";
                order.senderElement.value = user.address;
            } else {
                order.publicKeyElement.innerText = user.publicKey;
                order.senderElement.value = user.publicKey;
            }

            updateOrder(order);
            drawTreasuryBalance(user.address, order.balanceBlock);
        });
    }

    order.loginKeeperButton.addEventListener("click", () => {
        const provider = new ProviderKeeper();
        order.signerType = "keeper";
        setProviderAndUpdateOrder(order, provider);
    })

    order.loginMetamaskButton.addEventListener("click", () => {
        const provider = new ProviderMetamask();
        order.signerType = "metamask";
        setProviderAndUpdateOrder(order, provider);
    })

    order.loginWebButton.addEventListener("click", () => {
        const provider = new ProviderWeb(WX_PROVIDER_URL);
        order.signerType = "web";
        setProviderAndUpdateOrder(order, provider);
    })

    order.loginEmailButton.addEventListener("click", () => {
        const provider = new ProviderCloud(WX_PROVIDER_URL);
        order.signerType = "email";
        setProviderAndUpdateOrder(order, provider);
    })

    order.balanceUpdateButton.addEventListener("click", () => drawTreasuryBalance(order.addressElement.innerText, order.balanceBlock));

    order.signButton.addEventListener("click", () => {
        getProofPromise(order).then(proof => {
            if (order.signerType == "metamask") {
                const hexString = proof.substring(2);
                const array = new Uint8Array(Math.ceil(hexString.length / 2));
                for (var i = 0; i < array.length; i++) {
                    array[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
                }
                order.proofElement.innerText = fromByteArray(array)
            } else {
                order.proofElement.innerText = fromByteArray(base58_to_binary(proof));
            }
        });
    })
}

signExchangeElement.addEventListener("click", () => {
    exchangeOutputElement.innerText = "";

    maker.signer.invoke({
        dApp: PREDICTION_MODE ? predictionValidatorAddressElement.innerText : validatorAddressElement.innerText,
        call: {
            function: "validateAndExchange",
            args: [
                {
                    type: "binary",
                    value: `base64:${maker.orderBytesElement.innerText}`,
                },
                {
                    type: "binary",
                    value: `base64:${maker.proofElement.innerText}`,
                },
                {
                    type: "binary",
                    value: `base64:${taker.orderBytesElement.innerText}`,
                },
                {
                    type: "binary",
                    value: `base64:${taker.proofElement.innerText}`,
                },
                {
                    type: "integer",
                    value: Number(matchingAmountElement.value)
                },
                {
                    type: "integer",
                    value: Number(matchingPriceElement.value)
                },
                {
                    type: "string",
                    value: matchingMakerFeeAssetElement.value,
                },
                {
                    type: "integer",
                    value: Number(matchingMakerFeeElement.value)
                },
                {
                    type: "string",
                    value: matchingTakerFeeAssetElement.value,
                },
                {
                    type: "integer",
                    value: Number(matchingTakerFeeElement.value)
                },
            ]
        }
    })
        .broadcast()
        .then(r => {
            const res = r as any;

            let statusText = "";
            if (Array.isArray(res)) {
                for (const tx of res) {
                    statusText += tx.id.toString() + "\n";
                }
            } else {
                statusText = res.id.toString();
            }
            exchangeOutputElement.innerText = statusText;
            console.log(res);
        })
        .catch(err => {
            exchangeOutputElement.innerText = err.message.toString();
            console.log(err);
        });
})

signWithdrawButton.addEventListener("click", () => {
    const buffer = getWithdrawMatcherSignData(
        withdrawLastTxElement.value,
        withdrawUserElement.value,
        withdrawAssetIdElement.value,
        Number(withdrawAmountElement.value),
    );
    const bytesString = binary_to_base58(new Uint8Array(buffer));
    withdrawSignData.innerText = bytesString;
})

poolLoginButton.addEventListener("click", () => {
    const keeper = new ProviderKeeper();
    poolSigner.setProvider(keeper);

    poolSigner.login()
        .then(userData => {
            poolUserElement.innerText = userData.address;
            return userData.address
        })
        .then(address => getPoolBalance(address, poolBalanceElement))
});

poolBalanceElement.addEventListener("click", () => getPoolBalance(poolUserElement.innerText, poolBalanceElement));

window.addEventListener("DOMContentLoaded", () => {
    getContracts();
    setupEvents(maker);
    setupEvents(taker);
});
