import { DEFAULT, MESSAGE_FOUND } from "./const";

export type DbcParserResult = {
    ecus: EcuObj,
    messages: MessagesObj,
    defaults: DefaultsObj,
    valueTable: ValueTablesObj,
    attributeDefs: AttributeDefsObj,
    info: InfoObj
}

export interface SignalsObj {
    [key: string]: SignalType
}

export interface MessagesObj {
    [key: string]: MessageType
}

export interface ReceiversObj {
    [key: string]: ReceiverType
}

export interface EcuObj {
    [key: string]: EcuType
}

export interface DefaultsObj {
    [key: string]: string
}

export interface InfoObj {
    [key: string]: string | number
}

export interface AttributeDefsObj {
    [key: string]: AttrDefType
}

export interface ValueTablesObj {
    [key: string]: ValueTableType
}

export type ValueTableType = {
    [key: string]: ValueTableItemType
}

export type ValueTableItemType = {
    [key: string]: string
}

export type EcuType = {
    name?: string,
    Comment?: string,
    ECUVariantDefault?: string,
    GenNodAutoGenDsp?: string,
    GenNodAutoGenSnd?: string,
    GenNodSleepTime?: number
    ILUsed?: string,
    NmNode?: string,
    NmhNode?: string,
    NodeLayerModules?: number,
    [key: string]: any
}

export type MessageType = {
    id?: string
    name?: string
    dataLength?: string
    sender?: string
    signals: SignalsObj
    Comment?: string
    DiagRequest?: string
    DiagResponse?: string
    DiagState?: string
    GenMsgCycleTime?: number
    GenMsgCycleTimeFast?: number
    GenMsgDelayTime?: number
    GenMsgILSupport?: string
    GenMsgPDUConstants?: string
    GenMsgSendType?: string
    GenMsgStartDelayTime?: number
    MsgType?: string
    NmMessage?: string
    NmhMessage?: string
    VAGTP20_API?: number
    VAGTP20_DynConnection?: string
    VAGTP20_DynSetup?: string
    VAGTP20_StatConnection?: string
    [key: string]: any
}

export type SignalType = {
    messageId?: string
    name: string
    startBit: number
    bitLength: number
    byteOrder: string
    byteType: string
    factor: number
    offset: number
    min: number
    max: number
    unit: string
    receivers: ReceiversObj
    Multiplexing?: string
    Fehlerwert?: string
    GenSigActiveRepetitions?: number
    GenSigFuncType?: string
    GenSigMissingSourceValue?: string
    GenSigSendType?: string
    GenSigStartValue?: number
    GenSigSwitchedByIgnition?: string
    "NWM-WakeupAllowed"?: string
    initValue?: number
    Comment?: string
    [key: string]: any
}

type ReceiverType = {
    [key: string]: string
}

type AttrDefType = {
    name?: string
    type?: string
    enumValues?: string[]
    min?: string | number
    max?: string | number
}

let result: DbcParserResult = {
    ecus: {},
    messages: {},
    defaults: {},
    valueTable: {},
    attributeDefs: {},
    info: {}
};

function isResultEmpty(res: DbcParserResult): boolean {
    let empty = true;
    Object.values(res).forEach(value => {
        if (Object.keys(value).length > 0) {
            empty = false;
        }
    })
    return empty;
}

export function parse(file: Blob): Promise<DbcParserResult> {
    result = {
        ecus: {},
        messages: {},
        defaults: {},
        valueTable: {},
        attributeDefs: {},
        info: {}
    }
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new DOMException("Problem parsing input file."));
        };
        reader.onload = () => {
            if (reader.result) {
                const dbc: DbcParserResult = parseString(reader.result.toString());
                if (isResultEmpty(dbc)) {
                    reject(new DOMException("Problem parsing input file."));
                } else {
                    resolve(dbc);
                }
            }
        };
        reader.readAsText(file, 'ISO-8859-15');
    })
}

export async function parseFromPath(filePath: string) {
    let status = false;
    return fetch(filePath)
        .then((res) => {
            if (res.status < 400) return res.arrayBuffer();
            throw new Error(res.status + ": " + res.statusText);
        })
        .then((buffer) => {
            const decoder = new TextDecoder('iso-8859-15');
            const text = decoder.decode(buffer);
            status = true;
            const parsedResult = parseString(text);
            if (isResultEmpty(parsedResult)) {
                throw new Error("Parsing error");
            } else {
                return parsedResult;
            }
        })
        .catch((err) => {
            console.error("parseFromPath" + err);
        });
}

