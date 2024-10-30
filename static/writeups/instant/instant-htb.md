This is a writeup for recently expired instant box in Hackthebox platform.

### Part 1: Enumeration

As always lets start with good old nmap scan:

```
nmap -T4 -sC -sV -p- -oN instant.txt 10.10.11.37
```

![NMAP](/static/writeups/instant/1.png)

SSH and http with port 22 and 80 respectively are open.
lets see what website is hosted in port 80

![NMAP](/static/writeups/instant/2.png)

I have to add instant.htb to machine ip in /etc/hosts

![NMAP](/static/writeups/instant/3.png)

I can see site called instant.htb, After enumerating directories and subdomain, nothing interesting was found, lets look at site functionality, it seems we can download file called instant.apk. lets download it and open it with jadx and look for information in decompiled code.

I found two unique subdomain in 'network_security_config.xml', lets keep a note of it for now:

![NMAP](/static/writeups/instant/4.png)

lets add them in /etc/hosts and search code throughly for more information.
Admin JWT token can be found in instantlabs.instant:

![NMAP](/static/writeups/instant/5.png)

## Part 2: Gaining Foothold

lets take a look at discovered subdomain, i don't find any interesting thing in 'http://mywalletv1.instant.htb', lets look in 'http://swagger-ui.instant.htb:'

![NMAP](/static/writeups/instant/6.png)

I can see documentation of api used in instant.htb, lets test read log functionality using '/read/logs' api endpoint using burpsuite:

![NMAP](/static/writeups/instant/7.png)

I had found jwt token of admin earlier. API can be used using 'admin' user so, I added header 'Authorization:FOUND_JWT_TOKEN' and test out '/read/logs' api endpoint:

![NMAP](/static/writeups/instant/8.png)

now I can use these functionality, testing 'view/logs' functionality creates file called 1.log in `/home/shirohige/logs/1.log`

lets read it using '/read/log'

![NMAP](/static/writeups/instant/9.png)

file contains can be read as shown in picture above, lets test if I can perform directory traversal in this endpoint:

![NMAP](/static/writeups/instant/10.png)

and BOOM, I am able to read contains of other files, lets keep the username from '/etc/passwd' and when testing '/view/logs' I was in user directory of user:shirohige.

Now, from nmap scan i knew SSH is open in this machine, lets read 'id_rsa' contains of the file which is usually located in '/home/user/.ssh/':

![NMAP](/static/writeups/instant/11.png)

lets store it in a file and ssh into the machine using:

```
ssh -p 22 shirohige@10.10.11.37 -i id_rsa
```

![NMAP](/static/writeups/instant/12.png)

user flag is found in user.txt located in home directory.

## Part 3: Privilege Escalation

Even though I ssh into machine and got user flag, I am still low level user and not able to read root flag in '/root' directory so, lets look for a way to escalate privilege or get root user credentials.

As we can execute file in home directory, lets use linpeas to discover ways to escalate our privilege, from scan i can see file called sessions-backup.dat which seems interesting.

![NMAP](/static/writeups/instant/13.png)

It is encrypted, To decrypt it you can bruteforce it using python with pycryptodome library and wordlist or use this github repo:
[https://github.com/ItsWatchMakerr/SolarPuttyCracker](https://github.com/ItsWatchMakerr/SolarPuttyCracker)

![NMAP](/static/writeups/instant/14.png)

root user password is in decrypted file, now lets ssh to machine using this:

```
ssh root@10.10.11.37
```

I am not able to ssh with root then lets ssh with shirohige and switch user to root using above password.

![NMAP](/static/writeups/instant/15.png)

finally, I captured the root flag.
