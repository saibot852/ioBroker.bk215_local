"use strict";
/**
 * ioBroker.bk215_local - src/protocol/constants.ts
 *
 * Protocol constants and field identifiers for bk215_local/BK215.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Field = exports.Limits = exports.DEFAULT_TIMEOUT_SEC = exports.DEFAULT_PORT = exports.UNAVAILABLE_VALUE = exports.RESPONSE_SUCCESS = exports.MessageCode = void 0;
/**
 * Device message codes (based on observed protocol).
 */
exports.MessageCode = {
    /**
     * Device sends status data reports with this code.
     */
    DATA_REPORT: 0x6052,
    /**
     * Some firmwares use an alternate data report code.
     */
    DATA_REPORT_ALT: 0x6053,
    /**
     * Client command wrapper for setting values.
     */
    COMMAND_SET: 0x1000,
    /**
     * Device ACK for handshake and commands.
     */
    RESPONSE_ACK: 0,
};
/**
 * Response code meaning success (device returns this for each field in ACK data).
 */
exports.RESPONSE_SUCCESS = 0;
/**
 * Value used by device for "unavailable".
 */
exports.UNAVAILABLE_VALUE = 0xffff;
/**
 * Default TCP port.
 */
exports.DEFAULT_PORT = 8000;
/**
 * Default timeout in seconds (connection / response).
 */
exports.DEFAULT_TIMEOUT_SEC = 2;
/**
 * Value range limits for writable parameters.
 */
exports.Limits = {
    MIN_DISCHARGE_SOC_MIN: 1,
    MIN_DISCHARGE_SOC_MAX: 20,
    MAX_CHARGE_SOC_MIN: 70,
    MAX_CHARGE_SOC_MAX: 100,
    HOME_APPLIANCE_MIN_SOC_MIN: 5,
    HOME_APPLIANCE_MIN_SOC_MAX: 20,
    EV_CHARGING_MIN_SOC_MIN: 5,
    EV_CHARGING_MIN_SOC_MAX: 40,
    CHARGING_MAX_SOC_MIN: 80,
    CHARGING_MAX_SOC_MAX: 100,
    SYSTEM_CHARGING_POWER_MIN: 0,
    SYSTEM_CHARGING_POWER_MAX: 3600,
    NO_IO_SHUTDOWN_TIMEOUT_MIN: 15,
    NO_IO_SHUTDOWN_TIMEOUT_MAX: 1440,
    DOD_SHUTDOWN_TIMEOUT_MIN: 5,
    DOD_SHUTDOWN_TIMEOUT_MAX: 1440,
};
/**
 * Device field identifiers (tXXX keys) used in JSON payloads.
 */
exports.Field = {
    // Modes (Read/Write)
    LOCAL_MODE: 't598',
    BATTERY_CHARGING_MODE: 't700_1',
    CAR_CHARGING_MODE: 't701_1',
    HOME_APPLIANCE_MODE: 't702_1',
    AC_ACTIVE_MODE: 't728',
    // System configuration (Read/Write)
    SYSTEM_DISCHARGE_LIMIT: 't362',
    SYSTEM_CHARGE_LIMIT: 't363',
    HOME_DISCHARGE_CUTOFF: 't720',
    CAR_DISCHARGE_CUTOFF: 't721',
    BATTERY_CHARGE_CUTOFF: 't727',
    SYSTEM_CHARGING_POWER: 't590',
    IDLE_SHUTDOWN_TIME: 't596',
    LOW_BATTERY_SHUTDOWN_TIME: 't597',
    // Battery SOC (Read-Only)
    BATTERY_LEVEL: 't211',
    HEAD_STORAGE: 't592',
    EXPANSION_1: 't593',
    EXPANSION_2: 't594',
    EXPANSION_3: 't595',
    EXPANSION_4: 't1001',
    EXPANSION_5: 't1002',
    EXPANSION_6: 't1003',
    EXPANSION_7: 't1004',
    // Hardware limits / BMS (Read-Only)
    HEAD_HW_DISCHARGE_LIMIT: 't507',
    HEAD_HW_CHARGE_LIMIT: 't508',
    EXPANSION_1_HW_DISCHARGE: 't509',
    EXPANSION_1_HW_CHARGE: 't510',
    EXPANSION_2_HW_DISCHARGE: 't511',
    EXPANSION_2_HW_CHARGE: 't512',
    EXPANSION_3_HW_DISCHARGE: 't513',
    EXPANSION_3_HW_CHARGE: 't514',
    EXPANSION_4_HW_DISCHARGE: 't948',
    EXPANSION_4_HW_CHARGE: 't949',
    EXPANSION_5_HW_DISCHARGE: 't950',
    EXPANSION_5_HW_CHARGE: 't951',
    EXPANSION_6_HW_DISCHARGE: 't952',
    EXPANSION_6_HW_CHARGE: 't953',
    EXPANSION_7_HW_DISCHARGE: 't954',
    EXPANSION_7_HW_CHARGE: 't955',
    // Power / energy (Read-Only)
    INPUTPOWER_TOTAL: 't33',
    OUTPUTPOWER_TOTAL: 't34',
    EEPC_DAY: 't49',
    OUTPUTENERGY_DAY: 't66',
    CP_AC_CHG_ENERGY_DAY: 't710',
    CP_AC_INPUTPOWER: 't711',
    CAR_CHG_MODE_POWER: 't701_4',
    HOME_MODE_POWER: 't702_4',
    // PV input power (Read-Only)
    INPUTPOWER_PV1: 't50',
    INPUTPOWER_PV2: 't62',
    INPUTPOWER_PV3: 't63',
    INPUTPOWER_PV4: 't64',
    INPUTPOWER_PV5: 't65',
    INPUTPOWER_PV6: 't812',
    INPUTPOWER_PV7: 't813',
    INPUTPOWER_PV8: 't814',
    INPUTPOWER_PV9: 't815',
    // Cell temperatures (Read-Only)
    B_CELLTEMP: 't220',
    B1_CELLTEMP: 't233',
    B2_CELLTEMP: 't246',
    B3_CELLTEMP: 't259',
    B4_CELLTEMP: 't836',
    B5_CELLTEMP: 't849',
    B6_CELLTEMP: 't862',
    B7_CELLTEMP: 't875',
    // Heater status bitfield (Read-Only)
    HEATER_WORKING_STATUS: 't586',
    // MPPT input current / voltage (Read-Only)
    MBMS_MPPT1_IN_I: 't537',
    MBMS_MPPT1_IN_V: 't536',
    MBMS_MPPT2_IN_I: 't545',
    MBMS_MPPT2_IN_V: 't544',
    SBMS1_MPPT_IN_I: 't553',
    SBMS1_MPPT_IN_V: 't552',
    SBMS2_MPPT_IN_I: 't561',
    SBMS2_MPPT_IN_V: 't560',
    SBMS3_MPPT_IN_I: 't569',
    SBMS3_MPPT_IN_V: 't568',
    SBMS4_MPPT_IN_I: 't970',
    SBMS4_MPPT_IN_V: 't969',
    SBMS5_MPPT_IN_I: 't978',
    SBMS5_MPPT_IN_V: 't977',
    SBMS6_MPPT_IN_I: 't986',
    SBMS6_MPPT_IN_V: 't985',
    SBMS7_MPPT_IN_I: 't994',
    SBMS7_MPPT_IN_V: 't993',
    // Diagnostics
    WIRELESS_NETWORK_RSSI: 't475',
};
