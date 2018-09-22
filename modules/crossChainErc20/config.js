"use strict";

const settings=require('../settings.js');
const Logger = require('./logger.js');
const path = require('path');
const fs = require('fs');
let config;
if(settings.network === 'testnet'){
    config = require('./config_testnet.js');
}else {
    config = require('./config_main.js');
}
config.version = '1.0.0';
config.host = '// http://localhost'; // http://localhost
config.rpcIpcPath = settings.rpcIpcPath;


config.keyStorePath = settings.getKeystoreDir('wanchain');
config.ethkeyStorePath = settings.getKeystoreDir('ethereum');


config.useLocalNode = true;

config.loglevel = settings.loglevel;

config.listOption = true;

function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}
mkdirsSync(config.databasePath);
config.logger = new Logger('CrossChain',config.ccLog, config.ccErr,config.loglevel);
config.getLogger = function(name){
    return new Logger(name,config.ccLog, config.ccErr,config.loglevel);
}
config.wanKeyStorePath = config.keyStorePath;
config.ethKeyStorePath = config.ethkeyStorePath;

config.ethGasPrice = 60;
config.wanGasPrice = 200;
config.ethNormalGas = 21000;
config.ethLockGas = 300000; //200850;
config.ethRefundGas = 200000;  // 91663;
config.ethRevokeGas = 200000; // 40323;

config.wanLockGas = 300000; // 232665;
config.wanRefundGas = 200000; // 34881;
config.wanRevokeGas = 200000; // 49917;

// config.depositOriginLockEvent = 'ETH2WETHLock(address,address,bytes32,uint256,address)';
// config.depositCrossLockEvent = 'ETH2WETHLock(address,address,bytes32,uint256)';
//
// config.withdrawOriginLockEvent = 'WETH2ETHLock(address,address,bytes32,uint256,address,uint256)';
// config.withdrawCrossLockEvent = 'WETH2ETHLock(address,address,bytes32,uint256)';
//
//
// config.depositOriginRefundEvent = 'ETH2WETHRefund(address,address,bytes32,bytes32)';
// config.withdrawOriginRefundEvent = 'WETH2ETHRefund(address,address,bytes32,bytes32)';
//
// config.depositOriginRevokeEvent = 'ETH2WETHRevoke(address,bytes32)';
// config.withdrawOriginRevokeEvent = 'WETH2ETHRevoke(address,bytes32)';


// inbound storemengroup lock event  ETH->WAN
config.inStgLockEvent       = 'ETH2WETHLock(address,address,bytes32,uint256)';
// outbound storemengroup lock event  WAN->ETH
config.outStgLockEvent      = 'WETH2ETHLock(address,address,bytes32,uint256)';

// inbound storemengroup lock event  E20->WAN
//storemanGroup,wanAddr,xHash,value,tokenOrigAddr
config.inStgLockEventE20    = 'InboundLockLogger(address,address,bytes32,uint256,address)';
// outbound storemengroup lock event  WAN->E20
//storemanGroup,user,xHash,value,tokenOrigAddr
config.outStgLockEventE20   = 'OutboundLockLogger(address,address,bytes32,uint256,address)';


// config.crossDbname = 'crossTransDb';
// config.crossCollection = 'crossTransaction';

config.crossDbname              = 'crossTransDb2.1';
config.crossCollection          = 'crossTrans';             // E20 & ETH
config.crossCollectionBtc       = 'crossTransBtc';



config.consoleColor = {
    'COLOR_FgRed': '\x1b[31m',
    'COLOR_FgYellow': '\x1b[33m',
    'COLOR_FgGreen': "\x1b[32m"
};

module.exports = config;
