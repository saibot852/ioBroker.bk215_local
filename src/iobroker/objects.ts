/**
 * Object/state creation helpers for ioBroker.bk215_local
 */

async function ensureNumber(
	adapter: ioBroker.Adapter,
	id: string,
	name: string,
	role: string,
	unit?: string,
	write = false,
	min?: number,
	max?: number,
	step?: number,
	def?: number,
): Promise<void> {
	await adapter.setObjectNotExistsAsync(id, {
		type: 'state',
		common: {
			name,
			type: 'number',
			role,
			read: true,
			write,
			...(unit ? { unit } : {}),
			...(min !== undefined ? { min } : {}),
			...(max !== undefined ? { max } : {}),
			...(step !== undefined ? { step } : {}),
			...(def !== undefined ? { def } : {}),
		},
		native: {},
	});
}

async function ensureBool(adapter: ioBroker.Adapter, id: string, name: string, write = false): Promise<void> {
	await adapter.setObjectNotExistsAsync(id, {
		type: 'state',
		common: {
			name,
			type: 'boolean',
			role: write ? 'switch.enable' : 'indicator',
			read: true,
			write,
		},
		native: {},
	});
}

async function ensureText(
	adapter: ioBroker.Adapter,
	id: string,
	name: string,
	write = false,
	role = 'text',
): Promise<void> {
	await adapter.setObjectNotExistsAsync(id, {
		type: 'state',
		common: {
			name,
			type: 'string',
			role,
			read: true,
			write,
		},
		native: {},
	});
}

async function ensureChannel(adapter: ioBroker.Adapter, id: string, name: string): Promise<void> {
	await adapter.setObjectNotExistsAsync(id, {
		type: 'channel',
		common: { name },
		native: {},
	});
}

async function ensureBatterySocStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'status.overall_soc', 'Overall SOC', 'value.battery', '%');
	await ensureNumber(adapter, 'status.main_soc', 'Main battery SOC', 'value.battery', '%');

	for (let i = 1; i <= 7; i++) {
		await ensureNumber(adapter, `status.slave${i}_soc`, `Slave ${i} SOC`, 'value.battery', '%');
	}
}

async function ensureBmsLimitStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'status.main_bms_min', 'Main BMS min limit', 'value', '%');
	await ensureNumber(adapter, 'status.main_bms_max', 'Main BMS max limit', 'value', '%');

	for (let i = 1; i <= 7; i++) {
		await ensureNumber(adapter, `status.slave${i}_bms_min`, `Slave ${i} BMS min`, 'value', '%');
		await ensureNumber(adapter, `status.slave${i}_bms_max`, `Slave ${i} BMS max`, 'value', '%');
	}
}

async function ensureConfigStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(
		adapter,
		'config.system_discharge_limit',
		'System discharge limit (min SOC)',
		'level',
		'%',
		true,
		1,
		20,
		1,
	);

	await ensureNumber(
		adapter,
		'config.system_charge_limit',
		'System charge limit (max SOC)',
		'level',
		'%',
		true,
		70,
		100,
		1,
	);

	await ensureNumber(adapter, 'config.home_discharge_cutoff', 'Home discharge cutoff', 'level', '%', true, 5, 20, 1);
	await ensureNumber(adapter, 'config.car_discharge_cutoff', 'Car discharge cutoff', 'level', '%', true, 5, 40, 1);
	await ensureNumber(
		adapter,
		'config.battery_charge_cutoff',
		'Battery charge cutoff',
		'level',
		'%',
		true,
		80,
		100,
		1,
	);
	await ensureNumber(
		adapter,
		'config.system_charging_power',
		'System charging power',
		'level',
		'W',
		true,
		0,
		3600,
		1,
	);
	await ensureNumber(adapter, 'config.idle_shutdown_time', 'Idle shutdown time', 'level', 'min', true, 15, 1440, 1);
	await ensureNumber(
		adapter,
		'config.low_battery_shutdown_time',
		'Low battery shutdown time',
		'level',
		'min',
		true,
		5,
		1440,
		1,
	);
}

async function ensureModeStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureBool(adapter, 'modes.local_mode', 'Local mode', true);
	await ensureBool(adapter, 'modes.battery_charging_mode', 'Battery charging mode', true);
	await ensureBool(adapter, 'modes.car_charging_mode', 'Car charging mode', true);
	await ensureBool(adapter, 'modes.home_appliance_mode', 'Home appliance mode', true);
	await ensureBool(adapter, 'modes.ac_active_mode', 'AC active mode', true);
}

