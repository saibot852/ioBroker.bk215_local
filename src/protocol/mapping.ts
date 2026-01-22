/**
 * ioBroker.bk215_local - src/protocol/mapping.ts
 *
 * Mapping between ioBroker state IDs and bk215_local device fields (tXXX keys).
 */

import { Field } from './constants';

/**
 * Map from writable ioBroker state IDs to device field IDs.
 */
export const WRITE_FIELD_MAP: Record<string, string> = {
	'config.system_discharge_limit': Field.SYSTEM_DISCHARGE_LIMIT,
	'config.system_charge_limit': Field.SYSTEM_CHARGE_LIMIT,
	'config.system_charging_power': Field.SYSTEM_CHARGING_POWER,
	'config.home_discharge_cutoff': Field.HOME_DISCHARGE_CUTOFF,
	'config.car_discharge_cutoff': Field.CAR_DISCHARGE_CUTOFF,
	'config.battery_charge_cutoff': Field.BATTERY_CHARGE_CUTOFF,
	'config.idle_shutdown_time': Field.IDLE_SHUTDOWN_TIME,
	'config.low_battery_shutdown_time': Field.LOW_BATTERY_SHUTDOWN_TIME,

	'modes.local_mode': Field.LOCAL_MODE,
	'modes.battery_charging_mode': Field.BATTERY_CHARGING_MODE,
	'modes.car_charging_mode': Field.CAR_CHARGING_MODE,
	'modes.home_appliance_mode': Field.HOME_APPLIANCE_MODE,
	'modes.ac_active_mode': Field.AC_ACTIVE_MODE,
};

/**
 * Read mapping entry type.
 */
export type ReadStateMapEntry = {
	/** ioBroker state ID */
	stateId: string;
	/** Device field key (tXXX) */
	field: string;
	/** Expected value type */
	type: 'number' | 'boolean';
};

/**
 * List of fields we read from DATA_REPORT messages and write into ioBroker states.
 */
export const READ_STATE_MAP: ReadStateMapEntry[] = [
	// Battery SOC
	{ stateId: 'status.overall_soc', field: Field.BATTERY_LEVEL, type: 'number' },
	{ stateId: 'status.main_soc', field: Field.HEAD_STORAGE, type: 'number' },
	{ stateId: 'status.slave1_soc', field: Field.EXPANSION_1, type: 'number' },
	{ stateId: 'status.slave2_soc', field: Field.EXPANSION_2, type: 'number' },
	{ stateId: 'status.slave3_soc', field: Field.EXPANSION_3, type: 'number' },
	{ stateId: 'status.slave4_soc', field: Field.EXPANSION_4, type: 'number' },
	{ stateId: 'status.slave5_soc', field: Field.EXPANSION_5, type: 'number' },
	{ stateId: 'status.slave6_soc', field: Field.EXPANSION_6, type: 'number' },
	{ stateId: 'status.slave7_soc', field: Field.EXPANSION_7, type: 'number' },

	// BMS / Hardware limits
	{ stateId: 'status.main_bms_min', field: Field.HEAD_HW_DISCHARGE_LIMIT, type: 'number' },
	{ stateId: 'status.main_bms_max', field: Field.HEAD_HW_CHARGE_LIMIT, type: 'number' },

	{ stateId: 'status.slave1_bms_min', field: Field.EXPANSION_1_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave1_bms_max', field: Field.EXPANSION_1_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave2_bms_min', field: Field.EXPANSION_2_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave2_bms_max', field: Field.EXPANSION_2_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave3_bms_min', field: Field.EXPANSION_3_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave3_bms_max', field: Field.EXPANSION_3_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave4_bms_min', field: Field.EXPANSION_4_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave4_bms_max', field: Field.EXPANSION_4_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave5_bms_min', field: Field.EXPANSION_5_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave5_bms_max', field: Field.EXPANSION_5_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave6_bms_min', field: Field.EXPANSION_6_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave6_bms_max', field: Field.EXPANSION_6_HW_CHARGE, type: 'number' },

	{ stateId: 'status.slave7_bms_min', field: Field.EXPANSION_7_HW_DISCHARGE, type: 'number' },
	{ stateId: 'status.slave7_bms_max', field: Field.EXPANSION_7_HW_CHARGE, type: 'number' },

	// Config values (some firmwares include them in reports)
	{ stateId: 'config.system_discharge_limit', field: Field.SYSTEM_DISCHARGE_LIMIT, type: 'number' },
	{ stateId: 'config.system_charge_limit', field: Field.SYSTEM_CHARGE_LIMIT, type: 'number' },
	{ stateId: 'config.system_charging_power', field: Field.SYSTEM_CHARGING_POWER, type: 'number' },
	{ stateId: 'config.home_discharge_cutoff', field: Field.HOME_DISCHARGE_CUTOFF, type: 'number' },
	{ stateId: 'config.car_discharge_cutoff', field: Field.CAR_DISCHARGE_CUTOFF, type: 'number' },
	{ stateId: 'config.battery_charge_cutoff', field: Field.BATTERY_CHARGE_CUTOFF, type: 'number' },
	{ stateId: 'config.idle_shutdown_time', field: Field.IDLE_SHUTDOWN_TIME, type: 'number' },
	{ stateId: 'config.low_battery_shutdown_time', field: Field.LOW_BATTERY_SHUTDOWN_TIME, type: 'number' },

	// Modes (some firmwares include them in reports)
	{ stateId: 'modes.local_mode', field: Field.LOCAL_MODE, type: 'boolean' },
	{ stateId: 'modes.battery_charging_mode', field: Field.BATTERY_CHARGING_MODE, type: 'boolean' },
	{ stateId: 'modes.car_charging_mode', field: Field.CAR_CHARGING_MODE, type: 'boolean' },
	{ stateId: 'modes.home_appliance_mode', field: Field.HOME_APPLIANCE_MODE, type: 'boolean' },
	{ stateId: 'modes.ac_active_mode', field: Field.AC_ACTIVE_MODE, type: 'boolean' },
];
