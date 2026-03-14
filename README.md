# ioBroker.bk215_local

Unofficial local TCP adapter for **BK215 energy storage systems (SunEnergy XT)**.

The adapter connects directly via the local network (LAN) to the BK215 device to read status data and set configuration values — **without any cloud dependency**.

---

## ⚠️ Disclaimer

This is **not an official adapter of the manufacturer**.  
There is **no affiliation or support** from the device manufacturer.

Use this adapter **at your own risk**.

---

## ✨ Features

- 📡 Local TCP connection to BK215 (LAN)
- 🔄 Automatic reconnect on connection loss
- 🔋 Reading of:
    - Overall state of charge (SOC)
    - Individual battery SOC (master + slaves)
    - BMS min/max limits
- ⚙️ Writing configuration values:
    - Charge / discharge limits
    - Charging power
    - Shutdown timers
- 🧠 ACK-based confirmation from the device
- 🟢 ioBroker status indication:
    - **Green:** Connected
    - **Yellow:** Adapter running, but not connected
    - **Red:** Connection error
    - supports BK215 extended data report `0x6060`
    - reconnects automatically after temporary offline states
    - parses SOC, BMS, power, energy, temperature and RSSI values

---

## 🔌 Requirements

- ioBroker **≥ 7.x**
- Node.js **≥ 18**
- BK215 device in the **same local network**
- Open TCP port (default: `8000`)

---

## 📥 Installation

### Via ioBroker Admin

1. Open ioBroker Admin
2. Search for **bk215_local**
3. Install the adapter
4. Create an instance

### Via CLI

iobroker add bk215_local

---

## ⚙️ Configuration

| Setting   | Description                                |
| --------- | ------------------------------------------ |
| Host      | IP address or hostname of the BK215 device |
| Port      | TCP port (default: `8000`)                 |
| Timeout   | Connection timeout in milliseconds         |
| Read-only | Disable all write operations               |
| Debug     | Enable extended debug logging              |

When **Read-only** is enabled, all writable states (`config.*`, `modes.*`) are set to read-only and no write commands are sent to the device.

---

## 📊 States / Data Points

### info.\*

| State           | Description                         |
| --------------- | ----------------------------------- |
| info.connection | Connection status (boolean)         |
| info.endpoint   | Active host:port                    |
| info.lastError  | Last connection or protocol error   |
| info.lastUpdate | Timestamp of last successful update |
| info.readOnly   | Read-only mode active               |

### status.\*

- overall_soc
- main_soc
- slaveX_soc
- main_bms_min / max
- slaveX_bms_min / max
- raw_message (debug only)

### config.\* (writable)

- system_discharge_limit
- system_charge_limit
- home_discharge_cutoff
- car_discharge_cutoff
- battery_charge_cutoff
- system_charging_power
- idle_shutdown_time
- low_battery_shutdown_time

### modes.\* (writable)

- local_mode
- battery_charging_mode
- car_charging_mode
- home_appliance_mode
- ac_active_mode

---

## 🔒 Security

- Communication is **unencrypted over LAN**
- Adapter is intended **for local networks only**
- No cloud communication
- No external data transfer

---

## 🐞 Debug / Troubleshooting

To enable debug logging:

1. Open the adapter instance configuration
2. Enable **Debug**
3. Restart the instance

When reporting issues, please include:

- Adapter version
- ioBroker version
- Debug log output
- Description of the problem

---

## 🛠️ Development

npm install  
npm run build  
npm run lint

---

## 📄 License

MIT License  
© Tobias
