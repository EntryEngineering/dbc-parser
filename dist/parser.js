"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseString = exports.parseFile = exports.isResultEmpty = void 0;
const const_1 = require("./const");
let result = {
    ecus: {},
    messages: {},
    defaults: {},
    valueTable: {},
    attributeDefs: {},
    info: {}
};
function isResultEmpty(res) {
    let empty = true;
    Object.values(res).forEach(value => {
        if (Object.keys(value).length > 0) {
            empty = false;
        }
    });
    return empty;
}
exports.isResultEmpty = isResultEmpty;
function parseFile(file) {
    result = {
        ecus: {},
        messages: {},
        defaults: {},
        valueTable: {},
        attributeDefs: {},
        info: {}
    };
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new DOMException("Problem parsing input file."));
        };
        reader.onload = () => {
            if (reader.result) {
                const dbc = parseString(reader.result.toString());
                if (isResultEmpty(dbc)) {
                    reject(new DOMException("Problem parsing input file."));
                }
                else {
                    resolve(dbc);
                }
            }
        };
        reader.readAsText(file, 'ISO-8859-15');
    });
}
exports.parseFile = parseFile;
function parseString(dbcString) {
    const lines = dbcString.split("\r\n");
    let state = const_1.DEFAULT;
    let message = {
        signals: {}
    };
    lines.forEach(line => {
        switch (state) {
            case const_1.DEFAULT:
                if (line.trim().startsWith("BU_: ")) {
                    let data = line.trim().split("BU_: ")[1].split(/\s+/);
                    data.forEach(e => {
                        let ecu = { name: e };
                        result.ecus[e] = ecu;
                    });
                }
                else if (line.trim().startsWith("BO_ ")) {
                    let messageData = line.split(/\s+/);
                    message.id = messageData[1];
                    message.name = messageData[2].split(":")[0];
                    message.dataLength = messageData[3];
                    message.sender = messageData[4];
                    message.signals = {};
                    state = const_1.MESSAGE_FOUND;
                }
                else if (line.trim().startsWith("BA_DEF_ ") || line.trim().startsWith("BA_DEF_REL_ ")) {
                    parseDEF(line);
                }
                else if (line.trim().startsWith("VAL_ ")) {
                    parseVAL(line);
                }
                else if (line.trim().startsWith("BA_ ")) {
                    parseBA(line);
                }
                else if (line.startsWith("BA_DEF_DEF_")) {
                    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
                    result.defaults[data[1]] = data[2];
                }
                else if (line.startsWith("BA_REL_ ")) {
                    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
                    result.messages[data[5]].signals[data[6]].receivers[data[3]][data[1]] = data[7];
                }
                else if (line.trim().startsWith("CM_ ")) {
                    parseCM(line);
                }
                break;
            case const_1.MESSAGE_FOUND:
                if (line.trim().startsWith("SG_")) {
                    const signal = parseSG(line);
                    signal.messageId = message.id;
                    if (message.signals)
                        message.signals[signal.name] = signal;
                }
                else {
                    state = const_1.DEFAULT;
                    if (message.id)
                        result.messages[message.id] = message;
                    message = {
                        signals: {}
                    };
                }
                break;
            default:
                break;
        }
    });
    return result;
}
exports.parseString = parseString;
function parseVAL(line) {
    const data = line.trim().replace(/;/g, "").split(/\s+/);
    const message = data[1];
    const signal = data[2];
    const values = data.slice(3).join(' ').split(/"\s/);
    if (!result.valueTable[message])
        result.valueTable[message] = {};
    if (!result.valueTable[message][signal])
        result.valueTable[message][signal] = {};
    for (let i = 0; i < (values.length - 1); i++) {
        const keyValue = values[i].split(/\s"/);
        result.valueTable[message][signal][keyValue[0]] = keyValue[1];
    }
}
function parseCM(line) {
    const data = line.trim().replace(/;/g, "").split(/"/);
    const message = data[1];
    const info = data[0].trim().split(/\s+/);
    switch (info[1]) {
        case "BU_":
            result.ecus[info[2]].Comment = message;
            break;
        case "BO_":
            result.messages[info[2]].Comment = message;
            break;
        case "SG_":
            result.messages[info[2]].signals[info[3]].Comment = message;
            break;
        default:
            break;
    }
}
function parseSG(line) {
    const signalData = line.split(":");
    const name = signalData[0].replace("SG_ ", "").trim().split(/\s+/);
    const signalInfo = signalData[1].trim().split(/\s+/);
    const bitInfo = signalInfo[0].split(/[|@]/);
    const factorOffset = signalInfo[1].split(/[(),]/);
    const minMax = signalInfo[2].split(/[|[\]]/);
    const unit = signalInfo[3].replace(/"/g, "");
    const receiversArray = signalInfo[4].split(",");
    const receivers = {};
    for (let i = 0; i < receiversArray.length; i++) {
        receivers[receiversArray[i]] = {};
    }
    const signal = {
        name: name[0],
        startBit: parseInt(bitInfo[0]),
        bitLength: parseInt(bitInfo[1]),
        byteOrder: bitInfo[2].charAt(0),
        byteType: bitInfo[2].charAt(1),
        factor: parseFloat(factorOffset[1]),
        offset: parseFloat(factorOffset[2]),
        min: parseFloat(minMax[1]),
        max: parseFloat(minMax[2]),
        unit: unit,
        receivers: receivers
    };
    if (name[1])
        signal.Multiplexing = name[1];
    return signal;
}
function parseBA(line) {
    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
    const attrName = data[1];
    let signalName = "";
    let value;
    let id = "";
    if (["BU_", "BO_"].includes(data[2])) {
        id = data[3];
        value = data[4];
    }
    else if (data[2] === "SG_") {
        id = data[3];
        signalName = data[4];
        value = data[5];
    }
    else {
        value = data[2];
    }
    const attrDef = result.attributeDefs[attrName];
    if (attrDef.type === "ENUM") {
        if (attrDef.enumValues)
            value = attrDef.enumValues[parseInt(value)];
    }
    switch (data[2]) {
        case "BU_":
            result.ecus[id][attrName] = value;
            break;
        case "BO_":
            result.messages[id][attrName] = value;
            break;
        case "SG_":
            result.messages[id].signals[signalName][attrName] = value;
            if (attrName === "GenSigStartValue") {
                result.messages[id].signals[signalName].initValue = result.messages[id].signals[signalName].offset + (result.messages[id].signals[signalName].factor * parseFloat(value));
            }
            break;
        default:
            result.info[attrName] = value;
            break;
    }
}
function parseDEF(line) {
    let data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
    const attribute = {};
    let valueStartIndex = 0;
    if (["BU_", "BO_", "SG_", "BU_SG_REL_"].includes(data[1])) {
        attribute.name = data[2];
        attribute.type = data[3];
        valueStartIndex = 4;
    }
    else {
        attribute.name = data[1];
        attribute.type = data[2];
        valueStartIndex = 3;
    }
    switch (attribute.type) {
        case "ENUM":
            attribute.enumValues = [];
            for (let i = valueStartIndex; i < data.length; i++) {
                attribute.enumValues.push(data[i]);
            }
            break;
        case "INT":
            attribute.min = data[valueStartIndex];
            attribute.max = data[valueStartIndex + 1];
            break;
        case "HEX":
            attribute.min = data[valueStartIndex];
            attribute.max = data[valueStartIndex + 1];
            break;
        default:
            break;
    }
    result.attributeDefs[attribute.name] = attribute;
}
