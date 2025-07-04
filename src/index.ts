import { base58_to_binary, binary_to_base58 } from "base58-js";
import { fromByteArray, toByteArray } from "base64-js";
import { Signer } from "@waves/signer";
import { ProviderKeeper } from "@waves/provider-keeper";
import { ProviderMetamask } from "@waves/provider-metamask";
import { ProviderWeb } from "@waves.exchange/provider-web";

type StateValue = {
    key: string,
    type: string,
    value: string | number,
}

type ContractState = StateValue[];

type SignerType = "keeper" | "metamask" | "web" | (string & {})

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

    balanceBlock: HTMLDivElement,
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
}

const FACTORY_ADDRESS = "3My9nqNjUMmVzeybGf1nmVW2ZAGTUihShWm";
const NODE_URL = "https://nodes-testnet.wavesnodes.com";
const WX_PROVIDER_URL = "https://testnet.wx.network/signer";
const ADDRESS_DATA_END = "/addresses/data/";

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
    balanceBlock: document.getElementById("maker-balance") as HTMLDivElement,
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
    balanceBlock: document.getElementById("taker-balance") as HTMLDivElement,
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
} as Order;

const factoryAddressElement = document.getElementById("factoryAddress") as HTMLSpanElement;
const factoryMatcherPubKeyElement = document.getElementById("factoryMatcherPubKey") as HTMLSpanElement;
const validatorAddressElement = document.getElementById("validatorAddress") as HTMLSpanElement;
const spotAddressElement = document.getElementById("spotAddress") as HTMLSpanElement;
const treasuryAddressElement = document.getElementById("treasuryAddress") as HTMLSpanElement;
const depositBlockElement = document.getElementById("depositBlock") as HTMLDivElement;

const matchingAmountElement = document.getElementById("matchingAmount") as HTMLInputElement;
const matchingPriceElement = document.getElementById("matchingPrice") as HTMLInputElement;
const signExchangeElement = document.getElementById("signExchangeButton") as HTMLDivElement;
const exchangeOutputElement = document.getElementById("exchangeOutput") as HTMLDivElement;

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
) {
    const oBlobParts: Uint8Array[] = [];

    const versionBytes = new Uint8Array(1).fill(version);
    oBlobParts.push(versionBytes);

    const networkBytes = new Uint8Array(1).fill(network.charCodeAt(0));
    oBlobParts.push(networkBytes);

    const senderPrefix = (signerType == "metamask") ? 1 : 0
    const senderPrefixBytes = new Uint8Array(1).fill(senderPrefix);
    const senderBytes = base58_to_binary(sender);
    oBlobParts.push(senderPrefixBytes);
    oBlobParts.push(senderBytes);

    const matcherBytes = base58_to_binary(matcher);
    oBlobParts.push(matcherBytes);

    convertAssetAndPush(oBlobParts, amountAsset);
    convertAssetAndPush(oBlobParts, priceAsset);

    const orderTypeByte = new Uint8Array(1).fill(orderType)
    oBlobParts.push(orderTypeByte);

    if (buying) {
        oBlobParts.push(new Uint8Array(1).fill(0));
    } else {
        oBlobParts.push(new Uint8Array(1).fill(1));
    }

    oBlobParts.push(numberToBytes(amount));
    oBlobParts.push(numberToBytes(price));
    oBlobParts.push(numberToBytes(timestamp));
    oBlobParts.push(numberToBytes(expiration));

    return new Blob(oBlobParts).arrayBuffer();
}

function updateOrder(order: Order) {
    if (Number(order.timestampElement.value) == 0) {
        order.timestampElement.value = `${Math.floor(new Date().getTime() / 1000)}`;
    }

    if (!order.matcherElement.value && factoryMatcherPubKeyElement.innerText) {
        order.matcherElement.value = factoryMatcherPubKeyElement.innerText;
    }

    encodeOrder(
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
        Number(order.expirationElement.value)
    ).then(buffer => {
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
    });
};

function getFromState(state: ContractState, key: string) {
    for (const x of state) {
        if (x.key == key)
            return x.value
    }
    return ""
}

