## Remote Enumeration

For OS => nmap -O --osscan-guess <IP Address>

### Network FIle Sharing

One of these commonly found services is the Network File System (NFS);this is an RPC-based file sharing protocol often found configured on Unix-like systems, is typically used to provide access to shared resources, and can be found listening on TCP and/or UDP port 2049. Nmap can easily identify a system running NFS:

```
nmap -sT -sU -sV -p2049 <IP Address>
```

An administrator wishing to share files from an NFS server will configure what are known as “exports.”Exports are the mechanism used by NFS in order to “export”directories, in other words, make entire directories available to other users over the network.
Exports configured for any given NFS server can usually be foundin the “/etc/exports” file on a target host locally.

```
ls /usr/share/nmap/scripts/ | grep nfs

nmap --script nfs-ls,nfs-showmount,nfs-statfs <IP Address>

alternatively, shows less output

showmount -e 192.168.13.26

after finding file system we can mount it using:
mount -t nfs <NFS Server IP>:/home/rob /mnt/home/rob -o nolock

```

### Portmapper

Portmapper (AKA rpcbind) is another common service found on Linux-based systems and is used to essentially “map” RPC (Open Network Computing Remote Procedure Call or “ONC
RPC,” not to be confused with Microsoft’s implementation of RPC) services to their corresponding TCP or UDP ports on a target system.

Portmapper is typically found listening on ports TCP/UDP 111 and in some cases, ports TCP/UDP 32771.

```
Enumerated using Nmap NSE scripts, or by using the built-in “rpcinfo” command.

nmap --script rpc-grind,rpcinfo 192.168.13.26 –p 111

rpcinfo -p 192.168.13.26

```

### Samba

Samba, a Linux-based implementation of the SMB/CIFS protocols, provides print and file sharing services for windows clients within an environment. Recent versions also seamlessly can be integrated with Active Directory domains.

Samba can offer us a great bit of information when enumerated properly. Depending on the configuration, we can obtain OS version, user accounts on the system, file shares, their permissions and potentially sensitive data, and, depending on its integration with Active Directory, can be used to enumerate much more information.

Samba can be found listening on the usual “NetBIOS” ports.

![NMAP](/static/Security-Blogs/img/1.png)

Samba can be trivially identified with a version scan (-sV) against NetBIOS ports.

```
nmap -sT –sU -sV 192.168.13.26 -p135,137,138,139,445 --open

nmap --script smb-enum-shares 192.168.13.26

smbclient -L 192.168.13.26  --> for viewing shares

smbmap -H 192.168.13.26    --> for viewing permissions

smbclient \\\\192.168.13.26\\www  --> going in shares

```

We can mount those shares as well just like nfs:

```
mkdir -p /mnt/www
mount -t cifs \\\\192.168.13.26\\www /mnt/www

```

Now that we’ve enumerated shares, a next step is to enumerateusers over the SMBprotocol.
Enumerating users when it comes to Samba or over SMB can be accomplished in several ways. The first way we’ll go over is a manual method using “rpcclient,” and we’ll also briefly cover a great tool that can automate the information gathering process for Samba or any other SMB-based service, whether it’s on Linux or Windows.

Enumerating users:

```
rpcclient -U "" 192.168.13.26 -N --command="lookupnames username"

enum4linux ip
```

### SMTP

This next section covers user enumeration through SMTP servers using enabled “verbs” or options that are enabled on a mail server. You’re probably familiar with the “HELO,” “RCPT” or “MAIL” verbs if you’ve ever sent an email while directly connected to an email server via telnet or some other way; (telnet mail.server.site 25) for instance.

The following information does apply for both Windows and Linux-based mail servers since “SMTP” is the underlying protocol, but since a large majority of mail servers in-use are
Linux-based, we’ll be focusing on enumerating users from “Sendmail,” a popular Open-Source \*NIX-based mail server. In the wild, you will mostly encounter Sendmail, Postfix, Exim
or Microsoft Exchange. The following techniques can apply to all.

The first task is to enumerate which options, “verbs” or “features” are enabled on an SMTP server, usually found on TCP/25; this can be accomplished with the “smtp-commands” Nmap NSE script:

```
nmap --script smtp-commands 192.168.13.26 -p 25

nc 192.168.13.26 25
```

From the above output, we can see which features or “verbs”are enabled on the mail server.
For our purposes, we’re interested in the RCPT, VRFY and EXPN verbs. (All of which can be used to enumerate users on the server.)

