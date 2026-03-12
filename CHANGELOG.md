## 1.0.1
- Fix: TCP client formatting & lint issues
- Fix: stable interval handling
## 1.0.2
- improved reconnect handling after device offline
- ignore invalid device values (-1)
- added PV and MPPT data support
- rounded numeric values to max. one decimal place
- parser improvements
## 1.0.3
- added support for extended data report `0x6060`
- fixed temperature decoding for `TEMP273`
- improved reconnect handling after temporary disconnects
- ignore invalid values like `-1`
- extended BK215 state support (energy, RSSI, temperatures, heater status)
