"use strict";
/**
 * ioBroker.bk215_local - src/protocol/mapping.ts
 *
 * Mapping between ioBroker state IDs and bk215_local device fields (tXXX keys).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.READ_STATE_MAP = exports.WRITE_FIELD_MAP = void 0;
const constants_1 = require("./constants");
/**
 * Map from writable ioBroker state IDs to device field IDs.
 */
exports.WRITE_FIELD_MAP = {
    'config.system_discharge_limit': constants_1.Field.SYSTEM_DISCHARGE_LIMIT,
    'config.system_charge_limit': constants_1.Field.SYSTEM_CHARGE_LIMIT,
    'config.system_charging_power': constants_1.Field.SYSTEM_CHARGING_POWER,
    'config.home_discharge_cutoff': constants_1.Field.HOME_DISCHARGE_CUTOFF,
    'config.car_discharge_cutoff': constants_1.Field.CAR_DISCHARGE_CUTOFF,
    'config.battery_charge_cutoff': constants_1.Field.BATTERY_CHARGE_CUTOFF,
    'config.idle_shutdown_time': constants_1.Field.IDLE_SHUTDOWN_TIME,
    'config.low_battery_shutdown_time': constants_1.Field.LOW_BATTERY_SHUTDOWN_TIME,
    'modes.local_mode': constants_1.Field.LOCAL_MODE,
    'modes.battery_charging_mode': constants_1.Field.BATTERY_CHARGING_MODE,
    'modes.car_charging_mode': constants_1.Field.CAR_CHARGING_MODE,
    'modes.home_appliance_mode': constants_1.Field.HOME_APPLIANCE_MODE,
    'modes.ac_active_mode': constants_1.Field.AC_ACTIVE_MODE,
};
const SOC_READ_MAP = [
    { stateId: 'status.overall_soc', field: constants_1.Field.BATTERY_LEVEL, type: 'number' },
    { stateId: 'status.main_soc', field: constants_1.Field.HEAD_STORAGE, type: 'number' },
    { stateId: 'status.slave1_soc', field: constants_1.Field.EXPANSION_1, type: 'number' },
    { stateId: 'status.slave2_soc', field: constants_1.Field.EXPANSION_2, type: 'number' },
    { stateId: 'status.slave3_soc', field: constants_1.Field.EXPANSION_3, type: 'number' },
    { stateId: 'status.slave4_soc', field: constants_1.Field.EXPANSION_4, type: 'number' },
    { stateId: 'status.slave5_soc', field: constants_1.Field.EXPANSION_5, type: 'number' },
    { stateId: 'status.slave6_soc', field: constants_1.Field.EXPANSION_6, type: 'number' },
    { stateId: 'status.slave7_soc', field: constants_1.Field.EXPANSION_7, type: 'number' },
];
const BMS_READ_MAP = [
    { stateId: 'status.main_bms_min', field: constants_1.Field.HEAD_HW_DISCHARGE_LIMIT, type: 'number' },
    { stateId: 'status.main_bms_max', field: constants_1.Field.HEAD_HW_CHARGE_LIMIT, type: 'number' },
    { stateId: 'status.slave1_bms_min', field: constants_1.Field.EXPANSION_1_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave1_bms_max', field: constants_1.Field.EXPANSION_1_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave2_bms_min', field: constants_1.Field.EXPANSION_2_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave2_bms_max', field: constants_1.Field.EXPANSION_2_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave3_bms_min', field: constants_1.Field.EXPANSION_3_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave3_bms_max', field: constants_1.Field.EXPANSION_3_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave4_bms_min', field: constants_1.Field.EXPANSION_4_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave4_bms_max', field: constants_1.Field.EXPANSION_4_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave5_bms_min', field: constants_1.Field.EXPANSION_5_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave5_bms_max', field: constants_1.Field.EXPANSION_5_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave6_bms_min', field: constants_1.Field.EXPANSION_6_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave6_bms_max', field: constants_1.Field.EXPANSION_6_HW_CHARGE, type: 'number' },
    { stateId: 'status.slave7_bms_min', field: constants_1.Field.EXPANSION_7_HW_DISCHARGE, type: 'number' },
    { stateId: 'status.slave7_bms_max', field: constants_1.Field.EXPANSION_7_HW_CHARGE, type: 'number' },
];
const CONFIG_READ_MAP = [
    { stateId: 'config.system_discharge_limit', field: constants_1.Field.SYSTEM_DISCHARGE_LIMIT, type: 'number' },
    { stateId: 'config.system_charge_limit', field: constants_1.Field.SYSTEM_CHARGE_LIMIT, type: 'number' },
    { stateId: 'config.system_charging_power', field: constants_1.Field.SYSTEM_CHARGING_POWER, type: 'number' },
    { stateId: 'config.home_discharge_cutoff', field: constants_1.Field.HOME_DISCHARGE_CUTOFF, type: 'number' },
    { stateId: 'config.car_discharge_cutoff', field: constants_1.Field.CAR_DISCHARGE_CUTOFF, type: 'number' },
    { stateId: 'config.battery_charge_cutoff', field: constants_1.Field.BATTERY_CHARGE_CUTOFF, type: 'number' },
    { stateId: 'config.idle_shutdown_time', field: constants_1.Field.IDLE_SHUTDOWN_TIME, type: 'number' },
    { stateId: 'config.low_battery_shutdown_time', field: constants_1.Field.LOW_BATTERY_SHUTDOWN_TIME, type: 'number' },
];
const MODE_READ_MAP = [
    { stateId: 'modes.local_mode', field: constants_1.Field.LOCAL_MODE, type: 'boolean' },
    { stateId: 'modes.battery_charging_mode', field: constants_1.Field.BATTERY_CHARGING_MODE, type: 'boolean' },
    { stateId: 'modes.car_charging_mode', field: constants_1.Field.CAR_CHARGING_MODE, type: 'boolean' },
    { stateId: 'modes.home_appliance_mode', field: constants_1.Field.HOME_APPLIANCE_MODE, type: 'boolean' },
    { stateId: 'modes.ac_active_mode', field: constants_1.Field.AC_ACTIVE_MODE, type: 'boolean' },
];
const POWER_READ_MAP = [
    { stateId: 'status.input_power_total', field: constants_1.Field.INPUTPOWER_TOTAL, type: 'number' },
    { stateId: 'status.output_power_total', field: constants_1.Field.OUTPUTPOWER_TOTAL, type: 'number' },
    { stateId: 'status.energy_generated_day', field: constants_1.Field.EEPC_DAY, type: 'number', transform: 'x0.001' },
    { stateId: 'status.energy_output_day', field: constants_1.Field.OUTPUTENERGY_DAY, type: 'number', transform: 'x0.001' },
    { stateId: 'status.ac_charge_energy_day', field: constants_1.Field.CP_AC_CHG_ENERGY_DAY, type: 'number', transform: 'x0.001' },
    { stateId: 'status.ac_input_power', field: constants_1.Field.CP_AC_INPUTPOWER, type: 'number' },
    { stateId: 'status.car_charging_power', field: constants_1.Field.CAR_CHG_MODE_POWER, type: 'number' },
    { stateId: 'status.home_mode_power', field: constants_1.Field.HOME_MODE_POWER, type: 'number' },
    { stateId: 'status.pv1_input_power', field: constants_1.Field.INPUTPOWER_PV1, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv2_input_power', field: constants_1.Field.INPUTPOWER_PV2, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv3_input_power', field: constants_1.Field.INPUTPOWER_PV3, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv4_input_power', field: constants_1.Field.INPUTPOWER_PV4, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv5_input_power', field: constants_1.Field.INPUTPOWER_PV5, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv6_input_power', field: constants_1.Field.INPUTPOWER_PV6, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv7_input_power', field: constants_1.Field.INPUTPOWER_PV7, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv8_input_power', field: constants_1.Field.INPUTPOWER_PV8, type: 'number', transform: 'x0.01' },
    { stateId: 'status.pv9_input_power', field: constants_1.Field.INPUTPOWER_PV9, type: 'number', transform: 'x0.01' },
];
const TEMP_READ_MAP = [
    { stateId: 'status.main_cell_temp', field: constants_1.Field.B_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave1_cell_temp', field: constants_1.Field.B1_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave2_cell_temp', field: constants_1.Field.B2_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave3_cell_temp', field: constants_1.Field.B3_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave4_cell_temp', field: constants_1.Field.B4_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave5_cell_temp', field: constants_1.Field.B5_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave6_cell_temp', field: constants_1.Field.B6_CELLTEMP, type: 'number', transform: 'temp273' },
    { stateId: 'status.slave7_cell_temp', field: constants_1.Field.B7_CELLTEMP, type: 'number', transform: 'temp273' },
];
const HEATER_READ_MAP = [
    { stateId: 'status.main_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 0 },
    { stateId: 'status.slave1_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 1 },
    { stateId: 'status.slave2_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 2 },
    { stateId: 'status.slave3_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 3 },
    { stateId: 'status.slave4_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 4 },
    { stateId: 'status.slave5_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 5 },
    { stateId: 'status.slave6_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 6 },
    { stateId: 'status.slave7_heater_active', field: constants_1.Field.HEATER_WORKING_STATUS, type: 'boolean', transform: 'bit', bit: 7 },
];
const MPPT_READ_MAP = [
    { stateId: 'status.main_mppt1_current', field: constants_1.Field.MBMS_MPPT1_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.main_mppt1_voltage', field: constants_1.Field.MBMS_MPPT1_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.main_mppt2_current', field: constants_1.Field.MBMS_MPPT2_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.main_mppt2_voltage', field: constants_1.Field.MBMS_MPPT2_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave1_mppt_current', field: constants_1.Field.SBMS1_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave1_mppt_voltage', field: constants_1.Field.SBMS1_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave2_mppt_current', field: constants_1.Field.SBMS2_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave2_mppt_voltage', field: constants_1.Field.SBMS2_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave3_mppt_current', field: constants_1.Field.SBMS3_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave3_mppt_voltage', field: constants_1.Field.SBMS3_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave4_mppt_current', field: constants_1.Field.SBMS4_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave4_mppt_voltage', field: constants_1.Field.SBMS4_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave5_mppt_current', field: constants_1.Field.SBMS5_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave5_mppt_voltage', field: constants_1.Field.SBMS5_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave6_mppt_current', field: constants_1.Field.SBMS6_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave6_mppt_voltage', field: constants_1.Field.SBMS6_MPPT_IN_V, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave7_mppt_current', field: constants_1.Field.SBMS7_MPPT_IN_I, type: 'number', transform: 'x0.1' },
    { stateId: 'status.slave7_mppt_voltage', field: constants_1.Field.SBMS7_MPPT_IN_V, type: 'number', transform: 'x0.1' },
];
const DIAGNOSTIC_READ_MAP = [
    { stateId: 'info.rssi', field: constants_1.Field.WIRELESS_NETWORK_RSSI, type: 'number' },
];
/**
 * List of fields we read from DATA_REPORT messages and write into ioBroker states.
 */
exports.READ_STATE_MAP = [
    ...SOC_READ_MAP,
    ...BMS_READ_MAP,
    ...CONFIG_READ_MAP,
    ...MODE_READ_MAP,
    ...POWER_READ_MAP,
    ...TEMP_READ_MAP,
    ...HEATER_READ_MAP,
    ...MPPT_READ_MAP,
    ...DIAGNOSTIC_READ_MAP,
];