```
First, we connect:
telnet 192.168.13.26 25
Secondly, we issue the “HELO” verb with “tester.localdomain” for a domain name:
We then tell the server who the mail will be from with the “MAIL FROM:” Verb:
```

Once we’ve:

1. Identified ourselves (HELO tester.localdomain)
2. Set the MAIL FROM (MAIL FROM: tester@tester.localdomain)
   We can then proceed with sequentially enumerating potential users
   from the system with the “RCPT TO: <user@domain.com>” command:

Valid users will return a Status Code of “250 2.1.5” while a “550 5.1.1”
Status Code and “User unknown” message denotes a non-existent user.

```
smtp-user-enum -M vrfy -U users.txt -t ipaddr

```

Now, remote enumeration is finished less move to local enumeration.

## Local Enumeration

This section is a precursor to the “Post-Exploitation” module of this course in the sense that we’ve gotten some type of access to a machine:
• either as a low-privileged or high-privileged user,
• via a shell,
• through a web application or some other means,
...with the ultimate goal of obtaining higher-level access to our current machine, and furthermore, access to other machines within an environment as a result of information obtained from our exploited host.

The type of information we gather during this phase falls into two higher-level categories:
• Network Information
• System Information

Both involve different sets of tools and methods, but the good news is, for the most part, once we have access to a Linux host, most of those tools are already provided for us.
The methodology that follows will be useful in the post-exploitation section that we’ll cover in later modules.

### Network Information

Network Information, we can ask ourselves some important questions:

- How is the exploited machine connected to the network?
- Is the machine multi-homed? Can we pivot to other hosts in other segments?
- Do we have unfettered outbound connectivity to the internet or is egress traffic limited to certain ports or protocols?
- Is there a firewall between me and other devices/machines?
- Is the machine I’m on, communicating with other hosts? If so, what is the purpose or function of the hosts that my current machine is communicating with?
- What protocols are being used that are originating from my actively exploited machine? Are we initiating FTP connections or other connections (SSH, etc.) to other machines?
- Are other machines initiating a connection with me? If so, can that traffic be intercepted or sniffed as cleartext in transit? Is it encrypted?

All of those questions can be answered with some standard utilities we can find on our compromised Linux host, in addition to some simple bash scripting.

```
cat /etc/resolv.conf --> DNS Server

ifconfig -a --> List current Network Interface Configuration

route --> Current network route information

traceroute -n <ip>  --> Trace our route across network segments

arp -a --> List out ARP cache

netstat -auntp --> Established and Listening TCP/UDP Ports/Connections

ss -twurp  --> Listing active connections, processes, users and bytes

nmap -sT -p5555 portquiz.net   --> check outbound traffic

```

### System Information

To elevate our privileges once we’ve obtained access to a system or systems, and obtain additional footholds within an environment as a result of the information we obtain.

```
id      --> Current User Information

uname -a   --> Kernel Version

grep $USER /etc/passwd   -->  Current user information from /etc/passwd

lastlog   -->  Most Recent Logins

w   -->  Who is currently logged onto the System

last   -->  Last logged on users

for user in $(cat /etc/passwd | cut -f1 -d":"); do id $user; done -->All including UID & GID Info

cat /etc/passwd |cut -f1,3,4 -d":" |grep "0:0" |cut -f1 -d":"|awk '{print $1}'   --> all UID 0 acunt

cat /etc/passwd -->  Read passwd file

cat /etc/shadow --> check readability of shadow file

sudo -l --> what can we sudo without a password

cat /etc/sudoers --> Can we read it

find /home/* -name *.*history* -print 2> /dev/null --> Can we read other user bash_history file

cat /etc/issue && cat /etc/*-release  -->  Operating System

cat /etc/crontab && ls -als /etc/cron*  --> list cron jobs

find /etc/cron* -type f -perm -o+w -exec ls -l {} \;  --> Find word writable cron jobs

ps auxw  --> List all running process

ps -u root --> List all process running as root

ps -u $USER  --> List all process current user is running

find / -perm -4000 -type f 2>/dev/null --> find SUID files

find / -uid 0 –perm -4000 –type f 2>/dev/null  --> find SUID file owned by root

find / -perm -2000 -type -f 2>/dev/null --> find GUID files

find -perm -2 -type f 2>/dev/null  --> find word writable files

lsof -n --> list open files

dpkg -l --> list installed packages

ps aux | awk ‘{print $11}’ |xargs -r ls -la 2>/dev/null |awk ‘!x[$0]++’  --> print process binaries path and permission
```
