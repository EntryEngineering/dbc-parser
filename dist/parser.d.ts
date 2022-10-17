export declare type DbcParserResult = {
    ecus: EcuObj;
    messages: MessagesObj;
    defaults: DefaultsObj;
    valueTable: ValueTablesObj;
    attributeDefs: AttributeDefsObj;
    info: InfoObj;
};
export interface SignalsObj {
    [key: string]: SignalType;
}
export interface MessagesObj {
    [key: string]: MessageType;
}
export interface ReceiversObj {
    [key: string]: ReceiverType;
}
export interface EcuObj {
    [key: string]: EcuType;
}
export interface DefaultsObj {
    [key: string]: string;
}
export interface InfoObj {
    [key: string]: string | number;
}
export interface AttributeDefsObj {
    [key: string]: AttrDefType;
}
export interface ValueTablesObj {
    [key: string]: ValueTableType;
}
export declare type ValueTableType = {
    [key: string]: ValueTableItemType;
};
export declare type ValueTableItemType = {
    [key: string]: string;
};
export declare type EcuType = {
    name?: string;
    Comment?: string;
    ECUVariantDefault?: string;
    GenNodAutoGenDsp?: string;
    GenNodAutoGenSnd?: string;
    GenNodSleepTime?: number;
    ILUsed?: string;
    NmNode?: string;
    NmhNode?: string;
    NodeLayerModules?: number;
    [key: string]: any;
};
export declare type MessageType = {
    id?: string;
    name?: string;
    dataLength?: string;
    sender?: string;
    signals: SignalsObj;
    Comment?: string;
    DiagRequest?: string;
    DiagResponse?: string;
    DiagState?: string;
    GenMsgCycleTime?: number;
    GenMsgCycleTimeFast?: number;
    GenMsgDelayTime?: number;
    GenMsgILSupport?: string;
    GenMsgPDUConstants?: string;
    GenMsgSendType?: string;
    GenMsgStartDelayTime?: number;
    MsgType?: string;
    NmMessage?: string;
    NmhMessage?: string;
    VAGTP20_API?: number;
    VAGTP20_DynConnection?: string;
    VAGTP20_DynSetup?: string;
    VAGTP20_StatConnection?: string;
    [key: string]: any;
};
export declare type SignalType = {
    messageId?: string;
    name: string;
    startBit: number;
    bitLength: number;
    byteOrder: string;
    byteType: string;
    factor: number;
    offset: number;
    min: number;
    max: number;
    unit: string;
    receivers: ReceiversObj;
    Multiplexing?: string;
    Fehlerwert?: string;
    GenSigActiveRepetitions?: number;
    GenSigFuncType?: string;
    GenSigMissingSourceValue?: string;
    GenSigSendType?: string;
    GenSigStartValue?: number;
    GenSigSwitchedByIgnition?: string;
    "NWM-WakeupAllowed"?: string;
    initValue?: number;
    Comment?: string;
    [key: string]: any;
};
declare type ReceiverType = {
    [key: string]: string;
};
declare type AttrDefType = {
    name?: string;
    type?: string;
    enumValues?: string[];
    min?: string | number;
    max?: string | number;
};
export declare function parse(file: Blob): Promise<DbcParserResult>;
export declare function parseFromPath(filePath: string): Promise<void | DbcParserResult>;
export {};
