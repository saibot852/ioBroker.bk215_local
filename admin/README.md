# bk215_local Adapter

Local TCP adapter for BK215 energy storage systems.

## Configuration

- **Host**  
  IP address or hostname of the BK215 device.

- **Port**  
  TCP port of the BK215 device (default: 8000).

- **Timeout**  
  Connection timeout in milliseconds.

- **Read-only**  
  If enabled, all write operations are disabled.  
  Writable states (`config.*`, `modes.*`) will be set to read-only.

- **Debug**  
  Enables extended debug logging.

## Notes

- The adapter communicates **locally via TCP**.
- No cloud connection is used.
- Communication is **unencrypted** and intended for **local networks only**.

## Support

For issues or feature requests, please use the GitHub repository.
