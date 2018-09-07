"use strict";

//require('stepcell');
const config = require('./config.js');
const { app, ipcMain: ipc, shell, webContents } = require('electron');
let WanchainCore = require('wanchain-crosschain');
const pu = require('promisefy-util');
const BigNumber = require('bignumber.js');
//const logger = require('../utils/logger');
const Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const Windows = require('../windows');
function toGweiString(swei){
    let exp = new BigNumber(10);
    let wei = new BigNumber(swei);
    let gwei = wei.dividedBy(exp.pow(9));
    return  gwei.toString(10);
}
let wanchainCore;
let be;
const log = config.getLogger('crossChain');

ipc.on('CrossChain_ETH2WETH', async (e, data) => {
    // console.log('CrossChainIPC : ',data);
    let tokenAddress;
    let sendServer = (data.chainType == 'ETH') ? wanchainCore.ethSend : wanchainCore.wanSend;
    if(data.chainType == 'ETH'){
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
            callbackMessage('CrossChain_ETH2WETH',e,data);
            return
        }
    }
    if(data.action == 'getLockTransData'){
        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createTransaction(data.parameters.tx.from,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,toGweiString(data.parameters.tx.gasPrice),crossType);
        sendTransaction.trans.setLockData();
        let lockDataResult = {};
        lockDataResult.lockTransData = sendTransaction.trans.trans.data;
        lockDataResult.secretX = sendTransaction.trans.Contract.key;
        data.value = lockDataResult;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getRefundTransData'){
        let crossType = (data.chainType == 'ETH') ? 'WETH2ETH' : 'ETH2WETH';
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
        sendTransaction.createRefundFromLockTransaction(data.parameters.tx.lockTxHash,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
            data.parameters.tx.cross,data.parameters.tx.gas,toGweiString(data.parameters.tx.gasPrice),crossType);
        sendTransaction.trans.setRefundData();
        let refundDataResult = {};
        refundDataResult.refundTransData = sendTransaction.trans.trans.data;
        refundDataResult.secretX = sendTransaction.trans.Contract.key;
        data.value = refundDataResult;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getRevokeTransData') {
        let sendTransaction = wanchainCore.createSendTransaction(data.chainType);

        let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
        sendTransaction.createTransaction(data.parameters.tx.from, tokenAddress, null, null,
            null, data.parameters.tx.gas, toGweiString(data.parameters.tx.gasPrice), crossType);
        sendTransaction.trans.setKey(data.parameters.tx.X);
        sendTransaction.trans.setRevokeData();

        let revokeDataResult = {};
        revokeDataResult.revokeTransData = sendTransaction.trans.trans.data;
        revokeDataResult.secretX = sendTransaction.trans.Contract.key;
        data.value = revokeDataResult;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'sendLockTrans'){
        data.parameters.tx.passwd = data.parameters.password;
        if(data.chainType == 'WAN'){
            // withdraw transaction.
            let cfgWeb3 = 'WAN';
            if(config.useLocalNode){
                cfgWeb3 = 'web3'
            }
            try {
                let sender = await be.getSenderbyChain(cfgWeb3);
                data.parameters.tx.value = '0x'+web3.toWei(web3.toBigNumber(data.parameters.tx.value)).trunc().toString(16);
                let txHash = await be.sendWanHash(sender, data.parameters.tx);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendLockTrans WAN: ", error);
                data.error = error.toString();
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }else {
            try {
                let sender = await be.getSenderbyChain("ETH");
                let txHash = await be.sendEthHash(sender, data.parameters.tx);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendDeposit: ", error);
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }
    }
    else if(data.action == 'sendRefundTrans'){
        let tx = data.parameters.tx;
        if(data.chainType == 'WAN'){
            let cfgWeb3 = 'WAN';
            if(config.useLocalNode){
                cfgWeb3 = 'web3'
            }
            try {
                let sender = await be.getSenderbyChain(cfgWeb3);
                let txHash = await be.sendDepositX(sender, tx.cross,tx.gas, tx.gasPrice, tx.X, data.parameters.password);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendDepositX: ", error);
                data.error = error.toString();
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }else {
            try {
                let sender = await be.getSenderbyChain("ETH");
                let txHash = await be.sendWanX(sender, tx.cross,tx.gas, tx.gasPrice, tx.X, data.parameters.password);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendWithdrawX: ", error);
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }


    }
    else if(data.action == 'sendRevokeTrans') {
        let tx = data.parameters.tx;
        if(data.chainType == 'WAN') {
            // withdraw transaction.
            let cfgWeb3 = 'WAN';
            if (config.useLocalNode) {
                cfgWeb3 = 'web3'
            }
            try {
                let sender = await be.getSenderbyChain(cfgWeb3);
                let txHash = await be.sendWanCancel(sender, tx.from,tx.gas, tx.gasPrice, tx.X, data.parameters.password);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendWithdrawCancel: ", error);
                data.error = error.toString();
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }else{
            try {
                let sender = await be.getSenderbyChain("ETH");
                let txHash = await be.sendEthCancel(sender, tx.from,tx.gas, tx.gasPrice, tx.X, data.parameters.password);
                data.value = txHash;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }catch(error){
                log.error("sendDepositCancel: ", error);
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH',e,data);
            }
        }
    }
    // else if(data.action == 'signLockTrans'){
    //     let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
    //     let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
    //     sendTransaction.createTransaction(data.parameters.tx.from,tokenAddress,data.parameters.tx.amount,data.parameters.tx.storemanGroup,
    //         data.parameters.tx.cross,data.parameters.tx.gas,toGweiString(data.parameters.tx.gasPrice),crossType);
    //     sendTransaction.trans.setKey(data.parameters.secretX);
    //     sendTransaction.trans.setLockData();
    //
    //     sendTransaction.getNonce(function () {
    //         // console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
    //         data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
    //         // console.log('signed trans : ',data.value);
    //         callbackMessage('CrossChain_ETH2WETH',e,data);
    //     });
    // }
    // else if(data.action == 'signRefundTrans'){
    //     let crossType = (data.chainType == 'ETH') ? 'WETH2ETH' : 'ETH2WETH';
    //     let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
    //     sendTransaction.createTransaction(data.parameters.tx.lockTxHash,tokenAddress,null,null,
    //         null,data.parameters.tx.gas,toGweiString(data.parameters.tx.gasPrice),crossType);
    //     sendTransaction.trans.setUnlockData();
    //     sendTransaction.getNonce(function () {
    //         // console.log('sendTransaction.trans : ',sendTransaction.trans.trans);
    //         data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
    //         // console.log('signed trans : ',data.value);
    //         callbackMessage('CrossChain_ETH2WETH',e,data);
    //     });
    // }
    // else if(data.action == 'signRevokeTrans') {
    //     let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
    //     let crossType = (data.chainType == 'ETH') ? 'ETH2WETH' : 'WETH2ETH';
    //     sendTransaction.createTransaction(data.parameters.tx.lockTxHash, tokenAddress, null, null,
    //         null, data.parameters.tx.gas, toGweiString(data.parameters.tx.gasPrice), crossType);
    //     sendTransaction.trans.setRefundData();
    //     sendTransaction.getNonce(function () {
    //         // console.log('sendTransaction.trans : ', sendTransaction.trans.trans);
    //         data.value = sendTransaction.trans.signFromKeystore(data.parameters.password);
    //         // console.log('signed trans : ', data.value);
    //         callbackMessage('CrossChain_ETH2WETH', e, data);
    //     });
    // }
    else if(data.action == 'listHistory'){
        let collection = wanchainCore.getCollection('crossTransDb','crossTransaction');
        let history = collection.chain().find({ 'from' : { '$in' : data.parameters.addrList } }).simplesort('time', true).data();
        data.value = history;
        // console.log("listHistory:", history);
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getGasPrice'){
        let result = {};
        if(data.chainType == 'ETH'){
            result.ethNormalGas = config.ethNormalGas;
            result.LockGas = config.ethLockGas;
            result.RefundGas = config.ethRefundGas;
            result.RevokeGas = config.ethRevokeGas;

        } else {
            result.LockGas = config.wanLockGas;
            result.RefundGas = config.wanRefundGas;
            result.RevokeGas = config.wanRevokeGas;
            data.value = result;
        }
        sendServer.sendMessage('getGasPrice',function(err, r){
            if(err){
                data.err = err;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }else{
                result.gasPrice = r;
                data.value = result;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
        });
    }
    else if(data.action == 'getAddressList'){
        if(data.chainType == 'ETH'){
            data.value = Object.keys(wanchainCore.EthKeyStoreDir.getAccounts());
        }
        else {
            data.value = Object.keys(wanchainCore.WanKeyStoreDir.getAccounts());
        }
        callbackMessage('CrossChain_ETH2WETH', e, data);
    }
    else if(data.action == 'sendRawTrans'){
        sendRawTransactions('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'sendNormalTransaction'){
        sendNormalTransaction('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getWethToken'){
        data.value = config.wethToken;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    }
    else if(data.action == 'getCoin2WanRatio'){
        try{
            let c2wRatio = await be.getEthC2wRatio(be.wanSender);
            data.value = c2wRatio;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }catch(error){
            data.error = error.error;
            callbackMessage('CrossChain_ETH2WETH', e, data);
        }
    }
    else if(data.action == 'getBalance'){
        if(data.chainType == 'ETH'){
            try{
                let balance = await be.getEthBalance(be.ethSender, data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }catch(error){
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
        }else{
            try{
                let balance = await be.getWanBalance(be.wanSender,data.parameters[0]);
                data.value = balance;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }catch(error){
                data.error = error.error;
                callbackMessage('CrossChain_ETH2WETH', e, data);
            }
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
            callbackMessage('CrossChain_ETH2WETH',e,data);
        });
        sendServer.sendMessage(data.action , ...args);
    }
});

function callbackMessage(message,e,data){
    const windowId = e.sender.id;
    const senderWindow = Windows.getById(windowId);
    senderWindow.send('Callback_'+message, data);
}

function sendRawTransactions(message,e,data) {
    let sendServer = (data.chainType == 'ETH') ? wanchainCore.ethSend : wanchainCore.wanSend;
    sendServer.sendRawTrans(data.parameters.tx,function (err,result) {
            data.error = err;
            data.value = result;
            callbackMessage(message,e,data);
        });
}
async function sendNormalTransaction(message,e,data) {
    let tx = data.parameters.tx;
    let sendTransaction = wanchainCore.createSendTransaction(data.chainType);
    sendTransaction.createNormalTransaction(tx.from,tx.to, tx.value,tx.gas,toGweiString(tx.gasPrice),tx.nonce);
    sendTransaction.sendNormalTrans(data.parameters.passwd, function(err,result){
        data.error = err;
        data.value = result;
        callbackMessage('CrossChain_ETH2WETH',e,data);
    });
}
async function init(){
    log.debug(config.socketUrl);
    wanchainCore = new WanchainCore(config);
    be = wanchainCore.be;
    log.debug('wait for wanchainCore.init...');
    await wanchainCore.init(config);
    log.debug('wanchainCore.init...finish!');
}
exports.init = init;

