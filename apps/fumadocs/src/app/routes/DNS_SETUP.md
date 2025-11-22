# DNS Setup Guide for .favy Domains

This guide explains how to configure your local machine to resolve `.favy` domains (like `favy`, `web.favy`, `server.favy`, and `restate.favy`) to `127.0.0.1` for use with the Caddy reverse proxy.

## Table of Contents

- [Quick Start](#quick-start)
- [macOS Setup](#macos-setup)
- [Linux Setup](#linux-setup)
- [Windows Setup](#windows-setup)
- [Fallback Method (All Platforms)](#fallback-method-all-platforms)
- [Testing Your Configuration](#testing-your-configuration)
- [Troubleshooting](#troubleshooting)

## Quick Start

Choose the method that works best for your operating system:

- **macOS/Linux**: Use dnsmasq for wildcard domain support (recommended)
- **All Platforms**: Use `/etc/hosts` file for simple setup (fallback)
- **Windows**: Use hosts file (only option)

## macOS Setup

### Option 1: Using dnsmasq (Recommended)

dnsmasq provides wildcard DNS resolution, so all `*.favy` domains automatically resolve to localhost.

#### Step 1: Install dnsmasq

Using Homebrew:

```bash
brew install dnsmasq
```

#### Step 2: Configure dnsmasq

Create or edit the dnsmasq configuration file:

```bash
# Create config directory if it doesn't exist
sudo mkdir -p /usr/local/etc

# Edit the configuration file
sudo nano /usr/local/etc/dnsmasq.conf
```

Add the following line to route all `.favy` domains to localhost:

```conf
# Route all .favy domains to localhost
address=/.favy/127.0.0.1
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

#### Step 3: Start dnsmasq

```bash
# Start dnsmasq service
sudo brew services start dnsmasq
```

#### Step 4: Configure macOS to use dnsmasq

Create a resolver configuration for `.favy` domains:

```bash
# Create resolver directory
sudo mkdir -p /etc/resolver

# Create resolver configuration for .favy domains
sudo tee /etc/resolver/favy > /dev/null <<EOF
nameserver 127.0.0.1
EOF
```

#### Step 5: Verify dnsmasq is running

```bash
# Check if dnsmasq is running
sudo brew services list | grep dnsmasq

# Test DNS resolution
ping -c 1 favy
ping -c 1 web.favy
```

### Option 2: Using /etc/hosts (Fallback)

See [Fallback Method](#fallback-method-all-platforms) section below.

## Linux Setup

### Option 1: Using dnsmasq (Recommended)

#### Step 1: Install dnsmasq

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install dnsmasq
```

**Fedora/RHEL/CentOS:**

```bash
sudo dnf install dnsmasq
# or
sudo yum install dnsmasq
```

**Arch Linux:**

```bash
sudo pacman -S dnsmasq
```

#### Step 2: Configure dnsmasq

Edit the dnsmasq configuration file:

```bash
sudo nano /etc/dnsmasq.conf
```

Add the following line:

```conf
# Route all .favy domains to localhost
address=/.favy/127.0.0.1
```

Save and exit (Ctrl+X, then Y, then Enter).

#### Step 3: Configure NetworkManager (if using)

If you're using NetworkManager, you need to tell it to use dnsmasq:

```bash
# Edit NetworkManager configuration
sudo nano /etc/NetworkManager/NetworkManager.conf
```

Add or modify the `[main]` section:

```ini
[main]
dns=dnsmasq
```

Save and exit.

#### Step 4: Start and enable dnsmasq

```bash
# Start dnsmasq service
sudo systemctl start dnsmasq

# Enable dnsmasq to start on boot
sudo systemctl enable dnsmasq

# Restart NetworkManager (if using)
sudo systemctl restart NetworkManager
```

#### Step 5: Verify dnsmasq is running

```bash
# Check if dnsmasq is running
sudo systemctl status dnsmasq

# Test DNS resolution
ping -c 1 favy
ping -c 1 web.favy
```

### Option 2: Using /etc/hosts (Fallback)

See [Fallback Method](#fallback-method-all-platforms) section below.

## Windows Setup

Windows does not have a built-in equivalent to dnsmasq, so you'll need to use the hosts file method.

### Using the hosts file

#### Step 1: Open Notepad as Administrator

1. Press the Windows key
2. Type "Notepad"
3. Right-click on "Notepad" and select "Run as administrator"

#### Step 2: Open the hosts file

In Notepad, go to File → Open and navigate to:

```
C:\Windows\System32\drivers\etc\hosts
```

**Note**: You may need to change the file type filter from "Text Documents (_.txt)" to "All Files (_.\*)" to see the hosts file.

#### Step 3: Add .favy domain entries

Add the following lines at the end of the file:

```
# Caddy Proxy Development Domains
127.0.0.1 favy
127.0.0.1 web.favy
127.0.0.1 server.favy
127.0.0.1 restate.favy
```

#### Step 4: Save the file

Save the file (File → Save or Ctrl+S).

#### Step 5: Flush DNS cache

Open Command Prompt as Administrator and run:

```cmd
ipconfig /flushdns
```

#### Step 6: Verify configuration

In Command Prompt:

```cmd
ping favy
ping web.favy
```

You should see responses from `127.0.0.1`.

## Fallback Method (All Platforms)

If you prefer not to install dnsmasq or encounter issues, you can use the hosts file method on any platform.

### macOS and Linux

#### Step 1: Edit the hosts file

```bash
sudo nano /etc/hosts
```

Or use your preferred text editor with sudo.

#### Step 2: Add .favy domain entries

Add the following lines at the end of the file:

```
# Caddy Proxy Development Domains
127.0.0.1 favy
127.0.0.1 web.favy
127.0.0.1 server.favy
127.0.0.1 restate.favy
```

#### Step 3: Save and exit

Save the file (Ctrl+X, then Y, then Enter in nano).

#### Step 4: Flush DNS cache

**macOS:**

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**

```bash
# Most Linux systems don't cache DNS, but if using systemd-resolved:
sudo systemd-resolve --flush-caches
```

### Windows

See the [Windows Setup](#windows-setup) section above.

## Testing Your Configuration

After configuring DNS, verify that everything is working correctly.

### Test 1: Ping Test

Test if domains resolve to localhost:

```bash
# Should respond from 127.0.0.1
ping -c 1 favy
ping -c 1 web.favy
ping -c 1 server.favy
ping -c 1 restate.favy
```

**Expected output:**

```
PING favy (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms
```

### Test 2: nslookup Test

Verify DNS resolution:

```bash
nslookup favy
nslookup web.favy
```

**Expected output:**

```
Server:		127.0.0.1
Address:	127.0.0.1#53

Name:	favy
Address: 127.0.0.1
```

### Test 3: dig Test (macOS/Linux)

For more detailed DNS information:

```bash
dig favy
dig web.favy
```

**Expected output should include:**

```
;; ANSWER SECTION:
favy.			0	IN	A	127.0.0.1
```

### Test 4: HTTP Test

Once Caddy is running, test HTTP access:

```bash
# Test if Caddy responds (should get a response even if backend is down)
curl -I http://favy
curl -I http://server.favy
```

**Expected output:**

```
HTTP/1.1 503 Service Unavailable
```

(503 is expected if the backend services aren't running yet)

### Test 5: Browser Test

Open your browser and navigate to:

- `http://favy`
- `http://web.favy`
- `http://server.favy`
- `http://restate.favy`

You should see either:

- The application (if services are running)
- A Caddy error page with helpful instructions (if services are not running)

## Troubleshooting

### Issue: Domains don't resolve

**Symptoms:**

- `ping favy` returns "cannot resolve favy: Unknown host"
- Browser shows "Server not found"

**Solutions:**

1. **Verify hosts file entries:**

   ```bash
   # macOS/Linux
   cat /etc/hosts | grep favy

   # Windows (in Command Prompt)
   type C:\Windows\System32\drivers\etc\hosts | findstr favy
   ```

2. **Check file permissions:**

   ```bash
   # macOS/Linux - hosts file should be readable
   ls -l /etc/hosts
   ```

3. **Flush DNS cache** (see platform-specific instructions above)

4. **Restart dnsmasq** (if using):

   ```bash
   # macOS
   sudo brew services restart dnsmasq

   # Linux
   sudo systemctl restart dnsmasq
   ```

### Issue: dnsmasq not starting

**Symptoms:**

- `sudo brew services list` shows dnsmasq as "error"
- `systemctl status dnsmasq` shows "failed"

**Solutions:**

1. **Check for port conflicts:**

   ```bash
   # Check if port 53 is already in use
   sudo lsof -i :53
   ```

2. **Check dnsmasq configuration:**

   ```bash
   # macOS
   dnsmasq --test

   # Linux
   sudo dnsmasq --test
   ```

3. **View dnsmasq logs:**

   ```bash
   # macOS
   tail -f /usr/local/var/log/dnsmasq.log

   # Linux
   sudo journalctl -u dnsmasq -f
   ```

4. **Disable conflicting services:**

   On macOS, if you have other DNS services running:

   ```bash
   sudo launchctl unload /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist
   sudo launchctl load /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist
   ```

### Issue: Some domains work, others don't

**Symptoms:**

- `favy` resolves but `web.favy` doesn't
- Inconsistent behavior

**Solutions:**

1. **If using hosts file:** Ensure all domains are listed

   ```bash
   # Should see all four domains
   cat /etc/hosts | grep favy
   ```

2. **If using dnsmasq:** Verify wildcard configuration

   ```bash
   # macOS
   cat /usr/local/etc/dnsmasq.conf | grep favy

   # Linux
   cat /etc/dnsmasq.conf | grep favy
   ```

3. **Clear browser DNS cache:**
   - Chrome: Visit `chrome://net-internals/#dns` and click "Clear host cache"
   - Firefox: Restart the browser
   - Safari: Clear history and website data

### Issue: Works in terminal but not in browser

**Symptoms:**

- `ping favy` works
- Browser shows "Server not found"

**Solutions:**

1. **Clear browser cache** (see above)

2. **Disable browser DNS-over-HTTPS:**

   - Chrome: Settings → Privacy and security → Security → Use secure DNS (disable)
   - Firefox: Settings → Privacy & Security → DNS over HTTPS (disable)

3. **Try incognito/private mode** to rule out extensions

4. **Check browser proxy settings:**
   - Ensure no proxy is configured that might interfere

### Issue: Permission denied when editing hosts file

**Symptoms:**

- "Permission denied" error when saving hosts file

**Solutions:**

1. **Use sudo** (macOS/Linux):

   ```bash
   sudo nano /etc/hosts
   ```

2. **Run as Administrator** (Windows):
   - Right-click Notepad → "Run as administrator"

### Issue: Changes don't take effect

**Symptoms:**

- Made changes but domains still don't resolve

**Solutions:**

1. **Flush DNS cache** (see platform-specific instructions above)

2. **Restart network services:**

   ```bash
   # macOS
   sudo ifconfig en0 down
   sudo ifconfig en0 up

   # Linux
   sudo systemctl restart NetworkManager
   ```

3. **Reboot your computer** (last resort)

### Issue: Caddy returns 502 Bad Gateway

**Symptoms:**

- Domains resolve correctly
- Caddy is running
- Getting 502 errors

**Solutions:**

1. **Check if backend services are running:**

   ```bash
   # Check if web app is running on port 3001
   curl http://localhost:3001

   # Check if API server is running on port 3000
   curl http://localhost:3000
   ```

2. **Start the backend services:**

   ```bash
   # Start web app
   cd apps/web && bun run dev

   # Start API server
   cd apps/server && bun run dev
   ```

3. **Verify Caddy configuration:**
   ```bash
   cd deployment/dev
   docker-compose exec caddy caddy validate --config /etc/caddy/Caddyfile
   ```

### Issue: IPv6 interference

**Symptoms:**

- Inconsistent behavior
- Sometimes works, sometimes doesn't

**Solutions:**

1. **Add IPv6 entries to hosts file:**

   ```
   ::1 favy
   ::1 web.favy
   ::1 server.favy
   ::1 restate.favy
   ```

2. **Or disable IPv6 temporarily:**

   ```bash
   # macOS
   networksetup -setv6off Wi-Fi

   # Linux
   sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
   ```

## Additional Resources

- [dnsmasq documentation](http://www.thekelleys.org.uk/dnsmasq/doc.html)
- [Caddy documentation](https://caddyserver.com/docs/)
- [macOS resolver man page](https://www.manpagez.com/man/5/resolver/)

## Need More Help?

If you're still experiencing issues:

1. Check the Caddy logs:

   ```bash
   cd deployment/dev
   docker-compose logs caddy
   ```

2. Check the development environment status:

   ```bash
   cd deployment/dev
   ./status.sh
   ```

3. Consult the main development README:
   ```bash
   cat deployment/dev/README.md
   ```
