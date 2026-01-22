/**
 * ioBroker.bk215_local - src/protocol/constants.ts
 *
 * Protocol constants and field identifiers for bk215_local/BK215.
 */

/**
 * Generic dictionary type used for decoded device payloads.
 */
export type Dict = Record<string, any>;

/**
 * Device message codes (based on observed protocol).
 */
export const MessageCode = {
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
} as const;

/**
 * Response code meaning success (device returns this for each field in ACK data).
 */
export const RESPONSE_SUCCESS = 0;

/**
 * Value used by device for "unavailable".
 */
export const UNAVAILABLE_VALUE = 0xffff;

/**
 * Default TCP port.
 */
export const DEFAULT_PORT = 8000;

/**
 * Default timeout in seconds (connection / response).
 */
export const DEFAULT_TIMEOUT_SEC = 2;

/**
 * Value range limits for writable parameters.
 */
export const Limits = {
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
} as const;

/**
 * Device field identifiers (tXXX keys) used in JSON payloads.
 */
export const Field = {
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
} as const;

/**
 * Parsed message received from or sent to the BK215 device.
 */
export type DeviceMessage = {
	/**
	 * Message code identifying the message type.
	 */
	code: number;

	/**
	 * Optional payload data.
	 * Keys are device field identifiers (e.g. t363, t590).
	 */
	data?: Dict;
};