async function ensureEnergyStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'status.input_power_total', 'Total input power', 'value.power', 'W');
	await ensureNumber(adapter, 'status.output_power_total', 'Total output power', 'value.power', 'W');

	await ensureNumber(adapter, 'status.energy_generated_day', 'Generated energy today', 'value.energy', 'kWh');
	await ensureNumber(adapter, 'status.energy_output_day', 'Output energy today', 'value.energy', 'kWh');
	await ensureNumber(adapter, 'status.ac_charge_energy_day', 'AC charge energy today', 'value.energy', 'kWh');

	await ensureNumber(adapter, 'status.ac_input_power', 'AC input power', 'value.power', 'W');
	await ensureNumber(adapter, 'status.car_charging_power', 'Car charging mode power', 'value.power', 'W');
	await ensureNumber(adapter, 'status.home_mode_power', 'Home appliance mode power', 'value.power', 'W');
}

async function ensurePvStates(adapter: ioBroker.Adapter): Promise<void> {
	for (let i = 1; i <= 9; i++) {
		await ensureNumber(adapter, `status.pv${i}_input_power`, `PV${i} input power`, 'value.power', 'W');
	}
}

async function ensureTemperatureStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'status.main_cell_temp', 'Main battery cell temperature', 'value.temperature', '°C');

	for (let i = 1; i <= 7; i++) {
		await ensureNumber(
			adapter,
			`status.slave${i}_cell_temp`,
			`Slave ${i} cell temperature`,
			'value.temperature',
			'°C',
		);
	}
}

async function ensureMpptStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'status.main_mppt1_current', 'Main MPPT1 current', 'value.current', 'A');
	await ensureNumber(adapter, 'status.main_mppt1_voltage', 'Main MPPT1 voltage', 'value.voltage', 'V');
	await ensureNumber(adapter, 'status.main_mppt2_current', 'Main MPPT2 current', 'value.current', 'A');
	await ensureNumber(adapter, 'status.main_mppt2_voltage', 'Main MPPT2 voltage', 'value.voltage', 'V');

	for (let i = 1; i <= 7; i++) {
		await ensureNumber(adapter, `status.slave${i}_mppt_current`, `Slave ${i} MPPT current`, 'value.current', 'A');
		await ensureNumber(adapter, `status.slave${i}_mppt_voltage`, `Slave ${i} MPPT voltage`, 'value.voltage', 'V');
	}
}

async function ensureHeaterStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureBool(adapter, 'status.main_heater_active', 'Main battery heater active');

	for (let i = 1; i <= 7; i++) {
		await ensureBool(adapter, `status.slave${i}_heater_active`, `Slave ${i} heater active`);
	}
}

async function ensureDiagnosticStates(adapter: ioBroker.Adapter): Promise<void> {
	await ensureNumber(adapter, 'info.lastUpdate', 'Last update', 'value.time');
	await ensureText(adapter, 'info.lastError', 'Last error');
	await ensureText(adapter, 'info.endpoint', 'Endpoint');
	await ensureBool(adapter, 'info.connection', 'Connection');
	await ensureBool(adapter, 'info.readOnly', 'Read-only');
	await ensureNumber(adapter, 'info.rssi', 'Wireless RSSI', 'value.signal', 'dB');
	await ensureText(adapter, 'status.raw_message', 'Last raw message');
}

/**
 * Ensures all required objects/states exist in ioBroker.
 *
 * @param adapter The adapter instance
 */
export async function ensureObjects(adapter: ioBroker.Adapter): Promise<void> {
	await ensureChannel(adapter, 'info', 'Info');
	await ensureChannel(adapter, 'status', 'Status');
	await ensureChannel(adapter, 'config', 'Configuration');
	await ensureChannel(adapter, 'modes', 'Modes');

	await ensureDiagnosticStates(adapter);
	await ensureBatterySocStates(adapter);
	await ensureBmsLimitStates(adapter);
	await ensureConfigStates(adapter);
	await ensureModeStates(adapter);
	await ensureEnergyStates(adapter);
	await ensurePvStates(adapter);
	await ensureTemperatureStates(adapter);
	await ensureMpptStates(adapter);
	await ensureHeaterStates(adapter);
}
