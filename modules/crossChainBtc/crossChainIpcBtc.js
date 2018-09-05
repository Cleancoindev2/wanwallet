"use strict";
const config = require('./config.js');

const log = config.getLogger('crossChain-BTC');
log.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>crossChainIpcBtc entered<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
//require('stepcell');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCoreBTC = require('wanchain-crosschain-btc');

//const logger = require('../utils/logger');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const Windows = require('../windows.js');

let wanchainCore;
let be;

ipc.on('CrossChain_BTC2WBTC', async (e, data) => {
    log.debug('CrossChain_BTC2WBTC->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    log.debug('data:', JSON.stringify(data, null, 4));
    let tokenAddress;
    let sendServer = (data.chainType == 'BTC') ? wanchainCore.btcSend : wanchainCore.wanSend;
    if(data.chainType == 'BTC'){
        tokenAddress = config.originalChainHtlc;
    }else {
        tokenAddress = config.wanchainHtlcAddr;
    }

    if(sendServer.socket.connection.readyState != 1){
        try {
            await wanchainCore.reinit(config);
        }catch(error){
            log.error("Failed to connect to apiserver:", error.toString());
            data.error = error.toString();
            callbackMessage('CrossChain_BTC2WBTC',e,data);
            return
        }
    }

    if(data.action == 'createBtcAddress'){
        log.debug('CrossChain_BTC2WBTC->>>>>>>>>createBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        wanchainCore.btcUtil.createAddress(data.parameters).then((newAddress)=>{
            data.value = newAddress;
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        });
    }
    else if(data.action == 'listBtcAddress') {
        try{
            log.debug('CrossChain_BTC2WBTC->>>>>>>>>listBtcAddress>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            wanchainCore.btcUtil.getAddressList().then((addressList)=>{
                addressList.forEach(function(Array, index){
                    log.debug(config.consoleColor.COLOR_FgYellow, (index +1) + ': ' + Array.address, '\x1b[0m');
                });
                data.value = addressList;
                callbackMessage('CrossChain_BTC2WBTC', e, data);
            });
        } catch (e) {
            log.error("Failed to listBtcAddress:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(data.action == 'getBtcBalance') {
        try {
            log.debug('CrossChain_BTC2WBTC->>>>>>>>>getBtcBalance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            let addressList = await wanchainCore.btcUtil.getAddressList();
            let array = [];

            if (addressList.length === 0) {
                log.debug('address list lenght === 0');

                data.value = null;

                callbackMessage('CrossChain_BTC2WBTC', e, data);
                return;
            }

            for (let i = 0; i < addressList.length; i++) {
                array.push(addressList[i].address)
            }

            let utxos = await ccUtil.getBtcUtxo(ccUtil.btcSender, config.MIN_CONFIRM_BLKS, config.MAX_CONFIRM_BLKS, array);
            let result = await ccUtil.getUTXOSBalance(utxos);

            let print = 'btcBalance: ' + web3.toBigNumber(result).div(100000000).toString();

            log.debug(print);

            data.value = web3.toBigNumber(result).div(100000000).toString();

            callbackMessage('CrossChain_BTC2WBTC', e, data);
        } catch (e) {
            log.error("Failed to getBtcBalance:", e.toString());
            data.error = e.toString();
            callbackMessage('CrossChain_BTC2WBTC', e, data);
        }
    }
    else if(sendServer.hasMessage(data.action)){
        // console.log('sendServer :', data);
        let args = data.parameters;
        // console.log(args);
        args.push(function (err,result) {
            data.error = err;
            data.value = result;
            // console.log(err,result);
            callbackMessage('CrossChain_BTC2WBTC',e,data);
        });
        sendServer.sendMessage(data.action , ...args);
    }
});

function callbackMessage(message,e,data){
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    senderWindow.send('Callback_'+message, data);
}

async function init(){
    wanchainCore = new WanchainCoreBTC(config);
    be = wanchainCore.be;
    await wanchainCore.init(config);
}
exports.init = init;
