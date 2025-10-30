import { nodeInteraction, setScript } from "@waves/waves-transactions";
import { readFileSync } from 'node:fs';
import { create } from "@waves/node-api-js";
import 'dotenv/config'

type Account = {
    seed: string,
    address: string,
};

const e = process.env;
const NODE: string = e.NODE_URL ? e.NODE_URL : "https://nodes-testnet.wavesnodes.com";
const chainId: string = e.CHAIN_ID ? e.CHAIN_ID : "T";
const api = create(NODE);

function compile(filePath: string) {
    const scriptText = readFileSync(filePath, { encoding: 'utf-8' });
    return api.utils.fetchCompileCode(scriptText).then(r => {
        return r.script;
    }).catch(e => {
        console.error(e);
        process.exit(1)
    });
};

function getScript(address: string) {
    return api.addresses.fetchScriptInfo(address)
        .then(r => r.script)
        .catch(e => {
            console.error(e);
            return undefined;
        });
};

function broadcastNewScript(newScriptFilename: string, account: Account) {
    if (account.seed == "") return Promise.reject(new Error(`${newScriptFilename}: empty seed`))
    if (account.address == "") return Promise.reject(new Error(`${newScriptFilename}: empty address`))

    return getScript(account.address).then(oldScript => {
        return compile(newScriptFilename).then(newScript => {
            if (newScript === oldScript) {
                return `Script is up to date: ${newScriptFilename} ${account.address}`;
            } else {
                const setScriptTx = setScript({
                    script: newScript,
                    chainId,
                    additionalFee: 400000,
                }, account.seed);

                return nodeInteraction.broadcast(setScriptTx, NODE).then(e => `Updated: ${newScriptFilename} ${account.address}`);
            }
        });
    });
}

const validator: Account = {
    seed: e.VALIDATOR_SEED ? e.VALIDATOR_SEED : "",
    address: e.VALIDATOR_ADDRESS ? e.VALIDATOR_ADDRESS : "",
}

const factory: Account = {
    seed: e.FACTORY_SEED ? e.FACTORY_SEED : "",
    address: e.FACTORY_ADDRESS ? e.FACTORY_ADDRESS : "",
}

const spot: Account = {
    seed: e.SPOT_SEED ? e.SPOT_SEED : "",
    address: e.SPOT_ADDRESS ? e.SPOT_ADDRESS : "",
}

const treasury: Account = {
    seed: e.TREASURY_SEED ? e.TREASURY_SEED : "",
    address: e.TREASURY_ADDRESS ? e.TREASURY_ADDRESS : "",
}

const pool: Account = {
    seed: e.POOL_SEED ? e.POOL_SEED : "",
    address: e.POOL_ADDRESS ? e.POOL_ADDRESS : "",
}

const leverage: Account = {
    seed: e.LEVERAGE_SEED ? e.LEVERAGE_SEED : "",
    address: e.LEVERAGE_ADDRESS ? e.LEVERAGE_ADDRESS : "",
}

const prediction: Account = {
    seed: e.PREDICTION_SEED ? e.PREDICTION_SEED : "",
    address: e.PREDICTION_ADDRESS ? e.PREDICTION_ADDRESS : "",
}

const predictionValidator: Account = {
    seed: e.PREDICTION_VALIDATOR_SEED ? e.PREDICTION_VALIDATOR_SEED : "",
    address: e.PREDICTION_VALIDATOR_ADDRESS ? e.PREDICTION_VALIDATOR_ADDRESS : "",
}

const deployPromises = [
    broadcastNewScript('./ride/matcher-validator.ride', validator),
    broadcastNewScript('./ride/matcher-factory.ride', factory),
    broadcastNewScript('./ride/matcher-spot.ride', spot),
    broadcastNewScript('./ride/matcher-treasury.ride', treasury),
    broadcastNewScript('./ride/matcher-pool.ride', pool),
    broadcastNewScript('./ride/matcher-leverage.ride', leverage),
    broadcastNewScript('./ride/matcher-prediction.ride', prediction),
    broadcastNewScript('./ride/prediction-validator.ride', predictionValidator),
]

Promise.all(deployPromises)
    .then(res => console.log(res))
    .catch(e => console.error(e));