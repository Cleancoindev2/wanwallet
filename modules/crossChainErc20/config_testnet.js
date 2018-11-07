"use strict";

const config = {};
const path = require('path');
const settings = require('../settings.js');

config.network = "testnet";
global.wanchain_js_testnet =  true;
config.socketUrl = 'wss://apitest.wanchain.info';

// log path
config.logPathPrex = path.join(settings.userDataPath,'log',config.network);

config.ccLog = path.join(config.logPathPrex, 'crossChainLog.log');
config.ccErr = path.join(config.logPathPrex, 'crossChainErr.log');
config.mrLog = path.join(config.logPathPrex, 'ccMonitorLog.log');
config.mrErr = path.join(config.logPathPrex, 'ccMonitorErr.log');

// db path
config.databasePathPrex = path.join(settings.userDataPath, 'Db',`${config.network}DB`);

// for E20 new contract
// config.ethHtlcAddrE20      = "0x905b3237b2367b2ddebdf54d4f5320429710850a";
// config.wanHtlcAddrE20      = "0x2b71a02033a5fdf20037aa184994a684a9229a15";

config.confirmBlocks            = 2;
config.tryTimes                 = 3;

module.exports = config;


