# API Documentation

We also got us a REST API!

It does all the same network calculations and IP address operations as the frontend tools and uses the same logic, but just in a machine-readable way.

You can get the OpenAPI spec from our [swagger.yml](https://github.com/Lissy93/networking-toolbox/blob/main/swagger.yaml), or view the [API Docs](https://networkingtoolbox.net/api-docs.html) on our public instance.

## Base URL

```
https://networkingtoolbox.net
```

> [!NOTE]
> The base URL shown above is for the public instance. If you're self-hosting, replace this with your own deployment URL (e.g., `http://localhost:5173` for local development or your custom domain).

The API follows standard HTTP conventions.
And all endpoints accept JSON payloads and return JSON responses.

## Authentication
None required. The API is completely open.

## CORS
None required. The API can be called from any origin. Go wild!

## Response Format

All responses follow a standard structure:

```json
{
  "success": true,
  "tool": "endpoint-name",
  "result": {
    // endpoint-specific data
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error description",
  "tool": "endpoint-name"
}
```

## Rate Limits
Rate-limiting on the public instance applies after a threshold to prevent abuse (currently, 10 reqs per min and 420 per day).<br>
But there's a simple work around- just see the Self-Hosting docs!

## Endpoints

### Overview

<kbd>GET</kbd> `/api`

Returns information about all available endpoints.

### Subnetting

Calculate detailed subnet information for IPv4 and IPv6 networks.

<details>
<summary><kbd>POST</kbd> /api/subnetting/ipv4-subnet-calculator</summary>

Calculates comprehensive IPv4 subnet information.

**Request:**
```json
{
  "cidr": "192.168.1.0/24"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "ipv4-subnet-calculator",
  "result": {
    "network": "192.168.1.0",
    "broadcast": "192.168.1.255",
    "subnetMask": "255.255.255.0",
    "wildcardMask": "0.0.0.255",
    "prefixLength": 24,
    "totalHosts": 256,
    "usableHosts": 254,
    "firstUsable": "192.168.1.1",
    "lastUsable": "192.168.1.254",
    "networkClass": "C"
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/subnetting/ipv6-subnet-calculator</summary>

Calculates comprehensive IPv6 subnet information.

**Request:**
```json
{
  "cidr": "2001:db8::/64"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "ipv6-subnet-calculator",
  "result": {
    "network": "2001:db8::",
    "prefixLength": 64,
    "totalAddresses": "18446744073709551616",
    "firstAddress": "2001:db8::",
    "lastAddress": "2001:db8::ffff:ffff:ffff:ffff",
    "expanded": "2001:0db8:0000:0000:0000:0000:0000:0000/64"
  }
}
```

</details>

### CIDR Operations

Tools for CIDR notation conversion and manipulation.

<details>
<summary><kbd>POST</kbd> /api/cidr/cidr-to-subnet-mask</summary>

Converts CIDR prefix to subnet mask.

**Request:**
```json
{
  "prefix": 24
}
```

**Response:**
```json
{
  "success": true,
  "tool": "cidr-to-subnet-mask",
  "result": {
    "mask": "255.255.255.0"
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/cidr/subnet-mask-to-cidr</summary>

Converts subnet mask to CIDR prefix.

**Request:**
```json
{
  "mask": "255.255.255.0"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "subnet-mask-to-cidr",
  "result": {
    "prefix": 24
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/cidr/split</summary>

Split CIDR blocks into smaller subnets.

**Request (by target prefix):**
```json
{
  "cidr": "192.168.0.0/22",
  "targetPrefix": 24
}
```

**Request (by count):**
```json
{
  "cidr": "10.0.0.0/24",
  "count": 4
}
```

**Response:**
```json
{
  "success": true,
  "tool": "split",
  "result": {
    "subnets": [
      "192.168.0.0/24",
      "192.168.1.0/24",
      "192.168.2.0/24",
      "192.168.3.0/24"
    ],
    "totalSubnets": 4,
    "originalCidr": "192.168.0.0/22"
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/cidr/deaggregate</summary>

Break down CIDR blocks and ranges into uniform subnets.

**Request:**
```json
{
  "input": "192.168.0.0/22\n10.0.0.0-10.0.0.255\n172.16.1.1",
  "targetPrefix": 24
}
```

**Response:**
```json
{
  "success": true,
  "tool": "deaggregate",
  "result": {
    "subnets": [
      "192.168.0.0/24",
      "192.168.1.0/24",
      "192.168.2.0/24",
      "192.168.3.0/24",
      "10.0.0.0/24",
      "172.16.1.1/32"
    ],
    "totalSubnets": 6,
    "originalBlocks": 3,
    "targetPrefix": 24
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/cidr/compare</summary>

Compare two lists of CIDR blocks.

**Request:**
```json
{
  "listA": "192.168.1.0/24\n10.0.0.0/24\n172.16.0.0/24",
  "listB": "192.168.1.0/24\n10.0.1.0/24\n203.0.113.0/24"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "compare",
  "result": {
    "added": ["10.0.1.0/24", "203.0.113.0/24"],
    "removed": ["10.0.0.0/24", "172.16.0.0/24"],
    "unchanged": ["192.168.1.0/24"],
    "summary": {
      "totalAdded": 2,
      "totalRemoved": 2,
      "totalUnchanged": 1
    }
  }
}
```

</details>

### IP Address Tools

Validation and normalization of IP addresses.

<details>
<summary><kbd>POST</kbd> /api/ip-address-convertor/validator</summary>

Validate IP addresses and determine their type.

**Request:**
```json
{
  "ip": "192.168.1.1"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "validator",
  "result": {
    "valid": true,
    "ipv4": true,
    "ipv6": false
  }
}
```

</details>

<details>
<summary><kbd>POST</kbd> /api/ip-address-convertor/normalize</summary>

Normalize IPv6 addresses to RFC 5952 canonical format.

**Request:**
```json
{
  "ip": "2001:0db8:0000:0000:0000:0000:0000:0001"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "normalize",
  "result": {
    "normalized": "2001:db8::1",
    "isValid": true
  }
}
```

</details>

### DNS Tools

Generate PTR records and calculate reverse DNS zones.

<details>
<summary><kbd>POST</kbd> /api/dns/ptr-generator</summary>

Generate PTR records for IP addresses or CIDR blocks.

**Single IP request:**
```json
{
  "ip": "192.168.1.1"
}
```

**CIDR block request:**
```json
{
  "cidr": "192.168.1.0/29",
  "template": "server-{octets}.example.com"
}
```

**Single IP response:**
```json
{
  "success": true,
  "tool": "ptr-generator",
  "result": {
    "ptr": "1.1.168.192.in-addr.arpa",
    "ip": "192.168.1.1"
  }
}
```

**CIDR block response:**
```json
{
  "success": true,
  "tool": "ptr-generator",
  "result": {
    "records": [
      "0.1.168.192.in-addr.arpa IN PTR server-192-168-1-0.example.com.",
      "1.1.168.192.in-addr.arpa IN PTR server-192-168-1-1.example.com."
    ],
    "template": "server-{octets}.example.com",
    "totalRecords": 8
  }
}
```

> [!NOTE]
> IPv6 CIDR blocks are only supported for /120 to /128 prefixes due to performance constraints.

</details>

<details>
<summary><kbd>POST</kbd> /api/dns/reverse-zones</summary>

Calculate required reverse DNS zones for CIDR blocks.

**Request:**
```json
{
  "cidr": "192.168.1.0/24"
}
```

**Response:**
```json
{
  "success": true,
  "tool": "reverse-zones",
  "result": {
    "zones": ["1.168.192.in-addr.arpa"],
    "cidr": "192.168.1.0/24",
    "ipVersion": 4,
    "totalZones": 1
  }
}
```

</details>

## Examples

### Calculate subnet for a /27 network

```bash
curl -X POST https://networkingtoolbox.net/api/subnetting/ipv4-subnet-calculator \
  -H "Content-Type: application/json" \
  -d '{"cidr": "10.0.0.0/27"}'
```

### Split a /22 into /24 subnets

```bash
curl -X POST https://networkingtoolbox.net/api/cidr/split \
  -H "Content-Type: application/json" \
  -d '{"cidr": "172.16.0.0/22", "targetPrefix": 24}'
```

### Generate PTR records for a subnet

```bash
curl -X POST https://networkingtoolbox.net/api/dns/ptr-generator \
  -H "Content-Type: application/json" \
  -d '{"cidr": "203.0.113.0/29", "template": "host-{index}.example.org"}'
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success (even for validation failures)
- `400` - Bad request (invalid parameters)
- `404` - Endpoint not found
- `500` - Internal server error

Most validation errors return `200` with `success: false` in the response body rather than HTTP error codes. This design choice makes client integration simpler[^1].

## OpenAPI Specification

The complete API specification is available as an [OpenAPI 3.1 document](../../swagger.yaml).

---

[^1]: This follows the "be liberal in what you accept" principle while maintaining consistent response formats.