function parseString(dbcString: string) {
    const lines = dbcString.split("\r\n");
    let state = DEFAULT;
    let message: MessageType = {
        signals: {}
    };
    lines.forEach(line => {
        switch (state) {
            case DEFAULT:
                if (line.trim().startsWith("BU_: ")) {
                    let data = line.trim().split("BU_: ")[1].split(/\s+/);
                    data.forEach(e => {
                        let ecu: EcuType = { name: e };
                        result.ecus[e] = ecu;
                    })
                } else if (line.trim().startsWith("BO_ ")) {
                    let messageData = line.split(/\s+/);
                    message.id = messageData[1];
                    message.name = messageData[2].split(":")[0];
                    message.dataLength = messageData[3];
                    message.sender = messageData[4];
                    message.signals = {};
                    state = MESSAGE_FOUND;
                } else if (line.trim().startsWith("BA_DEF_ ") || line.trim().startsWith("BA_DEF_REL_ ")) {
                    parseDEF(line);
                } else if (line.trim().startsWith("VAL_ ")) {
                    parseVAL(line);
                } else if (line.trim().startsWith("BA_ ")) {
                    parseBA(line);
                } else if (line.startsWith("BA_DEF_DEF_")) {
                    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
                    result.defaults[data[1]] = data[2];
                } else if (line.startsWith("BA_REL_ ")) {
                    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
                    result.messages[data[5]].signals[data[6]].receivers[data[3]][data[1]] = data[7];
                } else if (line.trim().startsWith("CM_ ")) {
                    parseCM(line);
                }
                break;
            case MESSAGE_FOUND:
                if (line.trim().startsWith("SG_")) {
                    const signal: SignalType = parseSG(line);
                    signal.messageId = message.id;
                    if (message.signals) message.signals[signal.name] = signal;
                } else {
                    state = DEFAULT;
                    if (message.id) result.messages[message.id] = message;
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

function parseVAL(line: string) {
    const data = line.trim().replace(/;/g, "").split(/\s+/);
    const message = data[1];
    const signal = data[2];
    const values = data.slice(3).join(' ').split(/"\s/);
    if (!result.valueTable[message]) result.valueTable[message] = {};
    if (!result.valueTable[message][signal]) result.valueTable[message][signal] = {};
    for (let i = 0; i < (values.length - 1); i++) {
        const keyValue = values[i].split(/\s"/);
        result.valueTable[message][signal][keyValue[0]] = keyValue[1];
    }
}

function parseCM(line: string) {
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

function parseSG(line: string): SignalType {
    const signalData = line.split(":");
    const name = signalData[0].replace("SG_ ", "").trim().split(/\s+/);
    const signalInfo = signalData[1].trim().split(/\s+/);
    const bitInfo = signalInfo[0].split(/[|@]/);
    const factorOffset = signalInfo[1].split(/[(),]/);
    const minMax = signalInfo[2].split(/[|[\]]/);
    const unit = signalInfo[3].replace(/"/g, "");
    const receiversArray = signalInfo[4].split(",");
    const receivers: ReceiversObj = {};
    for (let i = 0; i < receiversArray.length; i++) {
        receivers[receiversArray[i]] = {}
    }
    const signal: SignalType = {
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
    }
    if (name[1]) signal.Multiplexing = name[1];
    return signal;
}

function parseBA(line: string) {
    const data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
    const attrName = data[1];
    let signalName = "";
    let value: string;
    let id = "";
    if (["BU_", "BO_"].includes(data[2])) {
        id = data[3];
        value = data[4];
    } else if (data[2] === "SG_") {
        id = data[3];
        signalName = data[4];
        value = data[5];
    } else {
        value = data[2];
    }

    const attrDef = result.attributeDefs[attrName];
    if (attrDef.type === "ENUM") {
        if (attrDef.enumValues) value = attrDef.enumValues[parseInt(value)];
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

function parseDEF(line: string) {
    let data = line.trim().replace(/"|,|;/g, "").split(/\s+/);
    const attribute: AttrDefType = {};
    let valueStartIndex = 0;
    if (["BU_", "BO_", "SG_", "BU_SG_REL_"].includes(data[1])) {
        attribute.name = data[2];
        attribute.type = data[3];
        valueStartIndex = 4;
    } else {
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