function getContracts() {
    factoryAddressElement.innerText = FACTORY_ADDRESS;

    const kValidator = "%s__matcherValidator";
    const kSpot = "%s__spotContract";
    const kMatcherPubKey = "%s__matcherPublicKey";
    const kTreasuryAddress = "%s__treasuryContract";

    factoryMatcherPubKeyElement.innerText = "LOADING...";
    validatorAddressElement.innerText = "LOADING...";
    spotAddressElement.innerText = "LOADING...";
    treasuryAddressElement.innerText = "LOADING...";

    fetch(NODE_URL + ADDRESS_DATA_END + FACTORY_ADDRESS)
        .then(res => res.json() as Promise<ContractState>)
        .then(state => {
            factoryMatcherPubKeyElement.innerText = getFromState(state, kMatcherPubKey).toString();
            validatorAddressElement.innerText = getFromState(state, kValidator).toString();
            spotAddressElement.innerText = getFromState(state, kSpot).toString();
            treasuryAddressElement.innerText = getFromState(state, kTreasuryAddress).toString();

            const depositLinkElement = document.createElement("a");
            const depositUrl = `https://waves-dapp.com/${getFromState(state, kTreasuryAddress).toString()}#deposit`;
            depositLinkElement.href = depositUrl;
            depositLinkElement.innerText = depositUrl;
            depositLinkElement.target = "_blank";
            depositLinkElement.rel = "noopener noreferrer";
            depositBlockElement.appendChild(depositLinkElement);
        })
}

function getSpotBalance(userAddress: string, balanceBlock: HTMLDivElement) {
    const treasuryAddress = treasuryAddressElement.innerText;

    if (treasuryAddress != "" && userAddress != "") {
        balanceBlock.replaceChildren();

        const filter = `?matches=%25s%25s%25s__balance__${userAddress}.%2A`;
        fetch(NODE_URL + ADDRESS_DATA_END + treasuryAddress + filter)
            .then(res => res.json() as Promise<ContractState>)
            .then(state => {
                const newChildren: HTMLElement[] = [];
                for (const el of state) {
                    const splitVals = el.key.split("__");
                    const assetId = splitVals[splitVals.length - 1];
                    const assetBalanceElement = document.createElement("div");
                    assetBalanceElement.innerText = `${assetId} -> ${el.value}`;
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
    ]

    for (const el of orderElement) {
        el.addEventListener("change", () => { updateOrder(order) });
    }

    order.loginKeeperButton.addEventListener("click", () => {
        const provider = new ProviderKeeper();
        order.signerType = "keeper";
        order.signer.setProvider(provider);
        order.signer.login().then(user => {
            order.addressElement.innerText = user.address;
            order.publicKeyElement.innerText = user.publicKey;

            order.senderElement.value = user.publicKey;
            updateOrder(order);
            getSpotBalance(user.address, order.balanceBlock);
        });
    })

    order.loginMetamaskButton.addEventListener("click", () => {
        const provider = new ProviderMetamask();
        order.signer.setProvider(provider);
        order.signerType = "metamask";
        order.signer.login().then(user => {
            order.addressElement.innerText = user.address;
            order.publicKeyElement.innerText = "METAMASK USER (NO PUBKEY)";

            order.senderElement.value = user.address;
            updateOrder(order);
            getSpotBalance(user.address, order.balanceBlock);
        });
    })

    order.loginWebButton.addEventListener("click", () => {
        const provider = new ProviderWeb(WX_PROVIDER_URL);
        order.signer.setProvider(provider);
        order.signerType = "web";
        order.signer.login().then(user => {
            order.addressElement.innerText = user.address;
            order.publicKeyElement.innerText = user.publicKey;

            order.senderElement.value = user.publicKey;
            updateOrder(order);
            getSpotBalance(user.address, order.balanceBlock);
        });
    })

    order.balanceBlock.addEventListener("click", () => getSpotBalance(order.addressElement.innerText, order.balanceBlock));

    order.signButton.addEventListener("click", () => {
        order.signer.signMessage(order.orderIdb58Element.innerText.trim()).then(proof => {
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
        dApp: validatorAddressElement.innerText,
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

window.addEventListener("DOMContentLoaded", () => {
    getContracts();
    setupEvents(maker);
    setupEvents(taker);
})

